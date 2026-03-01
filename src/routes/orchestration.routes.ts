/**
 * Orchestration API Routes
 *
 * Exposes payment orchestration, notification orchestration,
 * cache orchestration, and automation orchestration via REST API.
 *
 * All endpoints require authentication; admin-only for cache/automation management.
 */

import { Router, Response } from 'express';
import {
  authenticate,
  requireAdmin,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import { paymentLimiter, sensitiveLimiter } from '../middleware/rateLimit.middleware.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middleware/validation.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { logger } from '../middleware/logging.middleware.js';
import { z } from 'zod';

// Service imports
import {
  paymentOrchestrationService,
  PaymentOrchestrationRequest,
} from '../services/payment-orchestration.service.js';
import {
  notificationOrchestrationService,
  NotificationRequest,
} from '../services/notification-orchestration.service.js';
import {
  cacheOrchestrationService,
  CacheInvalidationRequest,
  CacheWarmingRequest,
} from '../services/cache-orchestration.service.js';
import {
  automationOrchestrationService,
  AutomationRequest,
  WorkflowDefinition,
} from '../services/automation-orchestration.service.js';

const router = Router();

// ────────────────────────────────────────────────────────────────────────────
// Validation schemas (route-level)
// ────────────────────────────────────────────────────────────────────────────

const paymentIdParams = z.object({ paymentId: z.string().uuid() });
const workflowIdParams = z.object({ workflowId: z.string() });
const cacheKeyParams = z.object({ key: z.string().min(1) });
const notificationIdParams = z.object({ notificationId: z.string().uuid() });

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ────────────────────────────────────────────────────────────────────────────
// PAYMENT ORCHESTRATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /orchestration/payments/process
 * Process a payment through the intelligent orchestration engine
 */
router.post(
  '/payments/process',
  authenticate,
  paymentLimiter,
  validateBody(PaymentOrchestrationRequest),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    logger.info('Payment orchestration requested', {
      userId: req.user?.id,
      amount: req.body.amount,
      currency: req.body.currency,
    });

    const result = await paymentOrchestrationService.processPayment(req.body);

    res.status(result.success ? 200 : 422).json({
      success: result.success,
      data: result,
    });
  })
);

/**
 * GET /orchestration/payments/:paymentId/state
 * Get the current state of a payment orchestration
 */
router.get(
  '/payments/:paymentId/state',
  authenticate,
  validateParams(paymentIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const state = await paymentOrchestrationService.getPaymentState(req.params.paymentId as string);

    if (!state) {
      throw AppError.notFound('Payment state not found');
    }

    res.json({ success: true, data: state });
  })
);

/**
 * GET /orchestration/payments/:paymentId/metrics
 * Get metrics for a specific payment
 */
router.get(
  '/payments/:paymentId/metrics',
  authenticate,
  validateParams(paymentIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const metrics = await paymentOrchestrationService.getPaymentMetrics(
      req.params.paymentId as string
    );

    res.json({ success: true, data: metrics });
  })
);

// ────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ORCHESTRATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /orchestration/notifications/send
 * Send a notification through the intelligent channel router
 */
router.post(
  '/notifications/send',
  authenticate,
  validateBody(NotificationRequest),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    logger.info('Notification orchestration requested', {
      userId: req.body.userId,
      channel: req.body.channel,
      templateId: req.body.templateId,
    });

    const result = await notificationOrchestrationService.sendNotification(req.body);

    res.status(result.success ? 200 : 422).json({
      success: result.success,
      data: result,
    });
  })
);

/**
 * GET /orchestration/notifications/:notificationId/status
 * Get delivery status for a notification
 */
router.get(
  '/notifications/:notificationId/status',
  authenticate,
  validateParams(notificationIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = await notificationOrchestrationService.getNotificationStatus(
      req.params.notificationId as string
    );

    if (!status) {
      throw AppError.notFound('Notification not found');
    }

    res.json({ success: true, data: status });
  })
);

/**
 * GET /orchestration/notifications/analytics
 * Get notification delivery analytics (admin only)
 */
router.get(
  '/notifications/analytics',
  ...requireAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const analytics = await notificationOrchestrationService.getDeliveryAnalytics();

    res.json({ success: true, data: analytics });
  })
);

