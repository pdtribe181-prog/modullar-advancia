-- ============================================================
-- Migration 032: Create Missing Tables
-- ============================================================
-- Same as migrations/032_create_missing_tables.sql
-- Ready to apply via Supabase migration runner
-- ============================================================

BEGIN;

-- ============================================================
-- Required enums (create if they don't exist)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE crypto_transaction_status AS ENUM ('pending', 'confirmed', 'failed', 'expired', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE blockchain_network AS ENUM ('ethereum', 'polygon', 'base', 'arbitrum', 'solana');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_plan_status AS ENUM ('active', 'completed', 'defaulted', 'cancelled', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'denied', 'appealed', 'paid', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- GROUP 1: Tables from base migrations (006-010)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.compliance_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  compliance_type text NOT NULL UNIQUE CHECK (compliance_type = ANY (ARRAY['SOC2'::text, 'HIPAA'::text, 'PCI_DSS'::text])),
  status text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'warning'::text, 'critical'::text, 'pending'::text, 'expired'::text])),
  last_audit_date date,
  next_audit_date date,
  audit_score numeric,
  findings_count integer DEFAULT 0,
  critical_findings integer DEFAULT 0,
  compliance_percentage numeric DEFAULT 100.00,
  auditor_name text,
  certificate_url text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT compliance_status_pkey PRIMARY KEY (id)
);

ALTER TABLE public.compliance_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_compliance_status" ON public.compliance_status
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.compliance_violations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  violation_type text NOT NULL CHECK (violation_type = ANY (ARRAY['data_breach'::text, 'unauthorized_access'::text, 'policy_violation'::text, 'audit_failure'::text, 'encryption_failure'::text, 'retention_violation'::text])),
  compliance_framework text NOT NULL CHECK (compliance_framework = ANY (ARRAY['SOC2'::text, 'HIPAA'::text, 'PCI_DSS'::text, 'GDPR'::text, 'CCPA'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  violation_title text NOT NULL,
  violation_description text NOT NULL,
  affected_user_id uuid,
  affected_resource_type text,
  affected_resource_id uuid,
  violation_timestamp timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'investigating'::text, 'remediation_in_progress'::text, 'resolved'::text, 'reported_to_authorities'::text])),
  assigned_to uuid,
  remediation_plan text,
  remediation_deadline date,
  resolution_notes text,
  resolved_at timestamp with time zone,
  reported_to_authorities boolean DEFAULT false,
  authority_report_date date,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT compliance_violations_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_violations_affected_user_id_fkey FOREIGN KEY (affected_user_id) REFERENCES auth.users(id),
  CONSTRAINT compliance_violations_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
);

ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_compliance_violations" ON public.compliance_violations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.audit_log_exports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  export_type text NOT NULL CHECK (export_type = ANY (ARRAY['csv'::text, 'pdf'::text, 'json'::text])),
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  file_url text,
  file_size_bytes bigint,
  record_count integer,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT audit_log_exports_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

ALTER TABLE public.audit_log_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_exports" ON public.audit_log_exports
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admin_manage_exports" ON public.audit_log_exports
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.provider_performance_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  metric_date date NOT NULL,
  total_transactions integer DEFAULT 0,
  successful_transactions integer DEFAULT 0,
  failed_transactions integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  average_transaction_value numeric DEFAULT 0,
  success_rate numeric DEFAULT 0,
  patient_count integer DEFAULT 0,
  rating_average numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_performance_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT provider_performance_metrics_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

ALTER TABLE public.provider_performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers_view_own_metrics" ON public.provider_performance_metrics
  FOR SELECT TO authenticated
  USING (provider_id = public.get_provider_id() OR public.is_admin());
