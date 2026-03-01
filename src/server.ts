// Express API Server for Healthcare Platform
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { validateEnv, getEnv } from './config/env.js';
import { supabase, createServiceClient } from './lib/supabase.js';
import * as apiServices from './services/api.service.js';
import stripeRoutes from './routes/stripe.routes.js';
import connectRoutes from './routes/connect.routes.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import providerRoutes from './routes/provider.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import databaseWebhookRoutes from './routes/database-webhook.routes.js';
import medBedRoutes from './routes/medbed.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import gdprRoutes from './routes/gdpr.routes.js';
import retentionRoutes from './routes/retention.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import orchestrationRoutes from './routes/orchestration.routes.js';
import servicesRoutes from './routes/services.routes.js';
import { auditLog } from './middleware/audit.middleware.js';
import { metricsMiddleware } from './middleware/metrics.middleware.js';
import { apiVersioning } from './middleware/api-versioning.middleware.js';
import { apiLimiter, paymentLimiter } from './middleware/rateLimit.middleware.js';
import { configureSecurityHeaders, getCorsConfig } from './middleware/security.middleware.js';
import {
  compressionMiddleware,
  fastCompressionMiddleware,
} from './middleware/compression.middleware.js';
import { getRedisKind, redisHelpers } from './lib/redis.js';
import { getAllCircuitBreakerStats } from './utils/circuit-breaker.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { sanitizeBody } from './middleware/sanitize.middleware.js';
import { z } from 'zod';
import { validateParams, uuidSchema } from './middleware/validation.middleware.js';

// Param validation schemas for inline routes
const patientIdParams = z.object({ patientId: uuidSchema });
const providerIdParams = z.object({ providerId: uuidSchema });
const idParams = z.object({ id: uuidSchema });
import {
  requestId,
  requestLogger,
  errorHandler,
  notFoundHandler,
  logger,
} from './middleware/logging.middleware.js';
import type { AuthenticatedRequest } from './types/express.types.js';
import type { AuthenticatedRequest as AuthReqWithProfile } from './middleware/auth.middleware.js';
import { getErrorMessage, sendErrorResponse, asyncHandler, AppError } from './utils/errors.js';
import type { OpenAPIV3 } from 'openapi-types';
import {
  initializeMonitoring,
  sentryRequestHandler,
  sentryErrorHandler,
  userContextMiddleware,
  getMonitoringHealth,
  flushEvents,
  captureError,
} from './services/monitoring.service.js';
import {
  initializeServiceCatalog,
  shutdownServiceCatalog,
} from './services/service-catalog.service.js';

// Validate environment variables at startup (fail fast)
try {
  validateEnv();
  logger.info('Environment validation passed');
} catch (error) {
  process.exit(1);
}

const env = getEnv();

// Initialize Sentry monitoring (before app creation)
initializeMonitoring({
  dsn: env.SENTRY_DSN,
  environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
});

const app = express();
const PORT = env.PORT;

// Trust proxy (nginx / Cloudflare) — required for express-rate-limit, secure cookies, etc.
app.set('trust proxy', 1);

// Sentry request handler (must be first middleware)
app.use(sentryRequestHandler);

// Body parser with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Basic XSS sanitization
app.use(sanitizeBody);

// Load OpenAPI spec
let swaggerDocument: OpenAPIV3.Document | null = null;
try {
  // Try dist folder first (production), then root (development)
  let openapiFile: string;
  try {
    openapiFile = readFileSync('./dist/openapi.yaml', 'utf8');
  } catch {
    openapiFile = readFileSync('./openapi.yaml', 'utf8');
  }
  swaggerDocument = parse(openapiFile) as OpenAPIV3.Document;
} catch {
  logger.warn('OpenAPI spec not found, /docs will be unavailable');
}

// Request ID tracking (must be first)
app.use(requestId);

// Metrics collection (early — before auth so it sees all requests)
app.use(metricsMiddleware);

// Request logging
app.use(requestLogger);

// Security headers (helmet)
configureSecurityHeaders(app);

// Response compression (balanced performance)
app.use(compressionMiddleware);

// CORS configuration
app.use(cors(getCorsConfig()));

// API versioning (resolves version from URL / Accept header / X-API-Version)
app.use('/api', apiVersioning);

// Apply rate limiting to all API routes
app.use('/api/v1', apiLimiter);

// Use raw body for Stripe webhook, JSON for everything else
app.use((req, res, next) => {
  if (req.path === '/api/v1/stripe/webhook') {
    express.raw({ type: 'application/json', limit: '1mb' })(req, res, next);
  } else {
    express.json({ limit: '10kb' })(req, res, next);
  }
});

// CSRF protection for state-changing requests (POST/PUT/PATCH/DELETE)
// Webhooks are excluded — they use their own signature verification
app.use('/api/v1', csrfProtection);

// Global audit logging for all mutating API requests
// Writes to access_audit_logs after the response is sent (non-blocking)
app.use('/api/v1', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const segment = req.path.replace(/^\//, '').split('/')[0] || 'unknown';
    const action = `${segment}.${req.method.toLowerCase()}`;
    return auditLog(action)(req, res, next);
  }
  next();
});

