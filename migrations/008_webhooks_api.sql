-- Migration 008: Webhooks, API, and Developer Portal Tables
-- Run this EIGHTH

-- Webhook Events
CREATE TABLE public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  webhook_id uuid,
  event_type webhook_event_type NOT NULL,
  payload jsonb NOT NULL,
  triggered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT webhook_events_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_events_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id)
);

-- Webhook Delivery Logs
CREATE TABLE public.webhook_delivery_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  webhook_id uuid,
  webhook_event_id uuid,
  status delivery_status DEFAULT 'pending'::delivery_status,
  http_status_code integer,
  request_headers jsonb DEFAULT '{}'::jsonb,
  request_body jsonb,
  response_headers jsonb DEFAULT '{}'::jsonb,
  response_body text,
  error_message text,
  attempt_number integer DEFAULT 1,
  delivered_at timestamp with time zone,
  next_retry_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT webhook_delivery_logs_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_delivery_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id),
  CONSTRAINT webhook_delivery_logs_webhook_event_id_fkey FOREIGN KEY (webhook_event_id) REFERENCES public.webhook_events(id)
);

-- Webhook Retry Policies
CREATE TABLE public.webhook_retry_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  webhook_id uuid,
  max_attempts integer DEFAULT 3,
  retry_strategy retry_strategy DEFAULT 'exponential'::retry_strategy,
  initial_delay_seconds integer DEFAULT 60,
  max_delay_seconds integer DEFAULT 3600,
  backoff_multiplier numeric DEFAULT 2.0,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT webhook_retry_policies_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_retry_policies_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id)
);

-- Webhook Settings
CREATE TABLE public.webhook_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  webhook_id uuid,
  retry_attempts integer DEFAULT 3,
  retry_delay_seconds integer DEFAULT 60,
  signature_secret text,
  custom_headers jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT webhook_settings_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT webhook_settings_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id)
);

-- Webhook Test Logs
CREATE TABLE public.webhook_test_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  test_name text NOT NULL,
  webhook_url text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  headers jsonb DEFAULT '{}'::jsonb,
  response_status integer,
  response_body text,
  response_time_ms integer,
  is_successful boolean DEFAULT false,
  error_message text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT webhook_test_logs_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_test_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Webhook Delivery Attempts
CREATE TABLE public.webhook_delivery_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  webhook_endpoint_id uuid,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text, 'retrying'::text])),
  http_status_code integer,
  request_headers jsonb DEFAULT '{}'::jsonb,
  response_body text,
  error_message text,
  attempt_number integer DEFAULT 1,
  max_attempts integer DEFAULT 3,
  next_retry_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT webhook_delivery_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_delivery_attempts_webhook_endpoint_id_fkey FOREIGN KEY (webhook_endpoint_id) REFERENCES public.webhook_endpoints(id)
);

-- Event Subscriptions
CREATE TABLE public.event_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  webhook_endpoint_id uuid,
  event_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  filter_conditions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT event_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT event_subscriptions_webhook_endpoint_id_fkey FOREIGN KEY (webhook_endpoint_id) REFERENCES public.webhook_endpoints(id)
);

-- API Key Permissions
CREATE TABLE public.api_key_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_key_id uuid,
  permission_name text NOT NULL,
  resource_type text,
  allowed_actions text[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_key_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT api_key_permissions_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id)
);

-- API Key Rotation History
CREATE TABLE public.api_key_rotation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_key_id uuid,
  old_key_prefix text NOT NULL,
  new_key_prefix text NOT NULL,
  rotated_by uuid,
  reason text,
  rotated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT api_key_rotation_history_pkey PRIMARY KEY (id),
  CONSTRAINT api_key_rotation_history_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id),
  CONSTRAINT api_key_rotation_history_rotated_by_fkey FOREIGN KEY (rotated_by) REFERENCES public.user_profiles(id)
);

-- API Usage Logs
CREATE TABLE public.api_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_key_id uuid,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer,
  ip_address text,
  user_agent text,
  request_body jsonb,
  response_body jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT api_usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT api_usage_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id)
);

-- API Documentation Feedback
CREATE TABLE public.api_documentation_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  page_section text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  is_helpful boolean,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT api_documentation_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT api_documentation_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Code Snippet Usage
CREATE TABLE public.code_snippet_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  snippet_id text NOT NULL,
  language text NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY['view'::text, 'copy'::text, 'download'::text])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT code_snippet_usage_pkey PRIMARY KEY (id),
  CONSTRAINT code_snippet_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Developer Portal Analytics
CREATE TABLE public.developer_portal_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  page_visited text NOT NULL,
  time_spent_seconds integer,
  interactions_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT developer_portal_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT developer_portal_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Sandbox Sessions
CREATE TABLE public.sandbox_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_name text NOT NULL,
  endpoint text NOT NULL,
  http_method text NOT NULL CHECK (http_method = ANY (ARRAY['GET'::text, 'POST'::text, 'PUT'::text, 'DELETE'::text, 'PATCH'::text])),
  request_headers jsonb DEFAULT '{}'::jsonb,
  request_body jsonb DEFAULT '{}'::jsonb,
  response_status integer,
  response_body jsonb,
  response_time_ms integer,
  is_successful boolean DEFAULT false,
  error_message text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sandbox_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sandbox_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