CREATE POLICY "admin_manage_metrics" ON public.provider_performance_metrics
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  anomaly_type text NOT NULL CHECK (anomaly_type = ANY (ARRAY['transaction_volume'::text, 'access_pattern'::text, 'data_access'::text, 'system_behavior'::text, 'user_activity'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  alert_title text NOT NULL,
  alert_message text NOT NULL,
  baseline_value numeric,
  detected_value numeric,
  deviation_percentage numeric,
  affected_resource_type text,
  affected_resource_id uuid,
  detection_timestamp timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'acknowledged'::text, 'investigating'::text, 'resolved'::text, 'false_positive'::text])),
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  resolution_notes text,
  resolved_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT anomaly_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT anomaly_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id)
);

ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_anomaly_alerts" ON public.anomaly_alerts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  report_type text NOT NULL CHECK (report_type = ANY (ARRAY['payment_trends'::text, 'compliance_audit'::text, 'provider_performance'::text, 'revenue_analysis'::text, 'transaction_summary'::text])),
  configuration jsonb DEFAULT '{}'::jsonb,
  is_system_template boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT report_templates_pkey PRIMARY KEY (id),
  CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_view_templates" ON public.report_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_templates" ON public.report_templates
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.saved_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid,
  report_name text NOT NULL,
  report_type text NOT NULL,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  report_data jsonb,
  generated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saved_reports_pkey PRIMARY KEY (id),
  CONSTRAINT saved_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT saved_reports_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id)
);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_reports" ON public.saved_reports
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "users_manage_own_reports" ON public.saved_reports
  FOR ALL TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.risk_detections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  risk_type text NOT NULL CHECK (risk_type = ANY (ARRAY['security'::text, 'compliance'::text, 'operational'::text, 'financial'::text, 'data_privacy'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  risk_score integer NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  title text NOT NULL,
  description text NOT NULL,
  affected_systems text[],
  detection_source text NOT NULL,
  detection_method text,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'investigating'::text, 'mitigating'::text, 'resolved'::text, 'false_positive'::text])),
  assigned_to uuid,
  resolution_notes text,
  resolved_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT risk_detections_pkey PRIMARY KEY (id),
  CONSTRAINT risk_detections_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
);

ALTER TABLE public.risk_detections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_risk_detections" ON public.risk_detections
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- GROUP 2: Tables from later migrations (019-025)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crypto_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id text NOT NULL,
  charge_code text UNIQUE NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.providers(id),
  appointment_id uuid REFERENCES public.appointments(id),
  amount_usd integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status crypto_transaction_status NOT NULL DEFAULT 'pending',
  hosted_url text NOT NULL,
  addresses jsonb,
  payment_details jsonb,
  metadata jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crypto_transactions_patient_id ON public.crypto_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_provider_id ON public.crypto_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_status ON public.crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_charge_code ON public.crypto_transactions(charge_code);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_created_at ON public.crypto_transactions(created_at DESC);

CREATE OR REPLACE FUNCTION public.update_crypto_transactions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trigger_crypto_transactions_updated_at ON public.crypto_transactions;
CREATE TRIGGER trigger_crypto_transactions_updated_at
  BEFORE UPDATE ON public.crypto_transactions FOR EACH ROW
  EXECUTE FUNCTION public.update_crypto_transactions_updated_at();

ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_view_own_crypto" ON public.crypto_transactions
  FOR SELECT TO authenticated USING (patient_id = public.get_patient_id());
CREATE POLICY "providers_view_own_crypto" ON public.crypto_transactions
  FOR SELECT TO authenticated USING (provider_id = public.get_provider_id());
