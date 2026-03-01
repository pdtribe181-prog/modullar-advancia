/**
 * Orchestration Routes Tests
 *
 * Tests for payment, notification, cache, and automation orchestration endpoints
 */

import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// ── Mock services ──

const mockProcessPayment = jest.fn<any>();
const mockGetPaymentState = jest.fn<any>();
const mockGetPaymentMetrics = jest.fn<any>();

jest.unstable_mockModule('../services/payment-orchestration.service.js', () => {
  return {
    paymentOrchestrationService: {
      processPayment: mockProcessPayment,
      getPaymentState: mockGetPaymentState,
      getPaymentMetrics: mockGetPaymentMetrics,
    },
    PaymentOrchestrationRequest: z.object({
      amount: z.number().positive(),
      currency: z.string().length(3),
      customerId: z.string().uuid(),
      paymentMethodId: z.string(),
      providerId: z.string().uuid().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      retryConfig: z
        .object({
          maxAttempts: z.number().max(5),
          backoffMultiplier: z.number(),
          initialDelayMs: z.number(),
        })
        .optional(),
    }),
  };
});

const mockSendNotification = jest.fn<any>();
const mockGetNotificationStatus = jest.fn<any>();
const mockGetDeliveryAnalytics = jest.fn<any>();

jest.unstable_mockModule('../services/notification-orchestration.service.js', () => {
  return {
    notificationOrchestrationService: {
      sendNotification: mockSendNotification,
      getNotificationStatus: mockGetNotificationStatus,
      getDeliveryAnalytics: mockGetDeliveryAnalytics,
    },
    NotificationRequest: z.object({
      userId: z.string().uuid(),
      templateId: z.string(),
      channel: z.enum(['email', 'sms', 'push', 'in_app', 'auto']).default('auto'),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      data: z.record(z.string(), z.any()).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      scheduledFor: z.date().optional(),
      expiresAt: z.date().optional(),
      enableFallback: z.boolean().optional().default(true),
      enableTracking: z.boolean().optional().default(true),
    }),
  };
});

const mockGetCacheStats = jest.fn<any>();
const mockInvalidateCache = jest.fn<any>();
const mockWarmCache = jest.fn<any>();

jest.unstable_mockModule('../services/cache-orchestration.service.js', () => {
  return {
    cacheOrchestrationService: {
      getStats: mockGetCacheStats,
      invalidate: mockInvalidateCache,
      warmCache: mockWarmCache,
    },
    CacheInvalidationRequest: z.object({
      pattern: z.string(),
      scope: z.enum(['exact', 'prefix', 'pattern']).optional(),
    }),
    CacheWarmingRequest: z.object({
      keys: z.array(z.string()).optional(),
      patterns: z.array(z.string()).optional(),
    }),
  };
});

const mockExecuteWorkflow = jest.fn<any>();
const mockRegisterWorkflow = jest.fn<any>();
const mockGetRegisteredWorkflows = jest.fn<any>();
const mockGetExecutionHistory = jest.fn<any>();

jest.unstable_mockModule('../services/automation-orchestration.service.js', () => {
  return {
    automationOrchestrationService: {
      executeWorkflow: mockExecuteWorkflow,
      registerWorkflow: mockRegisterWorkflow,
      getRegisteredWorkflows: mockGetRegisteredWorkflows,
      getExecutionHistory: mockGetExecutionHistory,
    },
    AutomationRequest: z.object({
      workflowId: z.string(),
      context: z.record(z.string(), z.any()).optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      scheduledFor: z.date().optional(),
      expiresAt: z.date().optional(),
    }),
    WorkflowDefinition: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      enabled: z.boolean().optional().default(true),
      trigger: z.object({
        type: z.enum(['schedule', 'event', 'condition', 'manual']),
        schedule: z.string().optional(),
        event: z.string().optional(),
      }),
      actions: z.array(
        z.object({
          type: z.string(),
          config: z.record(z.string(), z.any()),
        })
      ),
    }),
  };
});

