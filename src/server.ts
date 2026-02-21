// Express API Server for Healthcare Platform
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { validateEnv, getEnv } from './config/env.js';
import { supabase } from './lib/supabase.js';
import * as apiServices from './services/api.service.js';
import stripeRoutes from './routes/stripe.routes.js';
import connectRoutes from './routes/connect.routes.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import providerRoutes from './routes/provider.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import databaseWebhookRoutes from './routes/database-webhook.routes.js';
import cryptoRoutes from './routes/crypto.routes.js';
import { apiLimiter, paymentLimiter } from './middleware/rateLimit.middleware.js';
import { configureSecurityHeaders, getCorsConfig } from './middleware/security.middleware.js';
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
import { getErrorMessage, sendErrorResponse, asyncHandler } from './utils/errors.js';
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

// Sentry request handler (must be first middleware)
app.use(sentryRequestHandler);

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

// Request logging
app.use(requestLogger);

// Security headers (helmet)
configureSecurityHeaders(app);

// CORS configuration
app.use(cors(getCorsConfig()));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);
app.use('/stripe', apiLimiter);
app.use('/connect', apiLimiter);

// Use raw body for Stripe webhook, JSON for everything else
app.use((req, res, next) => {
  if (req.path === '/api/v1/stripe/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// API Routes
const apiRouter = express.Router();
apiRouter.use('/stripe', stripeRoutes);
apiRouter.use('/connect', connectRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/appointments', appointmentsRoutes);
apiRouter.use('/provider', providerRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/crypto', cryptoRoutes);
apiRouter.use('/webhooks/supabase', databaseWebhookRoutes);

app.use('/api/v1', apiRouter);

// Health check
app.get('/health', async (_req, res) => {
  let dbStatus = 'unknown';
  try {
    // Use a lightweight auth check to verify Supabase connectivity
    // This doesn't require table-level permissions
    const { error } = await supabase.auth.getSession();
    dbStatus = error ? 'error' : 'connected';
  } catch {
    dbStatus = 'error';
  }
  const monitoring = getMonitoringHealth();

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    monitoring: monitoring.enabled ? 'enabled' : 'disabled',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API Documentation
if (swaggerDocument) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

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

// Auth routes (REMOVED: duplicate weak routes — use /api/v1/auth/* instead)
// The apiRouter versions in auth.routes.ts include validation, security logging,
// user status checks, and MFA support that these duplicates lacked.

// User profile routes
app.get(
  '/profile',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const profile = await apiServices.userProfilesService.getById(user.id);
    res.json({ success: true, data: profile });
  })
);

app.patch(
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

// Provider routes (authenticated — protects provider data exposure)
app.get(
  '/providers',
  authenticateToken,
  asyncHandler(async (_req: Request, res: Response) => {
    const providers = await apiServices.providersService.getAll();
    res.json({ success: true, data: providers });
  })
);

app.get(
  '/providers/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await apiServices.providersService.getById(String(req.params.id));
    res.json({ success: true, data: provider });
  })
);

app.get(
  '/providers/specialty/:specialty',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const providers = await apiServices.providersService.getBySpecialty(
      String(req.params.specialty)
    );
    res.json({ success: true, data: providers });
  })
);

// Patient routes (requires auth + IDOR protection)
app.get(
  '/patients',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    // Admins can list all; others only see their own patient record
    const userRole = (req as AuthReqWithProfile).userProfile?.role;
    if (userRole === 'admin') {
      const patients = await apiServices.patientsService.getAll();
      return res.json({ success: true, data: patients });
    }
    const patient = await apiServices.patientsService.getById(user.id);
    res.json({ success: true, data: patient ? [patient] : [] });
  })
);

app.get(
  '/patients/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const patientId = String(req.params.id);
    // IDOR protection: users can only access their own patient record (admins/providers exempt)
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

// Appointment routes (with IDOR protection)
app.get(
  '/appointments/patient/:patientId',
  authenticateToken,
  validateParams(patientIdParams),
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const patientId = String(req.params.patientId);
    const userRole = (req as AuthReqWithProfile).userProfile?.role;
    if (userRole !== 'admin' && userRole !== 'provider' && user.id !== patientId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const appointments = await apiServices.appointmentsService.getByPatient(patientId);
    res.json({ success: true, data: appointments });
  })
);

app.get(
  '/appointments/provider/:providerId',
  authenticateToken,
  validateParams(providerIdParams),
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const providerId = String(req.params.providerId);
    const userRole = (req as AuthReqWithProfile).userProfile?.role;
    if (userRole !== 'admin' && user.id !== providerId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const appointments = await apiServices.appointmentsService.getByProvider(providerId);
    res.json({ success: true, data: appointments });
  })
);