CREATE POLICY "crypto_transactions_service_all" ON public.crypto_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin_manage_crypto" ON public.crypto_transactions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.linked_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  blockchain_network blockchain_network NOT NULL,
  wallet_label text,
  verification_status wallet_verification_status DEFAULT 'pending',
  verification_message text,
  verification_signature text,
  verified_at timestamp with time zone,
  is_primary_payout boolean DEFAULT false,
  payout_enabled boolean DEFAULT false,
  min_payout_amount numeric(12,2) DEFAULT 100.00,
  payout_currency text DEFAULT 'USDC',
  wallet_metadata jsonb DEFAULT '{}'::jsonb,
  last_activity_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT linked_wallets_unique_address_network UNIQUE (wallet_address, blockchain_network),
  CONSTRAINT linked_wallets_valid_address CHECK (
    (blockchain_network IN ('ethereum', 'polygon', 'base', 'arbitrum') AND wallet_address ~ '^0x[a-fA-F0-9]{40}$')
    OR (blockchain_network = 'solana' AND length(wallet_address) BETWEEN 32 AND 44)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_linked_wallets_primary_payout
  ON public.linked_wallets (provider_id) WHERE is_primary_payout = true;
CREATE INDEX IF NOT EXISTS idx_linked_wallets_user_id ON public.linked_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_provider_id ON public.linked_wallets(provider_id);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_address ON public.linked_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_linked_wallets_verification ON public.linked_wallets(verification_status);

ALTER TABLE public.linked_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_wallets" ON public.linked_wallets
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_wallet_id uuid NOT NULL REFERENCES public.linked_wallets(id),
  provider_id uuid NOT NULL REFERENCES public.providers(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('payout', 'refund', 'adjustment')),
  amount numeric(18,8) NOT NULL,
  currency text NOT NULL DEFAULT 'USDC',
  fiat_equivalent numeric(12,2),
  exchange_rate numeric(18,8),
  blockchain_network blockchain_network NOT NULL,
  tx_hash text,
  block_number bigint,
  gas_fee numeric(18,8),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'confirmed', 'failed', 'cancelled')),
  confirmations integer DEFAULT 0,
  required_confirmations integer DEFAULT 12,
  settlement_id uuid,
  invoice_ids uuid[],
  error_message text,
  retry_count integer DEFAULT 0,
  initiated_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(linked_wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider ON public.wallet_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tx_hash ON public.wallet_transactions(tx_hash);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers_view_own_wallet_tx" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (provider_id = public.get_provider_id() OR public.is_admin());
CREATE POLICY "admin_manage_wallet_transactions" ON public.wallet_transactions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.wallet_verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  blockchain_network blockchain_network NOT NULL,
  challenge_message text NOT NULL,
  nonce text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  signature text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '15 minutes'),
  completed_at timestamp with time zone,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wallet_verification_unique_pending UNIQUE (wallet_address, blockchain_network, status)
);

