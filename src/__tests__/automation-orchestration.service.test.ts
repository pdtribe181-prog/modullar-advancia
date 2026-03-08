/**
 * Automation Orchestration Service Tests
 * Tests: executeWorkflow, registerWorkflow, getRegisteredWorkflows,
 * getExecutionHistory, Zod schemas
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mocks ──

const mockSetCache = jest.fn<any>();
const mockGetCache = jest.fn<any>();
const mockFrom = jest.fn<any>();
const mockServiceFrom = jest.fn<any>();

// Must mock payment-orchestration & notification-orchestration before import
jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({ from: mockServiceFrom }),
}));

jest.unstable_mockModule('../lib/redis.js', () => ({
  redisHelpers: {
    setCache: mockSetCache,
    getCache: mockGetCache,
    deleteCache: jest.fn(),
    lpush: jest.fn<any>().mockResolvedValue(1),
    rpop: jest.fn<any>().mockResolvedValue(null),
    llen: jest.fn<any>().mockResolvedValue(0),
  },
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.unstable_mockModule('../services/payment-orchestration.service.js', () => ({
  paymentOrchestrationService: {
    processPayment: jest.fn<any>().mockResolvedValue({
      success: true,
      transactionId: 'txn_mock',
      provider: 'stripe',
      attempt: 1,
      processingTime: 100,
    }),
  },
}));

jest.unstable_mockModule('../services/notification-orchestration.service.js', () => ({
  notificationOrchestrationService: {
    sendNotification: jest.fn<any>().mockResolvedValue({
      success: true,
      notificationId: 'notif_mock',
      channel: 'email',
    }),
  },
}));

// Mock email and sms services that notification-orchestration imports
jest.unstable_mockModule('../services/email.service.js', () => ({
  sendEmail: jest.fn<any>().mockResolvedValue({ success: true }),
}));

jest.unstable_mockModule('../services/sms.service.js', () => ({
  sendRawSMS: jest.fn<any>().mockResolvedValue({ success: true }),
}));

const {
  AutomationOrchestrationService,
  WorkflowDefinition,
  AutomationRequest,
  automationOrchestrationService,
} = await import('../services/automation-orchestration.service.js');

// ── Helpers ──

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function validWorkflowRequest(overrides: Record<string, any> = {}) {
  return {
    workflowId: 'appointment_reminder',
    priority: 'normal' as const,
    context: { appointmentId: 'apt-123' },
    ...overrides,
  };
}

function dbChain(data: any = null, error: any = null) {
  const chain: any = {};
  chain.select = jest.fn<any>().mockReturnValue(chain);
  chain.eq = jest.fn<any>().mockReturnValue(chain);
  chain.single = jest.fn<any>().mockResolvedValue({ data, error });
  chain.order = jest.fn<any>().mockReturnValue(chain);
  chain.limit = jest.fn<any>().mockResolvedValue({ data: data ? [data] : [], error });
  chain.insert = jest.fn<any>().mockResolvedValue({ data, error });
  chain.upsert = jest.fn<any>().mockResolvedValue({ data, error });
  return chain;
}

// ── Tests ──

describe('AutomationOrchestrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(dbChain());
    mockServiceFrom.mockReturnValue(dbChain());
    mockSetCache.mockResolvedValue(undefined);
    mockGetCache.mockResolvedValue(null);
  });

  describe('Zod schemas', () => {
    it('AutomationRequest validates a correct request', () => {
      const result = AutomationRequest.safeParse(validWorkflowRequest());
      expect(result.success).toBe(true);
    });

    it('AutomationRequest requires workflowId', () => {
      const result = AutomationRequest.safeParse({
        triggeredBy: TEST_USER_ID,
      });
      expect(result.success).toBe(false);
    });

    it('WorkflowDefinition validates a complete definition', () => {
      const result = WorkflowDefinition.safeParse({
        id: 'wf-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        enabled: true,
        trigger: { type: 'manual' },
        actions: [
          {
            type: 'send_notification',
            config: { templateId: 'welcome' },
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('executeWorkflow', () => {
    it('returns an AutomationResult with expected shape', async () => {
      const result = await automationOrchestrationService.executeWorkflow(validWorkflowRequest());

      expect(result).toEqual(
        expect.objectContaining({
          success: expect.any(Boolean),
          workflowId: expect.any(String),
          executionId: expect.any(String),
        })
      );
    });

    it('executionId starts with expected prefix', async () => {
      const result = await automationOrchestrationService.executeWorkflow(validWorkflowRequest());

      expect(result.executionId).toMatch(/^automation_/);
    });

    it('handles invalid workflow request gracefully', async () => {
      const result = await automationOrchestrationService.executeWorkflow({
        workflowId: '',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles unknown workflow ID gracefully', async () => {
      const result = await automationOrchestrationService.executeWorkflow(
        validWorkflowRequest({ workflowId: 'completely_unknown_workflow' })
      );

      expect(result.success).toBe(false);
    });
  });

  describe('registerWorkflow', () => {
    it('registers a valid custom workflow', async () => {
      const workflow = {
        id: 'custom_wf_1',
        name: 'Custom Workflow',
        description: 'Test',
        enabled: true,
        trigger: { type: 'manual' as const },
        actions: [{ type: 'send_notification' as const, config: { templateId: 'test' } }],
      };

      const result = await automationOrchestrationService.registerWorkflow(workflow);

      expect(result.success).toBe(true);
    });

    it('rejects invalid workflow definition', async () => {
      const result = await automationOrchestrationService.registerWorkflow({} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getRegisteredWorkflows', () => {
    it('returns an array of workflows', () => {
      const workflows = automationOrchestrationService.getRegisteredWorkflows();

      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThan(0);
    });

    it('includes builtin workflow IDs', () => {
      const workflows = automationOrchestrationService.getRegisteredWorkflows();
      const ids = workflows.map((w: any) => w.id);

      expect(ids).toContain('appointment_reminder');
      expect(ids).toContain('payment_reconciliation');
    });

    it('each workflow has required fields', () => {
      const workflows = automationOrchestrationService.getRegisteredWorkflows();

      workflows.forEach((wf: any) => {
        expect(wf).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            enabled: expect.any(Boolean),
          })
        );
      });
    });
  });

  describe('getExecutionHistory', () => {
    it('returns execution history from database', async () => {
      const execLog = [{ workflow_id: 'appointment_reminder', status: 'completed' }];
      mockServiceFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            order: jest.fn<any>().mockReturnValue({
              limit: jest.fn<any>().mockResolvedValue({ data: execLog, error: null }),
            }),
          }),
        }),
      });

      const history =
        await automationOrchestrationService.getExecutionHistory('appointment_reminder');

      expect(Array.isArray(history)).toBe(true);
    });

    it('returns empty array on error', async () => {
      mockServiceFrom.mockReturnValue({
        select: jest.fn<any>().mockReturnValue({
          eq: jest.fn<any>().mockReturnValue({
            order: jest.fn<any>().mockReturnValue({
              limit: jest.fn<any>().mockRejectedValue(new Error('db down')),
            }),
          }),
        }),
      });

      const history = await automationOrchestrationService.getExecutionHistory('bad_wf');

      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(0);
    });
  });

  describe('singleton', () => {
    it('exports an AutomationOrchestrationService instance', () => {
      expect(automationOrchestrationService).toBeInstanceOf(AutomationOrchestrationService);
    });
  });
});
