-- Migration 007: Provider Onboarding Tables
-- Run this SEVENTH

-- Provider Onboarding
CREATE TABLE public.provider_onboarding (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  onboarding_status onboarding_status DEFAULT 'pending'::onboarding_status,
  documents_submitted boolean DEFAULT false,
  documents_verified boolean DEFAULT false,
  background_check_status verification_status DEFAULT 'not_started'::verification_status,
  license_verification_status verification_status DEFAULT 'not_started'::verification_status,
  compliance_verification_status verification_status DEFAULT 'not_started'::verification_status,
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  rejection_reason text,
  reviewer_id uuid,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT provider_onboarding_pkey PRIMARY KEY (id),
  CONSTRAINT provider_onboarding_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_onboarding_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.user_profiles(id)
);

-- Provider Documents
CREATE TABLE public.provider_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  document_type document_status NOT NULL,
  document_name text NOT NULL,
  file_url text,
  file_size integer,
  mime_type text,
  status document_status DEFAULT 'pending_upload'::document_status,
  uploaded_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  expiry_date date,
  rejection_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT provider_documents_pkey PRIMARY KEY (id),
  CONSTRAINT provider_documents_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT provider_documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id)
);

-- Provider Notes
CREATE TABLE public.provider_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  created_by uuid NOT NULL,
  note_type text DEFAULT 'general'::text,
  content text NOT NULL,
  is_internal boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT provider_notes_pkey PRIMARY KEY (id),
  CONSTRAINT provider_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id),
  CONSTRAINT provider_notes_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Provider Compliance Records
CREATE TABLE public.provider_compliance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  compliance_type text NOT NULL,
  status text NOT NULL,
  last_check_date date,
  next_check_date date,
  compliance_score numeric,
  findings_count integer DEFAULT 0,
  critical_findings integer DEFAULT 0,
  auditor_name text,
  certificate_url text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT provider_compliance_records_pkey PRIMARY KEY (id),
  CONSTRAINT provider_compliance_records_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Provider Payment Volumes
CREATE TABLE public.provider_payment_volumes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_transactions integer DEFAULT 0,
  successful_transactions integer DEFAULT 0,
  failed_transactions integer DEFAULT 0,
  total_volume numeric DEFAULT 0.00,
  average_transaction_value numeric DEFAULT 0.00,
  currency text DEFAULT 'INR'::text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT provider_payment_volumes_pkey PRIMARY KEY (id),
  CONSTRAINT provider_payment_volumes_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Provider Performance Metrics
CREATE TABLE public.provider_performance_metrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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

-- Onboarding Workflow Steps
CREATE TABLE public.onboarding_workflow_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  step_status onboarding_step_status DEFAULT 'not_started'::onboarding_step_status,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT onboarding_workflow_steps_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_workflow_steps_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Guided Onboarding Progress
CREATE TABLE public.guided_onboarding_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL UNIQUE,
  current_step integer NOT NULL DEFAULT 1,
  total_steps integer NOT NULL DEFAULT 4,
  completion_percentage integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  last_activity_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT guided_onboarding_progress_pkey PRIMARY KEY (id),
  CONSTRAINT guided_onboarding_progress_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Onboarding Checklist Items
CREATE TABLE public.onboarding_checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  item_category text NOT NULL,
  item_title text NOT NULL,
  item_description text,
  is_required boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completion_percentage integer DEFAULT 0,
  sort_order integer NOT NULL,
  depends_on_item_id uuid,
  completed_at timestamp with time zone,
  completed_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT onboarding_checklist_items_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_checklist_items_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT onboarding_checklist_items_depends_on_item_id_fkey FOREIGN KEY (depends_on_item_id) REFERENCES public.onboarding_checklist_items(id),
  CONSTRAINT onboarding_checklist_items_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES auth.users(id)
);

-- Onboarding Team Invitations
CREATE TABLE public.onboarding_team_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'provider'::text, 'patient'::text, 'staff'::text])),
  invitation_token text NOT NULL UNIQUE,
  invited_by uuid,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])),
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT onboarding_team_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_team_invitations_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT onboarding_team_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id)
);

-- Onboarding Email Log
CREATE TABLE public.onboarding_email_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  email_id text,
  status text DEFAULT 'sent'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT onboarding_email_log_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_email_log_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Go Live Checklist
CREATE TABLE public.go_live_checklist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  checklist_item text NOT NULL,
  category text NOT NULL,
  is_required boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  completed_by uuid,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT go_live_checklist_pkey PRIMARY KEY (id),
  CONSTRAINT go_live_checklist_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT go_live_checklist_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.user_profiles(id)
);

-- Bank Connection Setup
CREATE TABLE public.bank_connection_setup (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  connection_type text NOT NULL CHECK (connection_type = ANY (ARRAY['bank_account'::text, 'digital_wallet'::text, 'card'::text])),
  connection_status text NOT NULL DEFAULT 'not_started'::text CHECK (connection_status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'connected'::text, 'verification_pending'::text, 'verified'::text, 'failed'::text])),
  account_holder_name text,
  account_last4 text,
  bank_name text,
  routing_number text,
  wallet_address text,
  wallet_type text,
  verification_method text,
  verification_attempts integer DEFAULT 0,
  verified_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bank_connection_setup_pkey PRIMARY KEY (id),
  CONSTRAINT bank_connection_setup_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Bank Wallet Verification
CREATE TABLE public.bank_wallet_verification (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  account_type text NOT NULL,
  account_holder_name text NOT NULL,
  account_number_last4 text,
  routing_number text,
  bank_name text,
  wallet_address text,
  wallet_type text,
  verification_status bank_verification_status DEFAULT 'not_started'::bank_verification_status,
  verification_method text,
  micro_deposit_amount1 numeric,
  micro_deposit_amount2 numeric,
  verification_attempts integer DEFAULT 0,
  verified_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT bank_wallet_verification_pkey PRIMARY KEY (id),
  CONSTRAINT bank_wallet_verification_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Compliance Verification Steps
CREATE TABLE public.compliance_verification_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  verification_type text NOT NULL,
  verification_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'verified'::text, 'failed'::text, 'expired'::text])),
  required boolean DEFAULT true,
  verification_data jsonb DEFAULT '{}'::jsonb,
  verified_at timestamp with time zone,
  verified_by uuid,
  expires_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT compliance_verification_steps_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_verification_steps_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT compliance_verification_steps_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id)
);
