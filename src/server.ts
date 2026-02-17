// Express API Server for Healthcare Platform
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { supabase } from './lib/supabase.js';
import * as apiServices from './services/api.service.js';
import { authService } from './services/auth.service.js';
import stripeRoutes from './routes/stripe.routes.js';
import connectRoutes from './routes/connect.routes.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import providerRoutes from './routes/provider.routes.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.middleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI spec
let swaggerDocument: any;
try {
  const openapiFile = readFileSync('./openapi.yaml', 'utf8');
  swaggerDocument = parse(openapiFile);
} catch (e) {
  console.log('OpenAPI spec not found, /docs will be unavailable');
}

// Middleware
app.use(cors());

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);
app.use('/stripe', apiLimiter);
app.use('/connect', apiLimiter);

// Use raw body for Stripe webhook, JSON for everything else
app.use((req, res, next) => {
  if (req.path === '/stripe/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// Stripe routes
console.log(`📦 Stripe routes loaded: ${stripeRoutes?.stack?.length || 0} routes`);
app.use('/stripe', stripeRoutes);

// Provider Connect routes (onboarding, payouts)
app.use('/connect', connectRoutes);

// Admin dashboard routes
app.use('/admin', adminRoutes);

// Auth routes (login, register, profile)
app.use('/auth', authRoutes);

// Appointments routes (booking, scheduling)
app.use('/appointments', appointmentsRoutes);

// Provider dashboard routes
app.use('/provider', providerRoutes);

// API Documentation
if (swaggerDocument) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Auth middleware
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  (req as any).user = user;
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (with stricter rate limiting)
app.post('/auth/signup', authLimiter, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    const data = await authService.signUp(email, password, fullName, role);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/signin', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await authService.signIn(email, password);
    res.json(data);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/auth/signout', authenticateToken, async (req, res) => {
  try {
    await authService.signOut();
    res.json({ message: 'Signed out successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// User profile routes
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const profile = await apiServices.userProfilesService.getById(user.id);
    res.json(profile);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

app.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const profile = await apiServices.userProfilesService.update(user.id, req.body);
    res.json(profile);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Provider routes
app.get('/providers', async (req, res) => {
  try {
    const providers = await apiServices.providersService.getAll();
    res.json(providers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/providers/:id', async (req, res) => {
  try {
    const provider = await apiServices.providersService.getById(String(req.params.id));
    res.json(provider);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/providers/specialty/:specialty', async (req, res) => {
  try {
    const providers = await apiServices.providersService.getBySpecialty(String(req.params.specialty));
    res.json(providers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Patient routes (requires auth)
app.get('/patients', authenticateToken, async (req, res) => {
  try {
    const patients = await apiServices.patientsService.getAll();
    res.json(patients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/patients/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await apiServices.patientsService.getById(String(req.params.id));
    res.json(patient);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Appointment routes
app.get('/appointments/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const appointments = await apiServices.appointmentsService.getByPatient(String(req.params.patientId));
    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/appointments/provider/:providerId', authenticateToken, async (req, res) => {
  try {
    const appointments = await apiServices.appointmentsService.getByProvider(String(req.params.providerId));
    res.json(appointments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/appointments', authenticateToken, async (req, res) => {
  try {
    const appointment = await apiServices.appointmentsService.create(req.body);
    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/appointments/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await apiServices.appointmentsService.updateStatus(String(req.params.id), status);
    res.json(appointment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Transaction routes
app.get('/transactions/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const transactions = await apiServices.transactionsService.getByPatient(String(req.params.patientId));
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/transactions/provider/:providerId', authenticateToken, async (req, res) => {
  try {
    const transactions = await apiServices.transactionsService.getByProvider(String(req.params.providerId));
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/transactions', authenticateToken, async (req, res) => {
  try {
    const transaction = await apiServices.transactionsService.create(req.body);
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Invoice routes
app.get('/invoices/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const invoices = await apiServices.invoicesService.getByPatient(String(req.params.patientId));
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/invoices/provider/:providerId', authenticateToken, async (req, res) => {
  try {
    const invoices = await apiServices.invoicesService.getByProvider(String(req.params.providerId));
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/invoices', authenticateToken, async (req, res) => {
  try {
    const invoice = await apiServices.invoicesService.create(req.body);
    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/invoices/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await apiServices.invoicesService.updateStatus(String(req.params.id), status);
    res.json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Notification routes
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const notifications = await apiServices.notificationsService.getUnread(user.id);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await apiServices.notificationsService.markAsRead(String(req.params.id));
    res.json(notification);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Dispute routes
app.get('/disputes', authenticateToken, async (req, res) => {
  try {
    const disputes = await apiServices.disputesService.getAll();
    res.json(disputes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/disputes/:id', authenticateToken, async (req, res) => {
  try {
    const dispute = await apiServices.disputesService.getById(String(req.params.id));
    res.json(dispute);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

app.post('/disputes', authenticateToken, async (req, res) => {
  try {
    const dispute = await apiServices.disputesService.create(req.body);
    res.status(201).json(dispute);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Webhook routes
app.get('/webhooks', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const webhooks = await apiServices.webhooksService.getByUser(user.id);
    res.json(webhooks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhooks', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const webhook = await apiServices.webhooksService.create({ ...req.body, user_id: user.id });
    res.status(201).json(webhook);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/webhooks/:id', authenticateToken, async (req, res) => {
  try {
    await apiServices.webhooksService.delete(String(req.params.id));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// API Keys routes
app.get('/api-keys', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const apiKeys = await apiServices.apiKeysService.getByUser(user.id);
    res.json(apiKeys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api-keys', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const apiKey = await apiServices.apiKeysService.create({ ...req.body, user_id: user.id });
    res.status(201).json(apiKey);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    await apiServices.apiKeysService.revoke(String(req.params.id));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Server error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏥 Healthcare API running on http://localhost:${PORT}`);
  console.log(`� API Docs: http://localhost:${PORT}/docs`);
});

export default app;
