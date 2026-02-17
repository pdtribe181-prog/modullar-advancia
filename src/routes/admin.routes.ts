import { Router, Response } from 'express';
import { authenticate, authenticateWithProfile, requireAdmin, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { sensitiveLimiter } from '../middleware/rateLimit.middleware.js';
import { supabase } from '../lib/supabase.js';
import { stripe } from '../services/stripe.service.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);
router.use(sensitiveLimiter);

/**
 * Dashboard Overview
 * GET /admin/dashboard
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      { count: totalTransactions },
      { count: totalPatients },
      { count: totalProviders },
      { count: pendingDisputes },
      { data: recentTransactions },
      { data: revenueByDay }
    ] = await Promise.all([
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('patients').select('*', { count: 'exact', head: true }),
      supabase.from('providers').select('*', { count: 'exact', head: true }),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('transactions')
        .select('id, amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.rpc('get_revenue_by_day', { days_back: 30 }).select('*')
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalTransactions: totalTransactions || 0,
          totalPatients: totalPatients || 0,
          totalProviders: totalProviders || 0,
          pendingDisputes: pendingDisputes || 0,
        },
        recentTransactions: recentTransactions || [],
        revenueByDay: revenueByDay || [],
      }
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Transaction Management
 * GET /admin/transactions
 */
router.get('/transactions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      status, 
      provider_id, 
      patient_id,
      start_date,
      end_date,
      page = '1', 
      limit = '20' 
    } = req.query;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        patient:patients(id, first_name, last_name),
        provider:providers(id, business_name)
      `, { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (provider_id) query = query.eq('provider_id', provider_id);
    if (patient_id) query = query.eq('patient_id', patient_id);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Transaction Details
 * GET /admin/transactions/:id
 */
router.get('/transactions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        patient:patients(*),
        provider:providers(*),
        invoice:invoices(*),
        dispute:disputes(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Get Stripe payment details if available
    let stripePayment = null;
    if (transaction.stripe_payment_intent_id) {
      try {
        stripePayment = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id);
      } catch (e) {
        console.error('Failed to fetch Stripe payment:', e);
      }
    }

    res.json({
      success: true,
      data: {
        ...transaction,
        stripePayment
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Dispute Management
 * GET /admin/disputes
 */
router.get('/disputes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    let query = supabase
      .from('disputes')
      .select(`
        *,
        transaction:transactions(id, amount, status),
        patient:patients(id, first_name, last_name),
        provider:providers(id, business_name)
      `, { count: 'exact' });

    if (status) query = query.eq('status', status);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update Dispute Status
 * PATCH /admin/disputes/:id
 */
router.patch('/disputes/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const { data, error } = await supabase
      .from('disputes')
      .update({
        status,
        resolution_notes,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        resolved_by: req.user!.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await supabase.from('compliance_logs').insert({
      action_type: 'dispute_resolution',
      user_id: req.user!.id,
      resource_type: 'dispute',
      resource_id: id,
      details: { status, resolution_notes }
    });

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Provider Management
 * GET /admin/providers
 */
router.get('/providers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    let query = supabase
      .from('providers')
      .select(`
        *,
        user:user_profiles(id, email, first_name, last_name)
      `, { count: 'exact' });

    if (status === 'pending') {
      query = query.eq('stripe_onboarding_complete', false);
    } else if (status === 'active') {
      query = query.eq('stripe_onboarding_complete', true);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Provider Stripe Details
 * GET /admin/providers/:id/stripe
 */
router.get('/providers/:id/stripe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: provider, error } = await supabase
      .from('providers')
      .select('stripe_account_id')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!provider?.stripe_account_id) {
      return res.status(404).json({ success: false, error: 'Provider has no Stripe account' });
    }

    const account = await stripe.accounts.retrieve(provider.stripe_account_id);
    const balance = await stripe.balance.retrieve({ stripeAccount: provider.stripe_account_id });

    res.json({
      success: true,
      data: {
        account: {
          id: account.id,
          business_type: account.business_type,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: account.requirements,
        },
        balance: {
          available: balance.available,
          pending: balance.pending,
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Webhook Events Log
 * GET /admin/webhooks
 */
router.get('/webhooks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { event_type, page = '1', limit = '50' } = req.query;

    let query = supabase
      .from('stripe_webhook_events')
      .select('*', { count: 'exact' });

    if (event_type) query = query.eq('event_type', event_type);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await query
      .order('processed_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Compliance Audit Log
 * GET /admin/audit-log
 */
router.get('/audit-log', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action_type, user_id, page = '1', limit = '50' } = req.query;

    let query = supabase
      .from('compliance_logs')
      .select(`
        *,
        user:user_profiles(id, email, first_name, last_name)
      `, { count: 'exact' });

    if (action_type) query = query.eq('action_type', action_type);
    if (user_id) query = query.eq('user_id', user_id);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Revenue Analytics
 * GET /admin/analytics/revenue
 */
router.get('/analytics/revenue', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const daysBack = parseInt(period as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, status, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    // Aggregate by day
    const dailyRevenue: Record<string, number> = {};
    let totalRevenue = 0;

    (data || []).forEach(tx => {
      const day = tx.created_at.split('T')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + (tx.amount || 0);
      totalRevenue += tx.amount || 0;
    });

    res.json({
      success: true,
      data: {
        totalRevenue,
        transactionCount: data?.length || 0,
        dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })),
        averageTransaction: data?.length ? totalRevenue / data.length : 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * System Health Check
 * GET /admin/system/health
 */
router.get('/system/health', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const checks: Record<string, any> = {};

    // Check Supabase
    const supabaseStart = Date.now();
    const { error: supabaseError } = await supabase.from('user_profiles').select('id').limit(1);
    checks.supabase = {
      status: supabaseError ? 'error' : 'healthy',
      latency: Date.now() - supabaseStart,
      error: supabaseError?.message
    };

    // Check Stripe
    const stripeStart = Date.now();
    try {
      await stripe.balance.retrieve();
      checks.stripe = {
        status: 'healthy',
        latency: Date.now() - stripeStart
      };
    } catch (stripeError: any) {
      checks.stripe = {
        status: 'error',
        latency: Date.now() - stripeStart,
        error: stripeError.message
      };
    }

    const allHealthy = Object.values(checks).every((c: any) => c.status === 'healthy');

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
