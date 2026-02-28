import { Router, Response } from 'express';
import Stripe from 'stripe';
import { stripeServices, stripe } from '../services/stripe.service.js';
import {
  authenticate,
  authenticateWithProfile,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import { supabase } from '../lib/supabase.js';
import { onboardingLimiter, sensitiveLimiter } from '../middleware/rateLimit.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';

const router = Router();

/**
 * Provider Onboarding Flow
 *
 * 1. POST /connect/onboard - Start onboarding (creates Stripe account, returns onboarding URL)
 * 2. GET /connect/status - Check onboarding status
 * 3. POST /connect/refresh - Get new onboarding link if expired
 * 4. GET /connect/dashboard - Get provider dashboard link
 * 5. GET /connect/balance - Get provider balance
 * 6. GET /connect/payouts - Get provider payout history
 */

// ============================================================
// STANDALONE CONNECT ACCOUNT ENDPOINTS
// ============================================================

/**
 * Create a Stripe Connect Express account for a provider
 * POST /connect/account
 */
router.post(
  '/account',
  onboardingLimiter,
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const userProfile = req.userProfile!;

    // Get provider record
    const { data: provider } = await supabase
      .from('providers')
      .select('id, stripe_account_id, business_name')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    // Check if already has a Stripe account
    if (provider.stripe_account_id) {
      // Return existing account info
      const account = await stripeServices.connect.getAccount(provider.stripe_account_id);
      res.json({
        success: true,
        data: {
          accountId: provider.stripe_account_id,
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          alreadyExists: true,
        },
      });
      return;
    }

    // Create new Stripe Express account
    const account = await stripeServices.connect.createExpressAccount({
      email: req.user!.email || '',
      providerId: provider.id,
      businessName: provider.business_name || userProfile.full_name || 'Healthcare Provider',
      country: 'US',
    });

    // Store Stripe account ID in provider record
    await supabase
      .from('providers')
      .update({ stripe_account_id: account.id })
      .eq('id', provider.id);

    res.status(201).json({
      success: true,
      data: {
        accountId: account.id,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        alreadyExists: false,
      },
    });
  })
);

/**
 * Generate an account link for Stripe Connect onboarding
 * POST /connect/account-link
 */
router.post(
  '/account-link',
  onboardingLimiter,
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const { data: provider } = await supabase
      .from('providers')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single();

    if (!provider?.stripe_account_id) {
      throw AppError.badRequest(
        'No Stripe account found. Create one first via POST /connect/account.'
      );
    }

    const accountLink = await stripeServices.connect.createAccountLink(
      provider.stripe_account_id,
      `${process.env.FRONTEND_URL}/provider/onboarding/refresh`,
      `${process.env.FRONTEND_URL}/provider/onboarding/complete`
    );

    res.json({
      success: true,
      data: {
        accountId: provider.stripe_account_id,
        url: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
      },
    });
  })
);

// ============================================================
// COMBINED ONBOARDING FLOW
// ============================================================

// Start provider onboarding
router.post(
  '/onboard',
  onboardingLimiter,
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const userProfile = req.userProfile!;

    // Check if provider already has a Stripe account
    const { data: provider } = await supabase
      .from('providers')
      .select('id, stripe_account_id, stripe_onboarding_complete, business_name')
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    let stripeAccountId = provider.stripe_account_id;

    // Create Stripe account if doesn't exist
    if (!stripeAccountId) {
      const account = await stripeServices.connect.createExpressAccount({
        email: req.user!.email || '',
        providerId: provider.id,
        businessName: provider.business_name || userProfile.full_name || 'Healthcare Provider',
        country: 'US',
      });

      stripeAccountId = account.id;

      // Store Stripe account ID
      await supabase
        .from('providers')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', provider.id);
    }

    // Create onboarding link
    const accountLink = await stripeServices.connect.createAccountLink(
      stripeAccountId,
      `${process.env.FRONTEND_URL}/provider/onboarding/refresh`,
      `${process.env.FRONTEND_URL}/provider/onboarding/complete`
    );

    res.json({
      success: true,
      data: {
        accountId: stripeAccountId,
        onboardingUrl: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
      },
    });
  })
);

