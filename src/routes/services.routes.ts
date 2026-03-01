/**
 * Services Routes - Breathing God's Creation Back and Front (All Glory to Him)
 *
 * Circulating data: Forward and back, back and forward.
 *
 * FRONT: Memory → API → Frontend (serving God's truth forward)
 * BACK:  Frontend → API → Database (receiving God's truth back)
 *
 * Back and front, front and back - ALL God's creation.
 * Even as it circulates through our system, it remains His truth.
 *
 * We don't create it. We don't form it. We don't own it.
 * We serve the living God by circulating what He already created.
 *
 * When patients are healed: GLORY TO GOD
 * When payments succeed: HONOR TO GOD
 * When services flow smoothly: PRAISE TO GOD
 * When the API responds perfectly: ADORATION TO GOD
 *
 * The living God we all know and serve - He is the source. All glory to Him.
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { asyncHandler } from '../utils/errors.js';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import { serviceCatalog } from '../services/service-catalog.service.js';

const router = Router();

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().min(1).max(100),
  code: z.string().optional(),
  code_type: z.enum(['CPT', 'HCPCS', 'ICD-10', 'custom']).optional(),
  default_price: z.number().positive(),
  currency: z.string().default('USD'),
  duration_minutes: z.number().int().positive().optional(),
  requires_authorization: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateServiceSchema = createServiceSchema.partial().extend({
  is_active: z.boolean().optional(),
});

const listServicesQuerySchema = z.object({
  category: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================
// PUBLIC ROUTES (Read-only)
// ============================================================

/**
 * GET /services
 * List services from IN-MEMORY catalog (instant response)
 */
router.get(
  '/',
  validateQuery(listServicesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, is_active, search, limit, offset } = req.query;

    // Get services from memory (no external lookup)
    let services = serviceCatalog.getAll(is_active === 'false');

    // Filter by category
    if (category) {
      services = services.filter((s) => s.category === String(category));
    }

    // Search by name, description, or code
    if (search) {
      services = serviceCatalog.search(String(search), is_active === 'false');
    }

    // Total count before pagination
    const total = services.length;

    // Apply pagination
    const start = Number(offset);
    const end = start + Number(limit);
    const paginatedServices = services.slice(start, end);

    res.json({
      success: true,
      data: paginatedServices,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
      source: 'memory', // Indicate this came from RAM, not database
    });
  })
);

/**
 * GET /services/categories
 * Get unique categories from IN-MEMORY catalog (instant response)
 */
router.get(
  '/categories',
  asyncHandler(async (req: Request, res: Response) => {
    // Get categories from memory (no external lookup)
    const categories = serviceCatalog.getCategories();

    res.json({
      success: true,
      data: categories,
      source: 'memory',
    });
  })
);

/**
 * GET /services/:id
 * Get specific service from IN-MEMORY catalog (instant response)
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    // Get from memory (no external lookup)
    const service = serviceCatalog.getById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    res.json({
      success: true,
      data: service,
      source: 'memory',
    });
  })
);

// ============================================================
// ADMIN ROUTES (Create, Update, Delete)
// ============================================================

/**
 * POST /services
 * Create a new service (updates both database and memory)
 */
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validateBody(createServiceSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const serviceData = req.body;

    const { data, error } = await supabase.from('services').insert([serviceData]).select().single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create service',
        details: error.message,
      });
    }

    // Update in-memory catalog
    await serviceCatalog.upsert(data);

    res.status(201).json({
      success: true,
      data,
      message: 'Service created successfully',
    });
  })
);

/**
 * PUT /services/:id
 * Update a service (updates both database and memory)
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateBody(updateServiceSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('services')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Service not found or update failed',
        details: error?.message,
      });
    }

    // Update in-memory catalog
    await serviceCatalog.upsert(data);

    res.json({
      success: true,
      data,
      message: 'Service updated successfully',
    });
  })
);

/**
 * DELETE /services/:id
 * Soft delete a service (updates both database and memory)
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('services')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    // Update in-memory catalog
    await serviceCatalog.upsert(data);

    res.json({
      success: true,
      message: 'Service deactivated successfully',
      data,
    });
  })
);

/**
 * POST /services/:id/activate
 * Reactivate a soft-deleted service (updates both database and memory)
 */
router.post(
  '/:id/activate',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('services')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    // Update in-memory catalog
    await serviceCatalog.upsert(data);

    res.json({
      success: true,
      message: 'Service activated successfully',
      data,
    });
  })
);

/**
 * GET /services/admin/stats
 * Get catalog statistics (admin only)
 */
router.get(
  '/admin/stats',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stats = serviceCatalog.getStats();

    res.json({
      success: true,
      data: stats,
      message: 'All services are served from RAM - zero external lookups during requests',
    });
  })
);

/**
 * POST /services/admin/refresh
 * Manually refresh the in-memory catalog from database (admin only)
 */
router.post(
  '/admin/refresh',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await serviceCatalog.refresh();

    res.json({
      success: true,
      message: 'Service catalog refreshed from database',
      data: serviceCatalog.getStats(),
    });
  })
);

export default router;