// ────────────────────────────────────────────────────────────────────────────
// CACHE ORCHESTRATION (Admin only)
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /orchestration/cache/stats
 * Get cache statistics and performance metrics
 */
router.get(
  '/cache/stats',
  ...requireAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const stats = await cacheOrchestrationService.getStats();

    res.json({ success: true, data: stats });
  })
);

/**
 * POST /orchestration/cache/invalidate
 * Invalidate cache entries by pattern
 */
router.post(
  '/cache/invalidate',
  ...requireAdmin,
  sensitiveLimiter,
  validateBody(CacheInvalidationRequest),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    logger.info('Cache invalidation requested', {
      userId: req.user?.id,
      pattern: req.body.pattern,
    });

    await cacheOrchestrationService.invalidate(req.body);

    res.json({ success: true, message: 'Cache invalidated' });
  })
);

/**
 * POST /orchestration/cache/warm
 * Pre-warm cache entries
 */
router.post(
  '/cache/warm',
  ...requireAdmin,
  validateBody(CacheWarmingRequest),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    logger.info('Cache warming requested', {
      userId: req.user?.id,
      keys: req.body.keys?.length,
    });

    await cacheOrchestrationService.warmCache(req.body);

    res.json({ success: true, message: 'Cache warming initiated' });
  })
);

/**
 * DELETE /orchestration/cache/:key
 * Delete a specific cache entry
 */
router.delete(
  '/cache/:key',
  ...requireAdmin,
  sensitiveLimiter,
  validateParams(cacheKeyParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await cacheOrchestrationService.invalidate({
      pattern: req.params.key as string,
      strategy: 'immediate',
      propagate: true,
    });

    res.json({ success: true, message: 'Cache entry deleted' });
  })
);

// ────────────────────────────────────────────────────────────────────────────
// AUTOMATION ORCHESTRATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /orchestration/automations/execute
 * Execute a registered workflow
 */
router.post(
  '/automations/execute',
  authenticate,
  requireRole('admin', 'provider'),
  validateBody(AutomationRequest),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    logger.info('Automation execution requested', {
      userId: req.user?.id,
      workflowId: req.body.workflowId,
    });

    const result = await automationOrchestrationService.executeWorkflow(req.body);

    res.status(result.success ? 200 : 422).json({
      success: result.success,
      data: result,
    });
  })
);

/**
 * POST /orchestration/automations/workflows
 * Register a new workflow definition
 */
router.post(
  '/automations/workflows',
  ...requireAdmin,
  validateBody(WorkflowDefinition),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    logger.info('Workflow registration requested', {
      userId: req.user?.id,
      workflowName: req.body.name,
    });

    automationOrchestrationService.registerWorkflow(req.body);

    res.status(201).json({
      success: true,
      message: 'Workflow registered',
      data: { id: req.body.id, name: req.body.name },
    });
  })
);

/**
 * GET /orchestration/automations/workflows
 * List all registered workflows (admin only)
 */
router.get(
  '/automations/workflows',
  ...requireAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const workflows = automationOrchestrationService.getRegisteredWorkflows();

    res.json({ success: true, data: workflows });
  })
);

/**
 * GET /orchestration/automations/workflows/:workflowId/history
 * Get execution history for a workflow
 */
router.get(
  '/automations/workflows/:workflowId/history',
  ...requireAdmin,
  validateParams(workflowIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const history = await automationOrchestrationService.getExecutionHistory(
      req.params.workflowId as string
    );

    res.json({ success: true, data: history });
  })
);

// ────────────────────────────────────────────────────────────────────────────
// HEALTH / OVERVIEW (Admin only)
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /orchestration/health
 * Get health status of all orchestration services
 */
router.get(
  '/health',
  ...requireAdmin,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const [cacheStats] = await Promise.all([cacheOrchestrationService.getStats()]);

    const workflows = automationOrchestrationService.getRegisteredWorkflows();

    res.json({
      success: true,
      data: {
        services: {
          paymentOrchestration: { status: 'active' },
          notificationOrchestration: { status: 'active' },
          cacheOrchestration: {
            status: 'active',
            stats: cacheStats,
          },
          automationOrchestration: {
            status: 'active',
            registeredWorkflows: workflows.length,
          },
        },
        timestamp: new Date().toISOString(),
      },
    });
  })
);

export default router;