// Auth middleware — fetches user + profile for role-based checks
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }

  // Fetch user profile for role information
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const authedReq = req as AuthenticatedRequest;
  authedReq.user = user;
  authedReq.userProfile = profile ?? undefined;
  next();
};

// API Routes
const apiRouter = express.Router();
apiRouter.use('/stripe', stripeRoutes);
apiRouter.use('/connect', connectRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/appointments', appointmentsRoutes);
apiRouter.use('/provider', providerRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/invoices', invoicesRoutes);
apiRouter.use('/medbeds', medBedRoutes);
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/gdpr', gdprRoutes);
apiRouter.use('/retention', retentionRoutes);
apiRouter.use('/webhooks/supabase', databaseWebhookRoutes);
apiRouter.use('/orchestration', orchestrationRoutes);
apiRouter.use('/services', servicesRoutes); // Medical services catalog (local DB)

app.use('/api/v1', apiRouter);

// Metrics routes (outside /api/v1 — Prometheus scraper + admin dashboard)
app.use('/metrics', metricsRoutes);

// Profile routes (authenticated)
// Expose under /api/v1 so frontend can call '/profile' when VITE_API_URL includes '/api/v1'.
apiRouter.get(
  '/profile',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const profile = await apiServices.userProfilesService.getById(user.id);
    res.json({ success: true, data: profile });
  })
);

apiRouter.patch(
  '/profile',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    // Whitelist allowed fields to prevent mass assignment (e.g., role escalation)
    const { full_name, phone, avatar_url, date_of_birth, address } = req.body;
    const allowedUpdates = Object.fromEntries(
      Object.entries({ full_name, phone, avatar_url, date_of_birth, address }).filter(
        ([, v]) => v !== undefined
      )
    );
    const profile = await apiServices.userProfilesService.update(user.id, allowedUpdates);
    res.json({ success: true, data: profile });
  })
);
// ─── Transactions ─────────────────────────────────────────────────────────
// GET /api/v1/transactions — list the authenticated user's transactions
apiRouter.get(
  '/transactions',
  authenticateToken,
  apiLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
    const userRole = (req as AuthReqWithProfile).userProfile?.role;

    let transactions;
    if (userRole === 'admin') {
      // Admins can see all transactions
      const { data, error } = await (
        createServiceClient() as ReturnType<typeof createServiceClient>
      )
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw AppError.internal('Failed to fetch transactions');
      transactions = data;
    } else if (userRole === 'provider') {
      transactions = await apiServices.transactionsService.getByProvider(user.id);
    } else {
      transactions = await apiServices.transactionsService.getByPatient(user.id);
    }

    res.json({ success: true, data: transactions?.slice(0, limit) ?? [] });
  })
);

// POST /api/v1/transactions/by-patient — also reachable under /api/v1
apiRouter.post(
  '/transactions/by-patient',
  authenticateToken,
  apiLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const userRole = (req as AuthReqWithProfile).userProfile?.role;
    const patientId =
      userRole === 'admin' || userRole === 'provider' ? String(req.body.patientId) : user.id;
    const transactions = await apiServices.transactionsService.getByPatient(patientId);
    res.json({ success: true, data: transactions });
  })
);

// POST /api/v1/transactions/by-provider
apiRouter.post(
  '/transactions/by-provider',
  authenticateToken,
  apiLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const userRole = (req as AuthReqWithProfile).userProfile?.role;
    const providerId = userRole === 'admin' ? String(req.body.providerId) : user.id;
    const transactions = await apiServices.transactionsService.getByProvider(providerId);
    res.json({ success: true, data: transactions });
  })
);

// POST /api/v1/transactions — create
apiRouter.post(
  '/transactions',
  authenticateToken,
  paymentLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const transaction = await apiServices.transactionsService.create(req.body);
    res.status(201).json({ success: true, data: transaction });
  })
);

// ─── Notifications ─────────────────────────────────────────────────────────
apiRouter.get(
  '/notifications',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const notifications = await apiServices.notificationsService.getUnread(user.id);
    res.json({ success: true, data: notifications });
  })
);

apiRouter.patch(
  '/notifications/:id/read',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const notification = await apiServices.notificationsService.markAsRead(String(req.params.id));
    res.json({ success: true, data: notification });
  })
);

// ─── Disputes ──────────────────────────────────────────────────────────────
apiRouter.get(
  '/disputes',
  authenticateToken,
  asyncHandler(async (_req: Request, res: Response) => {
    const disputes = await apiServices.disputesService.getAll();
    res.json({ success: true, data: disputes });
  })
);

apiRouter.get(
  '/disputes/:id',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const dispute = await apiServices.disputesService.getById(String(req.params.id));
    res.json({ success: true, data: dispute });
  })
);

apiRouter.post(
  '/disputes',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const dispute = await apiServices.disputesService.create(req.body);
    res.status(201).json({ success: true, data: dispute });
  })
);

// ─── Providers ─────────────────────────────────────────────────────────────
apiRouter.get(
  '/providers',
  authenticateToken,
  asyncHandler(async (_req: Request, res: Response) => {
    const providers = await apiServices.providersService.getAll();
    res.json({ success: true, data: providers });
  })
);