CREATE INDEX IF NOT EXISTS idx_wallet_challenges_address ON public.wallet_verification_challenges(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_challenges_expires ON public.wallet_verification_challenges(expires_at) WHERE status = 'pending';

ALTER TABLE public.wallet_verification_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_manage_own_challenges" ON public.wallet_verification_challenges
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin_view_challenges" ON public.wallet_verification_challenges
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  provider_id uuid REFERENCES public.providers(id),
  linked_wallet_id uuid REFERENCES public.linked_wallets(id),
  action text NOT NULL,
  action_details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  success boolean NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_audit_user ON public.wallet_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_provider ON public.wallet_audit_log(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_audit_created ON public.wallet_audit_log(created_at DESC);

ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_wallet_audit" ON public.wallet_audit_log
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admin_manage_wallet_audit" ON public.wallet_audit_log
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.phi_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  accessed_table text NOT NULL,
  accessed_record_id uuid,
  access_type text NOT NULL CHECK (access_type IN ('view', 'decrypt', 'export')),
  columns_accessed text[],
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phi_access_log_user ON public.phi_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_date ON public.phi_access_log(created_at);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_table ON public.phi_access_log(accessed_table);

ALTER TABLE public.phi_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_view_phi_access_log" ON public.phi_access_log
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "service_insert_phi_access_log" ON public.phi_access_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
  recipient text NOT NULL,
  subject text,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts int DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON public.notification_queue(user_id);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_queue" ON public.notification_queue
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_manage_queue" ON public.notification_queue
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  code text,
  code_type text CHECK (code_type IN ('CPT', 'HCPCS', 'ICD-10', 'custom')),
  default_price numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  duration_minutes integer,
  is_active boolean DEFAULT true,
  requires_authorization boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(code);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_view_active_services" ON public.services
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "admin_manage_services" ON public.services
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "providers_view_all_services" ON public.services
  FOR SELECT TO authenticated USING (public.is_provider());

CREATE TABLE IF NOT EXISTS public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  total_amount numeric(10,2) NOT NULL,
  down_payment numeric(10,2) DEFAULT 0,
  remaining_balance numeric(10,2) NOT NULL,
  installment_amount numeric(10,2) NOT NULL,
  number_of_installments integer NOT NULL,
  installments_paid integer DEFAULT 0,
  frequency payment_frequency DEFAULT 'monthly',
  start_date date NOT NULL,
  end_date date,
  next_payment_date date,
  status payment_plan_status DEFAULT 'active',
  auto_charge boolean DEFAULT false,
  stripe_subscription_id text,
  late_fee_amount numeric(10,2) DEFAULT 0,
  grace_period_days integer DEFAULT 5,
  notes text,
  created_by uuid REFERENCES public.user_profiles(id),
  approved_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_plans_patient ON public.payment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON public.payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_payment_plans_next_payment ON public.payment_plans(next_payment_date);

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_view_own_payment_plans" ON public.payment_plans
  FOR SELECT TO authenticated
  USING (patient_id = public.get_patient_id() OR public.is_admin());
CREATE POLICY "staff_create_payment_plans" ON public.payment_plans
  FOR INSERT TO authenticated WITH CHECK (public.is_provider() OR public.is_admin());
CREATE POLICY "staff_update_payment_plans" ON public.payment_plans
  FOR UPDATE TO authenticated USING (public.is_provider() OR public.is_admin());
CREATE POLICY "staff_view_payment_plans" ON public.payment_plans
  FOR SELECT TO authenticated USING (public.is_provider() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.payment_plan_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id uuid NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id),
  installment_number integer NOT NULL,
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'failed', 'waived')),
  late_fee numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_transactions_plan ON public.payment_plan_transactions(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_transactions_due ON public.payment_plan_transactions(due_date, status);

ALTER TABLE public.payment_plan_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_view_own_plan_tx" ON public.payment_plan_transactions
  FOR SELECT TO authenticated
  USING (
    payment_plan_id IN (
      SELECT id FROM public.payment_plans WHERE patient_id = public.get_patient_id()
    )
    OR public.is_admin()
  );
CREATE POLICY "staff_manage_plan_tx" ON public.payment_plan_transactions
  FOR ALL TO authenticated
  USING (public.is_provider() OR public.is_admin())
  WITH CHECK (public.is_provider() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.claim_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  previous_status claim_status,
  new_status claim_status NOT NULL,
  action text NOT NULL,
  notes text,
  changed_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_history_claim ON public.claim_history(claim_id);

ALTER TABLE public.claim_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_view_own_claim_history" ON public.claim_history
  FOR SELECT TO authenticated
  USING (
    claim_id IN (
      SELECT ic.id FROM public.insurance_claims ic
      WHERE ic.patient_id = public.get_patient_id()
    )
    OR public.is_provider()
    OR public.is_admin()
  );
CREATE POLICY "staff_manage_claim_history" ON public.claim_history
  FOR ALL TO authenticated
  USING (public.is_provider() OR public.is_admin())
  WITH CHECK (public.is_provider() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'login', 'logout', 'password_changed', 'email_changed',
    'phone_changed', 'mfa_enabled', 'mfa_disabled', 'mfa_challenged',
    'recovery_initiated', 'recovery_completed', 'identity_linked',
    'identity_unlinked', 'failed_login', 'suspicious_activity'
  )),
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  location jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_security_events" ON public.security_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "system_insert_security_events" ON public.security_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin_view_all_security_events" ON public.security_events
  FOR SELECT TO authenticated USING (public.is_admin());

COMMIT;
