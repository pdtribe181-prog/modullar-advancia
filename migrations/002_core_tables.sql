-- Migration 002: Core Tables (user_profiles, patients, providers)
-- Run this SECOND - these are referenced by other tables

-- User Profiles (references auth.users)
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role user_role DEFAULT 'patient'::user_role,
  phone text,
  avatar_url text,
  stripe_customer_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Patients
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  date_of_birth date,
  gender text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'IN'::text,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_provider text,
  insurance_policy_number text,
  medical_history jsonb DEFAULT '[]'::jsonb,
  allergies jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Providers
CREATE TABLE public.providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  specialty text NOT NULL,
  license_number text NOT NULL UNIQUE,
  years_of_experience integer,
  education jsonb DEFAULT '[]'::jsonb,
  certifications jsonb DEFAULT '[]'::jsonb,
  consultation_fee numeric NOT NULL,
  available_days jsonb DEFAULT '[]'::jsonb,
  available_hours jsonb DEFAULT '{}'::jsonb,
  bio text,
  rating numeric DEFAULT 0.00,
  total_consultations integer DEFAULT 0,
  stripe_account_id text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT providers_pkey PRIMARY KEY (id),
  CONSTRAINT providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Custom Roles
CREATE TABLE public.custom_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_system_role boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT custom_roles_pkey PRIMARY KEY (id),
  CONSTRAINT custom_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- API Keys
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  environment api_environment DEFAULT 'sandbox'::api_environment,
  status api_key_status DEFAULT 'active'::api_key_status,
  permissions jsonb DEFAULT '["read"]'::jsonb,
  rate_limit integer DEFAULT 1000,
  requests_today integer DEFAULT 0,
  total_requests integer DEFAULT 0,
  last_used_at timestamp with time zone,
  last_used_ip text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  key text,
  description text,
  last_rotated_at timestamp with time zone,
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Webhooks
CREATE TABLE public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  url text NOT NULL,
  description text,
  status webhook_status DEFAULT 'active'::webhook_status,
  secret_key text NOT NULL,
  subscribed_events jsonb DEFAULT '[]'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb,
  timeout_seconds integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT webhooks_pkey PRIMARY KEY (id),
  CONSTRAINT webhooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Webhook Endpoints
CREATE TABLE public.webhook_endpoints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  url text NOT NULL,
  description text,
  secret_key text NOT NULL,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'failed'::text])),
  is_verified boolean DEFAULT false,
  verification_token text,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_endpoints_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Email Templates
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type email_template_type NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables jsonb DEFAULT '[]'::jsonb,
  description text,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_templates_pkey PRIMARY KEY (id),
  CONSTRAINT email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);