apiRouter.get(
  '/providers/specialty/:specialty',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const providers = await apiServices.providersService.getBySpecialty(
      String(req.params.specialty)
    );
    res.json({ success: true, data: providers });
  })
);

apiRouter.get(
  '/providers/:id',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await apiServices.providersService.getById(String(req.params.id));
    res.json({ success: true, data: provider });
  })
);

// ─── Patients ──────────────────────────────────────────────────────────────
apiRouter.get(
  '/patients',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const userRole = (req as AuthReqWithProfile).userProfile?.role;
    if (userRole === 'admin') {
      const patients = await apiServices.patientsService.getAll();
      return res.json({ success: true, data: patients });
    }
    const patient = await apiServices.patientsService.getById(user.id);
    res.json({ success: true, data: patient ? [patient] : [] });
  })
);

apiRouter.get(
  '/patients/:id',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const patientId = String(req.params.id);
    const userRole = (req as AuthReqWithProfile).userProfile?.role;
    if (userRole !== 'admin' && userRole !== 'provider' && user.id !== patientId) {
      return res
        .status(403)
        .json({ success: false, error: 'Forbidden: cannot access other patient records' });
    }
    const patient = await apiServices.patientsService.getById(patientId);
    res.json({ success: true, data: patient });
  })
);

// ─── Webhooks ──────────────────────────────────────────────────────────────
apiRouter.get(
  '/webhooks',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const webhooks = await apiServices.webhooksService.getByUser(user.id);
    res.json({ success: true, data: webhooks });
  })
);

apiRouter.post(
  '/webhooks',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const webhook = await apiServices.webhooksService.create({ ...req.body, user_id: user.id });
    res.status(201).json({ success: true, data: webhook });
  })
);

apiRouter.delete(
  '/webhooks/:id',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    await apiServices.webhooksService.delete(String(req.params.id));
    res.status(204).send();
  })
);

// ─── API Keys ──────────────────────────────────────────────────────────────
apiRouter.get(
  '/api-keys',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const apiKeys = await apiServices.apiKeysService.getByUser(user.id);
    res.json({ success: true, data: apiKeys });
  })
);

apiRouter.post(
  '/api-keys',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const apiKey = await apiServices.apiKeysService.create({ ...req.body, user_id: user.id });
    res.status(201).json({ success: true, data: apiKey });
  })
);

apiRouter.delete(
  '/api-keys/:id',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    await apiServices.apiKeysService.revoke(String(req.params.id));
    res.status(204).send();
  })
);
const getDatabaseStatus = async (): Promise<'connected' | 'error'> => {
  try {
    // Use service role to perform a real, lightweight PostgREST query.
    // This avoids false negatives from auth/session storage in Node environments.
    const admin = createServiceClient();
    const { error } = await admin.from('user_profiles').select('id').limit(1);
    return error ? 'error' : 'connected';
  } catch {
    return 'error';
  }
};

// Health check
app.get('/health', async (req, res) => {
  const dbStatus = await getDatabaseStatus();
  const monitoring = getMonitoringHealth();
  const redisHealthy = await redisHelpers.isHealthy();
  const redisKind = getRedisKind();

  const isHealthy = dbStatus === 'connected';

  // Server metrics — useful for monitoring dashboards and alerting
  const mem = process.memoryUsage();
  const serverMetrics = {
    uptime: Math.round(process.uptime()),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024), // MB
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
    },
    nodeVersion: process.version,
    pid: process.pid,
  };

  // Minimal response for HEAD / shallow probes; full response for GET
  const verbose = req.query.verbose === 'true';

  const body: Record<string, unknown> = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    redis: { status: redisHealthy ? 'connected' : 'disconnected', kind: redisKind },
    monitoring: monitoring.enabled ? 'enabled' : 'disabled',
    version: process.env.npm_package_version || '1.0.0',
  };

  if (verbose) {
    body.circuitBreakers = getAllCircuitBreakerStats();
    body.server = serverMetrics;
  }

  res.status(isHealthy ? 200 : 503).json(body);
});

// API Documentation
if (swaggerDocument) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Sentry error handler (must be before general error handler)
app.use(sentryErrorHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`Healthcare API started`, {
    port: PORT,
    env: env.NODE_ENV,
    docsUrl: `http://localhost:${PORT}/docs`,
  });

  // Initialize in-memory service catalog
  try {
    await initializeServiceCatalog();
    logger.info('✨ Service catalog loaded into memory - zero external lookups during requests');
  } catch (error) {
    logger.error('Failed to initialize service catalog', error as Error);
    // Continue running - services routes will fail but other endpoints work
  }
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  // Stop service catalog auto-sync
  shutdownServiceCatalog();

  // Flush Sentry events before shutdown
  await flushEvents(2000);

  server.close((err) => {
    if (err) {
      logger.error('Error during shutdown', err);
      process.exit(1);
    }

    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force exit after 30 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  captureError(error, { level: 'fatal' });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled rejection', error);
  captureError(error, { level: 'error', tags: { type: 'unhandledRejection' } });
});

export default app;