app.post(
  '/appointments',
  authenticateToken,
  apiLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const appointment = await apiServices.appointmentsService.create(req.body);
    res.status(201).json({ success: true, data: appointment });
  })
);

app.patch(
  '/appointments/:id/status',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const appointment = await apiServices.appointmentsService.updateStatus(
      String(req.params.id),
      status
    );
    res.json({ success: true, data: appointment });
  })
);

// Transaction routes
app.post(
  '/transactions/by-patient',
  authenticateToken,
  apiLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId } = req.body;
    const transactions = await apiServices.transactionsService.getByPatient(String(patientId));
    res.json({ success: true, data: transactions });
  })
);

app.post(
  '/transactions/by-provider',
  authenticateToken,
  apiLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { providerId } = req.body;
    const transactions = await apiServices.transactionsService.getByProvider(String(providerId));
    res.json({ success: true, data: transactions });
  })
);

app.post(
  '/transactions',
  authenticateToken,
  paymentLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const transaction = await apiServices.transactionsService.create(req.body);
    res.status(201).json({ success: true, data: transaction });
  })
);

// Invoice routes (with IDOR protection)
app.get(
  '/invoices/patient/:patientId',
  authenticateToken,
  validateParams(patientIdParams),
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const patientId = String(req.params.patientId);
    const userRole = (req as AuthReqWithProfile).userProfile?.role;
    if (userRole !== 'admin' && userRole !== 'provider' && user.id !== patientId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const invoices = await apiServices.invoicesService.getByPatient(patientId);
    res.json({ success: true, data: invoices });
  })
);

app.get(
  '/invoices/provider/:providerId',
  authenticateToken,
  validateParams(providerIdParams),
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const providerId = String(req.params.providerId);
    const userRole = (req as AuthReqWithProfile).userProfile?.role;
    if (userRole !== 'admin' && user.id !== providerId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const invoices = await apiServices.invoicesService.getByProvider(providerId);
    res.json({ success: true, data: invoices });
  })
);

app.post(
  '/invoices',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await apiServices.invoicesService.create(req.body);
    res.status(201).json({ success: true, data: invoice });
  })
);

app.patch(
  '/invoices/:id/status',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const invoice = await apiServices.invoicesService.updateStatus(String(req.params.id), status);
    res.json({ success: true, data: invoice });
  })
);

// Notification routes
app.get(
  '/notifications',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const notifications = await apiServices.notificationsService.getUnread(user.id);
    res.json({ success: true, data: notifications });
  })
);

app.patch(
  '/notifications/:id/read',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const notification = await apiServices.notificationsService.markAsRead(String(req.params.id));
    res.json({ success: true, data: notification });
  })
);

// Dispute routes
app.get(
  '/disputes',
  authenticateToken,
  asyncHandler(async (_req: Request, res: Response) => {
    const disputes = await apiServices.disputesService.getAll();
    res.json({ success: true, data: disputes });
  })
);

app.get(
  '/disputes/:id',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    const dispute = await apiServices.disputesService.getById(String(req.params.id));
    res.json({ success: true, data: dispute });
  })
);

app.post(
  '/disputes',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const dispute = await apiServices.disputesService.create(req.body);
    res.status(201).json({ success: true, data: dispute });
  })
);

// Webhook routes
app.get(
  '/webhooks',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const webhooks = await apiServices.webhooksService.getByUser(user.id);
    res.json({ success: true, data: webhooks });
  })
);

app.post(
  '/webhooks',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const webhook = await apiServices.webhooksService.create({ ...req.body, user_id: user.id });
    res.status(201).json({ success: true, data: webhook });
  })
);

app.delete(
  '/webhooks/:id',
  authenticateToken,
  validateParams(idParams),
  asyncHandler(async (req: Request, res: Response) => {
    await apiServices.webhooksService.delete(String(req.params.id));
    res.status(204).send();
  })
);

// API Keys routes
app.get(
  '/api-keys',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const apiKeys = await apiServices.apiKeysService.getByUser(user.id);
    res.json({ success: true, data: apiKeys });
  })
);

app.post(
  '/api-keys',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    const apiKey = await apiServices.apiKeysService.create({ ...req.body, user_id: user.id });
    res.status(201).json({ success: true, data: apiKey });
  })
);

app.delete(
  '/api-keys/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    await apiServices.apiKeysService.revoke(String(req.params.id));
    res.status(204).send();
  })
);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Sentry error handler (must be before general error handler)
app.use(sentryErrorHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Healthcare API started`, {
    port: PORT,
    env: env.NODE_ENV,
    docsUrl: `http://localhost:${PORT}/docs`,
  });
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

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