// Mock auth middleware — pass-through for testing
jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (_req: Request, _res: Response, next: NextFunction) => {
    const authedReq = _req as any;
    authedReq.user = { id: 'a1111111-1111-4111-a111-111111111111', email: 'admin@test.com' };
    authedReq.userProfile = { role: 'admin' };
    next();
  },
  authenticateWithProfile: (_req: Request, _res: Response, next: NextFunction) => {
    const authedReq = _req as any;
    authedReq.user = { id: 'a1111111-1111-4111-a111-111111111111', email: 'admin@test.com' };
    authedReq.userProfile = { role: 'admin' };
    next();
  },
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
  requireAdmin: [
    (_req: Request, _res: Response, next: NextFunction) => {
      const authedReq = _req as any;
      authedReq.user = { id: 'a1111111-1111-4111-a111-111111111111', email: 'admin@test.com' };
      authedReq.userProfile = { role: 'admin' };
      next();
    },
  ],
  requireProvider: [(_req: Request, _res: Response, next: NextFunction) => next()],
  AuthenticatedRequest: undefined,
}));

// Mock rate limiters
jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  paymentLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sensitiveLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  webhookLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Mock logger
jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  requestId: (_req: Request, _res: Response, next: NextFunction) => next(),
  requestLogger: (_req: Request, _res: Response, next: NextFunction) => next(),
  errorHandler: (err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  },
  notFoundHandler: (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not found' });
  },
}));

// Import supertest + app setup
// Dynamic imports — assigned in beforeAll
let supertest: any;
let express: any;
let orchestrationRoutes: any;

// Build test app
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/orchestration', orchestrationRoutes);
  // Simple error handler for tests
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.statusCode || err.status || 500;
    res.status(status).json({ success: false, error: err.message || 'Internal Server Error' });
  });
  return app;
}

let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  supertest = (await import('supertest')).default;
  express = (await import('express')).default;
  orchestrationRoutes = (await import('../routes/orchestration.routes.js')).default;
  app = buildApp();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════════════
// PAYMENT ORCHESTRATION
// ════════════════════════════════════════════════════════════════════════════