// Check onboarding status
router.get(
  '/status',
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const { data: provider } = await supabase
      .from('providers')
      .select(
        'id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled'
      )
      .eq('user_id', userId)
      .single();

    if (!provider) {
      throw AppError.notFound('Provider profile not found');
    }

    if (!provider.stripe_account_id) {
      res.json({
        success: true,
        data: {
          status: 'not_started',
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        },
      });
      return;
    }

    // Get latest status from Stripe
    const account = await stripeServices.connect.getAccount(provider.stripe_account_id);

    // Update local status
    const statusChanged =
      provider.stripe_onboarding_complete !== account.details_submitted ||
      provider.stripe_charges_enabled !== account.charges_enabled ||
      provider.stripe_payouts_enabled !== account.payouts_enabled;

    if (statusChanged) {
      await supabase
        .from('providers')
        .update({
          stripe_onboarding_complete: account.details_submitted,
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
        })
        .eq('id', provider.id);
    }

    res.json({
      success: true,
      data: {
        status: account.details_submitted ? 'complete' : 'pending',
        onboardingComplete: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements,
      },
    });
  })
);

// Get new onboarding link (if expired or returning user)
router.post(
  '/refresh',
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const { data: provider } = await supabase
      .from('providers')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single();

    if (!provider?.stripe_account_id) {
      throw AppError.badRequest('No Stripe account found. Start onboarding first.');
    }

    const accountLink = await stripeServices.connect.createAccountLink(
      provider.stripe_account_id,
      `${process.env.FRONTEND_URL}/provider/onboarding/refresh`,
      `${process.env.FRONTEND_URL}/provider/onboarding/complete`
    );

    res.json({
      success: true,
      data: {
        onboardingUrl: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
      },
    });
  })
);

// Get provider dashboard link
router.get(
  '/dashboard',
  authenticateWithProfile,
  sensitiveLimiter,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const { data: provider } = await supabase
      .from('providers')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('user_id', userId)
      .single();

    if (!provider?.stripe_account_id) {
      throw AppError.badRequest('No Stripe account found');
    }

    if (!provider.stripe_onboarding_complete) {
      throw AppError.badRequest('Complete onboarding first');
    }

    const loginLink = await stripeServices.connect.createLoginLink(provider.stripe_account_id);

    res.json({ success: true, data: { dashboardUrl: loginLink.url } });
  })
);

// Get provider balance
router.get(
  '/balance',
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const { data: provider } = await supabase
      .from('providers')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single();

    if (!provider?.stripe_account_id) {
      throw AppError.badRequest('No Stripe account found');
    }

    const balance = await stripeServices.connect.getBalance(provider.stripe_account_id);

    res.json({
      success: true,
      data: {
        available: balance.available.map((b) => ({
          amount: b.amount / 100,
          currency: b.currency,
        })),
        pending: balance.pending.map((b) => ({
          amount: b.amount / 100,
          currency: b.currency,
        })),
      },
    });
  })
);

// Get provider payouts
router.get(
  '/payouts',
  authenticateWithProfile,
  requireRole('provider', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const { data: provider } = await supabase
      .from('providers')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single();

    if (!provider?.stripe_account_id) {
      throw AppError.badRequest('No Stripe account found');
    }

    const payouts = await stripe.payouts.list(
      { limit: 20 },
      { stripeAccount: provider.stripe_account_id }
    );

    res.json({
      success: true,
      data: payouts.data.map((p) => ({
        id: p.id,
        amount: p.amount / 100,
        currency: p.currency,
        status: p.status,
        arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
        created: new Date(p.created * 1000).toISOString(),
      })),
    });
  })
);

// Handle Connect webhook events (called from main webhook handler)
export async function handleConnectWebhook(event: Stripe.Event): Promise<void> {
  const account = event.data.object as Stripe.Account;

  switch (event.type) {
    case 'account.updated': {
      // Update provider status when their Stripe account changes
      const { data: provider } = await supabase
        .from('providers')
        .select('id')
        .eq('stripe_account_id', account.id)
        .single();

      if (provider) {
        await supabase
          .from('providers')
          .update({
            stripe_onboarding_complete: account.details_submitted,
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
          })
          .eq('id', provider.id);
      }
      break;
    }
  }
}

export default router;
