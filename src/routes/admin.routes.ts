import { Router, Response } from 'express';
import {
  authenticate,
  authenticateWithProfile,
  requireAdmin,
  AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import { sensitiveLimiter } from '../middleware/rateLimit.middleware.js';
import { supabase } from '../lib/supabase.js';
import { stripe } from '../services/stripe.service.js';
import {
  validateQuery,
  validateParams,
  validateBody,
} from '../middleware/validation.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { logger } from '../middleware/logging.middleware.js';
import { z } from 'zod';

const router = Router();

// Validation schemas for admin routes
const transactionQuerySchema = z.object({
  status: z.string().optional(),
  provider_id: z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const disputeQuerySchema = z.object({
  status: z.enum(['pending', 'under_review', 'resolved', 'rejected']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateDisputeSchema = z.object({
  status: z.enum(['pending', 'under_review', 'resolved', 'rejected']),
  resolution_notes: z.string().max(1000).optional(),
});

const providersQuerySchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const webhooksQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const auditLogQuerySchema = z.object({
  action: z.string().optional(),
  user_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const idParamsSchema = z.object({
  id: z.string().uuid('Invalid ID'),
});

const usersQuerySchema = z.object({
  status: z.enum(['pending', 'active', 'suspended', 'all']).default('all'),
  role: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateUserStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'suspended']),
  reason: z.string().max(500).optional(),
});

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);
router.use(sensitiveLimiter);

/**
 * Dashboard Overview
 * GET /admin/dashboard
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const [
      { count: totalTransactions },
      { count: totalPatients },
      { count: totalProviders },
      { count: pendingDisputes },
      { data: recentTransactions },
      { data: revenueByDay },
    ] = await Promise.all([
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('patients').select('*', { count: 'exact', head: true }),
      supabase.from('providers').select('*', { count: 'exact', head: true }),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase
        .from('transactions')
        .select('id, amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.rpc('get_revenue_by_day', { days_back: 30 }).select('*'),
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
      },
    });
  })
);

/**
 * User Management
 * GET /admin/users
 */
router.get(
  '/users',
  validateQuery(usersQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, role, search, page, limit } = req.query as unknown as z.infer<
      typeof usersQuerySchema
    >;

    let query = supabase
      .from('user_profiles')
      .select('id, email, full_name, phone, role, status, last_login, created_at, updated_at', {
        count: 'exact',
      });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (role) {
      query = query.eq('role', role);
    }
    if (search) {
      // Escape PostgREST special characters to prevent filter injection
      const safeSearch = search.replace(/[().,\\]/g, '');
      query = query.or(`email.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`);
    }

    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw AppError.internal();
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  })
);

/**
 * Get Online Users (users who logged in within last 15 minutes)
 * GET /admin/users/online
 * NOTE: Must be registered BEFORE /users/:id to avoid being shadowed by the param route
 */
router.get(
  '/users/online',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, last_login')
      .gte('last_login', fifteenMinutesAgo)
      .order('last_login', { ascending: false });

    if (error) {
      throw AppError.internal();
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  })
);

/**
 * Get Single User
 * GET /admin/users/:id
 */
router.get(
  '/users/:id',
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw AppError.notFound('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * Update User Status (Approve/Suspend)
 * PUT /admin/users/:id/status
 */
router.put(
  '/users/:id/status',
  validateParams(idParamsSchema),
  validateBody(updateUserStatusSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user?.id;

    // Update user status
    const { data: user, error } = await supabase
      .from('user_profiles')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw AppError.internal();
    }

    // Log the action
    await supabase.from('compliance_logs').insert({
      user_id: adminId,
      action: `user_status_${status}`,
      entity_type: 'user',
      entity_id: id,
      details: {
        new_status: status,
        reason: reason || null,
        target_email: user.email,
      },
    });

    logger.info('User status updated', {
      adminId,
      userId: id,
      newStatus: status,
      reason,
    });

    res.json({
      success: true,
      message: `User ${status === 'active' ? 'approved' : status}`,
      data: user,
    });
  })
);

/**
 * Transaction Management
 * GET /admin/transactions
 */
router.get(
  '/transactions',
  validateQuery(transactionQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, provider_id, patient_id, start_date, end_date, page, limit } = res.locals
      .validatedQuery as z.infer<typeof transactionQuerySchema>;

    let query = supabase.from('transactions').select(
      `
      *,
      patient:patients(id, user:user_profiles(id, full_name, email)),
      provider:providers(id, business_name, user:user_profiles(id, full_name))
    `,
      { count: 'exact' }
    );

    if (status) query = query.eq('status', status);
    if (provider_id) query = query.eq('provider_id', provider_id);
    if (patient_id) query = query.eq('patient_id', patient_id);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw AppError.internal();

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  })
);

/**
 * Get Transaction Details
 * GET /admin/transactions/:id
 */
