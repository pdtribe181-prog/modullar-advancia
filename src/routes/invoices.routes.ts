import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createServiceClient } from '../lib/supabase.js';
import { apiLimiter } from '../middleware/rateLimit.middleware.js';
import {
  validateQuery,
  validateParams,
  uuidSchema,
  paginationSchema,
} from '../middleware/validation.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { z } from 'zod';

const router = Router();
const supabase = createServiceClient();

// Schemas
const idParamsSchema = z.object({
  id: z.string().uuid('Invalid invoice ID'),
});

const invoiceListQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded']).optional(),
});

// ============================================================
// GET /invoices — List invoices for the authenticated user
// ============================================================
router.get(
  '/',
  apiLimiter,
  authenticate,
  validateQuery(invoiceListQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.userProfile?.role || 'patient';
    const {
      page = 1,
      limit = 20,
      status,
    } = req.query as {
      page?: number;
      limit?: number;
      status?: string;
    };

    const offset = (Number(page) - 1) * Number(limit);

    // Build query based on role
    let query = supabase
      .from('invoices')
      .select(
        `
        id,
        invoice_number,
        issue_date,
        due_date,
        status,
        subtotal,
        tax_amount,
        total_amount,
        currency,
        notes,
        patient:patients!invoices_patient_id_fkey(id, user_id, first_name, last_name),
        provider:providers!invoices_provider_id_fkey(id, user_id, practice_name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    // Filter by user's role
    if (role === 'patient') {
      // Get patient record for this user
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!patient) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });
      }
      query = query.eq('patient_id', patient.id);
    } else if (role === 'provider') {
      const { data: provider } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!provider) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });
      }
      query = query.eq('provider_id', provider.id);
    }
    // admin sees all invoices (no filter)

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error, count } = await query;

    if (error) throw AppError.internal();

    const total = count || 0;
    res.json({
      success: true,
      data: invoices || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// ============================================================
// GET /invoices/:id — Get invoice detail with line items
// ============================================================
router.get(
  '/:id',
  apiLimiter,
  authenticate,
  validateParams(idParamsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const role = req.userProfile?.role || 'patient';
    const { id } = req.params;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        patient:patients!invoices_patient_id_fkey(id, user_id, first_name, last_name, email, phone),
        provider:providers!invoices_provider_id_fkey(id, user_id, practice_name, address, phone, email, tax_id),
        items:invoice_items(id, description, quantity, unit_price, amount),
        transaction:transactions!invoices_transaction_id_fkey(id, stripe_payment_intent_id, payment_method, status)
      `
      )
      .eq('id', id)
      .single();

    if (error || !invoice) {
      throw AppError.notFound('Invoice not found');
    }

    // Authorization: ensure the user can access this invoice
    if (role === 'patient') {
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!patient || invoice.patient_id !== patient.id) {
        throw AppError.forbidden('You do not have access to this invoice');
      }
    } else if (role === 'provider') {
      const { data: provider } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!provider || invoice.provider_id !== provider.id) {
        throw AppError.forbidden('You do not have access to this invoice');
      }
    }
    // admin can access all invoices

    res.json({ success: true, data: invoice });
  })
);

export default router;
