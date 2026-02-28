-- Migration 054: Seed Demo Providers, Subscription Plans & Default Security Preferences
-- Provides demo data for testing and production-ready default configuration

BEGIN;

-- ============================================================
-- 1. TEST PROVIDER ACCOUNTS (for demo / staging)
-- ============================================================

DO $$
DECLARE
  demo_provider1_id UUID := gen_random_uuid();
  demo_provider2_id UUID := gen_random_uuid();
  demo_provider3_id UUID := gen_random_uuid();
BEGIN

-- Demo provider user profiles
INSERT INTO public.user_profiles (id, email, full_name, role, is_active, phone) VALUES
  (demo_provider1_id, 'demo.dermatology@advanciapayledger.com', 'Dr. Emily Carter', 'provider', true, '+1-555-0301'),
  (demo_provider2_id, 'demo.orthopedics@advanciapayledger.com', 'Dr. James Wright', 'provider', true, '+1-555-0302'),
  (demo_provider3_id, 'demo.pediatrics@advanciapayledger.com',  'Dr. Aisha Patel',  'provider', true, '+1-555-0303')
ON CONFLICT (id) DO NOTHING;

-- Demo providers
INSERT INTO public.providers (id, user_id, specialty, license_number, years_of_experience, consultation_fee, bio, rating, education, certifications, available_days, available_hours) VALUES
  (gen_random_uuid(), demo_provider1_id, 'Dermatology', 'MD-DEMO-001', 12, 175.00,
   'Board-certified dermatologist specializing in cosmetic and medical dermatology. Demo account for testing.',
   4.7,
   '[{"degree": "MD", "institution": "Stanford University School of Medicine", "year": 2014}]'::jsonb,
   '["ABD Board Certified", "Fellowship Trained"]'::jsonb,
   '["Monday", "Tuesday", "Wednesday", "Thursday"]'::jsonb,
   '{"start": "09:00", "end": "17:00"}'::jsonb),

  (gen_random_uuid(), demo_provider2_id, 'Orthopedics', 'MD-DEMO-002', 20, 250.00,
   'Orthopedic surgeon with two decades of experience in sports medicine. Demo account for testing.',
   4.9,
   '[{"degree": "MD", "institution": "Mayo Clinic Alix School of Medicine", "year": 2006}]'::jsonb,
   '["ABOS Board Certified", "Sports Medicine Fellowship"]'::jsonb,
   '["Monday", "Wednesday", "Friday"]'::jsonb,
   '{"start": "08:00", "end": "16:00"}'::jsonb),

  (gen_random_uuid(), demo_provider3_id, 'Pediatrics', 'MD-DEMO-003', 8, 125.00,
   'Pediatrician focused on preventive care and child development. Demo account for testing.',
   4.8,
   '[{"degree": "MD", "institution": "Johns Hopkins", "year": 2018}]'::jsonb,
   '["ABP Board Certified"]'::jsonb,
   '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
   '{"start": "08:30", "end": "17:30"}'::jsonb)
ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- 2. SUBSCRIPTION PLANS (recurring_billing templates)
-- ============================================================

-- Create a subscription_plans reference table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_frequency TEXT DEFAULT 'monthly' CHECK (billing_frequency IN ('monthly', 'yearly')),
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 0,
  max_providers INTEGER,
  max_patients INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active plans
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Anyone can view active plans') THEN
    CREATE POLICY "Anyone can view active plans"
      ON public.subscription_plans FOR SELECT
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Service role manages plans') THEN
    CREATE POLICY "Service role manages plans"
      ON public.subscription_plans FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Seed subscription plans
INSERT INTO public.subscription_plans (name, description, price, billing_frequency, features, trial_days, max_providers, max_patients) VALUES
  ('Starter',
   'Perfect for solo practitioners getting started with digital payments.',
   29.00, 'monthly',
   '["Up to 50 patients", "Basic payment processing", "Email notifications", "Standard support"]'::jsonb,
   14, 1, 50),

  ('Professional',
   'For growing practices that need advanced features and more capacity.',
   79.00, 'monthly',
   '["Up to 500 patients", "Advanced payment processing", "SMS + Email notifications", "Priority support", "Custom invoicing", "Analytics dashboard", "HIPAA audit logs"]'::jsonb,
   14, 5, 500),

  ('Enterprise',
   'Full-featured solution for multi-provider organizations and health systems.',
   199.00, 'monthly',
   '["Unlimited patients", "Full payment suite", "All notifications", "Dedicated support", "Custom invoicing", "Advanced analytics", "HIPAA audit logs", "API access", "White-label options", "Multi-location support"]'::jsonb,
   30, NULL, NULL),

  ('Starter Annual',
   'Starter plan billed annually — save 17%.',
   290.00, 'yearly',
   '["Up to 50 patients", "Basic payment processing", "Email notifications", "Standard support"]'::jsonb,
   14, 1, 50),

  ('Professional Annual',
   'Professional plan billed annually — save 17%.',
   790.00, 'yearly',
   '["Up to 500 patients", "Advanced payment processing", "SMS + Email notifications", "Priority support", "Custom invoicing", "Analytics dashboard", "HIPAA audit logs"]'::jsonb,
   14, 5, 500)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. DEFAULT SECURITY PREFERENCES
-- ============================================================

-- Ensure all existing user profiles have security_preferences set
UPDATE public.user_profiles
SET security_preferences = '{
  "emailNotifications": true,
  "smsNotifications": false,
  "notifyOnLogin": false,
  "notifyOnPasswordChange": true,
  "notifyOnEmailChange": true,
  "notifyOnNewDevice": true
}'::jsonb
WHERE security_preferences IS NULL;

-- Create a system_settings table for platform-wide defaults if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.user_profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Admins can read settings') THEN
    CREATE POLICY "Admins can read settings"
      ON public.system_settings FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
        OR auth.role() = 'service_role'
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Service role manages settings') THEN
    CREATE POLICY "Service role manages settings"
      ON public.system_settings FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Seed default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('security.default_preferences', '{
    "emailNotifications": true,
    "smsNotifications": false,
    "notifyOnLogin": false,
    "notifyOnPasswordChange": true,
    "notifyOnEmailChange": true,
    "notifyOnNewDevice": true
  }'::jsonb, 'Default security preference template for new users'),

  ('security.password_policy', '{
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumber": true,
    "requireSpecialChar": false,
    "maxAge": 90,
    "preventReuse": 5
  }'::jsonb, 'Password complexity requirements'),

  ('security.session_policy', '{
    "maxConcurrentSessions": 5,
    "sessionTimeout": 3600,
    "refreshTokenTTL": 604800,
    "mfaRequired": false,
    "mfaRequiredForAdmin": true
  }'::jsonb, 'Session management policy'),

  ('platform.payment_settings', '{
    "currency": "USD",
    "minPaymentAmount": 1.00,
    "maxPaymentAmount": 50000.00,
    "platformFeePercent": 2.9,
    "platformFeeFixed": 0.30,
    "payoutSchedule": "daily",
    "refundWindowDays": 30
  }'::jsonb, 'Payment processing defaults'),

  ('platform.notification_settings', '{
    "appointmentReminderHours": 24,
    "paymentReceiptEnabled": true,
    "marketingOptInDefault": false,
    "maxSmsPerDay": 10,
    "maxEmailPerDay": 50
  }'::jsonb, 'Notification system defaults')
ON CONFLICT (key) DO NOTHING;

-- Index for system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans for provider accounts';
COMMENT ON TABLE public.system_settings IS 'Platform-wide configuration and default settings';

COMMIT;