router.get(
  '/transactions/:id',
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(
        `
      *,
      patient:patients(*),
      provider:providers(*),
      invoice:invoices(*),
      dispute:disputes(*)
    `
      )
      .eq('id', id)
      .single();

    if (error) throw AppError.internal();
    if (!transaction) {
      throw AppError.notFound('Transaction not found');
    }

    // Get Stripe payment details if available
    let stripePayment = null;
    if (transaction.stripe_payment_intent_id) {
      try {
        stripePayment = await stripe.paymentIntents.retrieve(transaction.stripe_payment_intent_id);
      } catch (e) {
        logger.warn('Failed to fetch Stripe payment', {
          paymentIntentId: transaction.stripe_payment_intent_id,
        });
      }
    }

    res.json({
      success: true,
      data: {
        ...transaction,
        stripePayment,
      },
    });
  })
);

/**
 * Dispute Management
 * GET /admin/disputes
 */
router.get(
  '/disputes',
  validateQuery(disputeQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, page, limit } = req.query as unknown as z.infer<typeof disputeQuerySchema>;

    let query = supabase.from('disputes').select(
      `
      *,
      transaction:transactions(id, amount, status),
      patient:patients(id, user:user_profiles(id, full_name, email)),
      provider:providers(id, business_name, user:user_profiles(id, full_name))
    `,
      { count: 'exact' }
    );

    if (status) query = query.eq('status', status);

    const offset = (page - 1) * limit;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw AppError.internal();

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  })
);

/**
 * Update Dispute Status
 * PATCH /admin/disputes/:id
 */
router.patch(
  '/disputes/:id',
  validateParams(idParamsSchema),
  validateBody(updateDisputeSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const { data, error } = await supabase
      .from('disputes')
      .update({
        status,
        resolution_notes,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        resolved_by: req.user!.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw AppError.internal();

    // Log the action
    await supabase.from('compliance_logs').insert({
      action_type: 'dispute_resolution',
      user_id: req.user!.id,
      resource_type: 'dispute',
      resource_id: id,
      details: { status, resolution_notes },
    });

    res.json({ success: true, data });
  })
);

/**
 * Provider Management
 * GET /admin/providers
 */
router.get(
  '/providers',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, page = '1', limit = '20' } = req.query;

    let query = supabase.from('providers').select(
      `
      *,
      user:user_profiles(id, email, full_name)
    `,
      { count: 'exact' }
    );

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

    if (error) throw AppError.internal();

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  })
);

/**
 * Provider Stripe Details
 * GET /admin/providers/:id/stripe
 */
router.get(
  '/providers/:id/stripe',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const { data: provider, error } = await supabase
      .from('providers')
      .select('stripe_account_id')
      .eq('id', id)
      .single();

    if (error) throw AppError.internal();
    if (!provider?.stripe_account_id) {
      throw AppError.notFound('Provider has no Stripe account');
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
        },
      },
    });
  })
);

/**
 * Webhook Events Log
 * GET /admin/webhooks
 */
router.get(
  '/webhooks',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { event_type, page = '1', limit = '50' } = req.query;

    let query = supabase.from('stripe_webhook_events').select('*', { count: 'exact' });

    if (event_type) query = query.eq('event_type', event_type);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await query
      .order('processed_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw AppError.internal();

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  })
);

/**
 * Compliance Audit Log
 * GET /admin/audit-log
 */
router.get(
  '/audit-log',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { action, user_id, page = '1', limit = '50' } = req.query;

    let query = supabase.from('compliance_logs').select(
      `
      *,
      user:user_profiles(id, email, full_name)
    `,
      { count: 'exact' }
    );

    if (action) query = query.eq('action', action);
    if (user_id) query = query.eq('user_id', user_id);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw AppError.internal();

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  })
);

/**
 * Revenue Analytics
 * GET /admin/analytics/revenue
 */
router.get(
  '/analytics/revenue',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { period = '30' } = req.query;
    const daysBack = parseInt(period as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, status, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed');

    if (error) throw AppError.internal();

    // Aggregate by day
    const dailyRevenue: Record<string, number> = {};
    let totalRevenue = 0;

    (data || []).forEach((tx) => {
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
        averageTransaction: data?.length ? totalRevenue / data.length : 0,
      },
    });
  })
);

/**
 * System Health Check
 * GET /admin/system/health
 */
router.get(
  '/system/health',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const checks: Record<string, any> = {};

    // Check Supabase
    const supabaseStart = Date.now();
    const { error: supabaseError } = await supabase.from('user_profiles').select('id').limit(1);
    checks.supabase = {
      status: supabaseError ? 'error' : 'healthy',
      latency: Date.now() - supabaseStart,
      ...(supabaseError && process.env.NODE_ENV !== 'production'
        ? { error: supabaseError.message }
        : {}),
    };

    // Check Stripe
    const stripeStart = Date.now();
    try {
      await stripe.balance.retrieve();
      checks.stripe = {
        status: 'healthy',
        latency: Date.now() - stripeStart,
      };
    } catch (stripeError: unknown) {
      checks.stripe = {
        status: 'error',
        latency: Date.now() - stripeStart,
        ...(process.env.NODE_ENV !== 'production'
          ? { error: stripeError instanceof Error ? stripeError.message : 'Unknown error' }
          : {}),
      };
    }

    const allHealthy = Object.values(checks).every(
      (c) => (c as { status: string }).status === 'healthy'
    );

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