describe('Payment Orchestration', () => {
  const validPaymentBody = {
    amount: 10000,
    currency: 'USD',
    customerId: 'a1111111-1111-4111-a111-111111111111',
    paymentMethodId: 'pm_test_123',
  };

  describe('POST /api/v1/orchestration/payments/process', () => {
    it('should process a payment successfully', async () => {
      mockProcessPayment.mockResolvedValue({
        success: true,
        paymentId: 'po_test_123',
        status: 'completed',
        provider: 'stripe',
        amount: 10000,
        currency: 'USD',
      });

      const res = await supertest(app)
        .post('/api/v1/orchestration/payments/process')
        .send(validPaymentBody)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentId).toBe('po_test_123');
      expect(mockProcessPayment).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10000, currency: 'USD' })
      );
    });

    it('should return 422 when payment fails', async () => {
      mockProcessPayment.mockResolvedValue({
        success: false,
        error: 'Insufficient funds',
      });

      const res = await supertest(app)
        .post('/api/v1/orchestration/payments/process')
        .send(validPaymentBody)
        .expect(422);

      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await supertest(app)
        .post('/api/v1/orchestration/payments/process')
        .send({ amount: -5 }) // Invalid: negative, missing fields
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should accept optional retryConfig', async () => {
      mockProcessPayment.mockResolvedValue({ success: true, paymentId: 'po_test_456' });

      await supertest(app)
        .post('/api/v1/orchestration/payments/process')
        .send({
          ...validPaymentBody,
          retryConfig: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 1000 },
        })
        .expect(200);

      expect(mockProcessPayment).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/orchestration/payments/:paymentId/state', () => {
    it('should return payment state', async () => {
      const paymentId = 'a1111111-1111-4111-a111-111111111111';
      mockGetPaymentState.mockResolvedValue({
        paymentId,
        status: 'completed',
        provider: 'stripe',
      });

      const res = await supertest(app)
        .get(`/api/v1/orchestration/payments/${paymentId}/state`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
    });

    it('should return 404 when payment not found', async () => {
      mockGetPaymentState.mockResolvedValue(null);

      await supertest(app)
        .get('/api/v1/orchestration/payments/a1111111-1111-4111-a111-111111111111/state')
        .expect(404);
    });

    it('should validate paymentId format', async () => {
      await supertest(app).get('/api/v1/orchestration/payments/invalid-uuid/state').expect(400);
    });
  });

  describe('GET /api/v1/orchestration/payments/:paymentId/metrics', () => {
    it('should return payment metrics', async () => {
      const paymentId = 'a1111111-1111-4111-a111-111111111111';
      mockGetPaymentMetrics.mockResolvedValue({
        paymentId,
        metrics: [{ attempts: 2, duration: 1500 }],
      });

      const res = await supertest(app)
        .get(`/api/v1/orchestration/payments/${paymentId}/metrics`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATION ORCHESTRATION
// ════════════════════════════════════════════════════════════════════════════

describe('Notification Orchestration', () => {
  const validNotificationBody = {
    userId: 'a1111111-1111-4111-a111-111111111111',
    templateId: 'appointment_reminder',
    channel: 'auto',
    priority: 'normal',
  };

  describe('POST /api/v1/orchestration/notifications/send', () => {
    it('should send a notification successfully', async () => {
      mockSendNotification.mockResolvedValue({
        success: true,
        notificationId: 'notif_123',
        channel: 'email',
        status: 'delivered',
      });

      const res = await supertest(app)
        .post('/api/v1/orchestration/notifications/send')
        .send(validNotificationBody)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.notificationId).toBe('notif_123');
    });

    it('should return 422 when delivery fails', async () => {
      mockSendNotification.mockResolvedValue({
        success: false,
        error: 'All delivery channels exhausted',
      });

      const res = await supertest(app)
        .post('/api/v1/orchestration/notifications/send')
        .send(validNotificationBody)
        .expect(422);

      expect(res.body.success).toBe(false);
    });

    it('should validate userId is a UUID', async () => {
      await supertest(app)
        .post('/api/v1/orchestration/notifications/send')
        .send({ userId: 'not-a-uuid', templateId: 'test' })
        .expect(400);
    });
  });

  describe('GET /api/v1/orchestration/notifications/:notificationId/status', () => {
    it('should return notification status', async () => {
      const id = 'a1111111-1111-4111-a111-111111111111';
      mockGetNotificationStatus.mockResolvedValue({
        notificationId: id,
        status: 'delivered',
        channel: 'email',
      });

      const res = await supertest(app)
        .get(`/api/v1/orchestration/notifications/${id}/status`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('delivered');
    });

    it('should return 404 when notification not found', async () => {
      mockGetNotificationStatus.mockResolvedValue(null);

      await supertest(app)
        .get('/api/v1/orchestration/notifications/a1111111-1111-4111-a111-111111111111/status')
        .expect(404);
    });
  });

  describe('GET /api/v1/orchestration/notifications/analytics', () => {
    it('should return delivery analytics', async () => {
      mockGetDeliveryAnalytics.mockResolvedValue({
        totalSent: 150,
        byChannel: { email: 80, sms: 50, push: 20 },
        byStatus: { delivered: 130, failed: 20 },
      });

      const res = await supertest(app)
        .get('/api/v1/orchestration/notifications/analytics')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalSent).toBe(150);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CACHE ORCHESTRATION
// ════════════════════════════════════════════════════════════════════════════

describe('Cache Orchestration', () => {
  describe('GET /api/v1/orchestration/cache/stats', () => {
    it('should return cache statistics', async () => {
      mockGetCacheStats.mockResolvedValue({
        l1Size: 150,
        l2Size: 500,
        hitRate: 0.85,
        missRate: 0.15,
      });

      const res = await supertest(app).get('/api/v1/orchestration/cache/stats').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.hitRate).toBe(0.85);
    });
  });

  describe('POST /api/v1/orchestration/cache/invalidate', () => {
    it('should invalidate cache entries', async () => {
      mockInvalidateCache.mockResolvedValue({ invalidated: 5 });

      const res = await supertest(app)
        .post('/api/v1/orchestration/cache/invalidate')
        .send({ pattern: 'user:*', scope: 'prefix' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Cache invalidated');
      expect(mockInvalidateCache).toHaveBeenCalledWith(
        expect.objectContaining({ pattern: 'user:*' })
      );
    });

    it('should validate pattern is required', async () => {
      await supertest(app).post('/api/v1/orchestration/cache/invalidate').send({}).expect(400);
    });
  });

  describe('POST /api/v1/orchestration/cache/warm', () => {
    it('should initiate cache warming', async () => {
      mockWarmCache.mockResolvedValue({ warmed: 10 });

      const res = await supertest(app)
        .post('/api/v1/orchestration/cache/warm')
        .send({ keys: ['user:123', 'config:main'] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Cache warming initiated');
    });
  });

  describe('DELETE /api/v1/orchestration/cache/:key', () => {
    it('should delete a specific cache entry', async () => {
      mockInvalidateCache.mockResolvedValue({ invalidated: 1 });

      const res = await supertest(app).delete('/api/v1/orchestration/cache/user:123').expect(200);

      expect(res.body.success).toBe(true);
      expect(mockInvalidateCache).toHaveBeenCalledWith(
        expect.objectContaining({ pattern: 'user:123', strategy: 'immediate', propagate: true })
      );
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AUTOMATION ORCHESTRATION
// ════════════════════════════════════════════════════════════════════════════

describe('Automation Orchestration', () => {
  describe('POST /api/v1/orchestration/automations/execute', () => {
    it('should execute a workflow successfully', async () => {
      mockExecuteWorkflow.mockResolvedValue({
        success: true,
        executionId: 'exec_123',
        workflowId: 'appointment_reminder',
        status: 'completed',
        steps: [],
      });

      const res = await supertest(app)
        .post('/api/v1/orchestration/automations/execute')
        .send({ workflowId: 'appointment_reminder' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.executionId).toBe('exec_123');
    });

    it('should return 422 when workflow execution fails', async () => {
      mockExecuteWorkflow.mockResolvedValue({
        success: false,
        error: 'Workflow not found',
      });

      const res = await supertest(app)
        .post('/api/v1/orchestration/automations/execute')
        .send({ workflowId: 'nonexistent' })
        .expect(422);

      expect(res.body.success).toBe(false);
    });

    it('should validate workflowId is required', async () => {
      await supertest(app).post('/api/v1/orchestration/automations/execute').send({}).expect(400);
    });
  });

  describe('POST /api/v1/orchestration/automations/workflows', () => {
    it('should register a new workflow', async () => {
      mockRegisterWorkflow.mockReturnValue({ success: true });

      const workflowDef = {
        id: 'custom_wf_1',
        name: 'Custom Workflow',
        trigger: { type: 'manual' },
        actions: [{ type: 'send_notification', config: { templateId: 'test', channel: 'email' } }],
      };

      const res = await supertest(app)
        .post('/api/v1/orchestration/automations/workflows')
        .send(workflowDef)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('custom_wf_1');
    });

    it('should validate workflow definition', async () => {
      await supertest(app)
        .post('/api/v1/orchestration/automations/workflows')
        .send({ name: 'Missing required fields' })
        .expect(400);
    });
  });

  describe('GET /api/v1/orchestration/automations/workflows', () => {
    it('should list registered workflows', async () => {
      mockGetRegisteredWorkflows.mockReturnValue([
        {
          id: 'appointment_reminder',
          name: 'Appointment Reminder',
          enabled: true,
          type: 'builtin',
        },
        {
          id: 'payment_reconciliation',
          name: 'Payment Reconciliation',
          enabled: true,
          type: 'builtin',
        },
      ]);

      const res = await supertest(app)
        .get('/api/v1/orchestration/automations/workflows')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/orchestration/automations/workflows/:workflowId/history', () => {
    it('should return execution history', async () => {
      mockGetExecutionHistory.mockResolvedValue([
        { executionId: 'exec_1', status: 'completed', startedAt: '2026-03-01T10:00:00Z' },
        { executionId: 'exec_2', status: 'failed', startedAt: '2026-03-01T09:00:00Z' },
      ]);

      const res = await supertest(app)
        .get('/api/v1/orchestration/automations/workflows/appointment_reminder/history')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// HEALTH ENDPOINT
// ════════════════════════════════════════════════════════════════════════════

describe('Orchestration Health', () => {
  describe('GET /api/v1/orchestration/health', () => {
    it('should return health status of all services', async () => {
      mockGetCacheStats.mockResolvedValue({ l1Size: 100, hitRate: 0.9 });
      mockGetRegisteredWorkflows.mockReturnValue([
        { id: 'wf1', name: 'Workflow 1', enabled: true, type: 'builtin' },
      ]);

      const res = await supertest(app).get('/api/v1/orchestration/health').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.services.paymentOrchestration.status).toBe('active');
      expect(res.body.data.services.notificationOrchestration.status).toBe('active');
      expect(res.body.data.services.cacheOrchestration.status).toBe('active');
      expect(res.body.data.services.automationOrchestration.status).toBe('active');
      expect(res.body.data.services.automationOrchestration.registeredWorkflows).toBe(1);
      expect(res.body.data.timestamp).toBeDefined();
    });
  });
});
