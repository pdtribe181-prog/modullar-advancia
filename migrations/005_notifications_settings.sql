-- Migration 005: Notifications and Settings
-- Run this FIFTH

-- Notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  notification_type notification_type NOT NULL,
  priority notification_priority DEFAULT 'medium'::notification_priority,
  title text NOT NULL,
  message text NOT NULL,
  read_status notification_read_status DEFAULT 'unread'::notification_read_status,
  related_transaction_id uuid,
  related_resource_type text,
  related_resource_id uuid,
  action_url text,
  action_label text,
  metadata jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  archived_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT notifications_related_transaction_id_fkey FOREIGN KEY (related_transaction_id) REFERENCES public.transactions(id)
);

-- Notification Preferences
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email_payment_alerts boolean DEFAULT true,
  email_compliance_notifications boolean DEFAULT true,
  email_system_updates boolean DEFAULT true,
  email_transaction_updates boolean DEFAULT true,
  email_security_alerts boolean DEFAULT true,
  inapp_payment_alerts boolean DEFAULT true,
  inapp_compliance_notifications boolean DEFAULT true,
  inapp_system_updates boolean DEFAULT true,
  inapp_transaction_updates boolean DEFAULT true,
  inapp_security_alerts boolean DEFAULT true,
  digest_frequency text DEFAULT 'realtime'::text,
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time without time zone,
  quiet_hours_end time without time zone,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Email Settings
CREATE TABLE public.email_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  transaction_confirmations boolean DEFAULT true,
  invoice_alerts boolean DEFAULT true,
  payment_reminders boolean DEFAULT true,
  platform_updates boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_settings_pkey PRIMARY KEY (id),
  CONSTRAINT email_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Email History
CREATE TABLE public.email_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_id text,
  template_id uuid,
  recipient text NOT NULL,
  subject text NOT NULL,
  status email_status DEFAULT 'pending'::email_status,
  error_message text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_history_pkey PRIMARY KEY (id),
  CONSTRAINT email_history_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id)
);

-- Brand Customization
CREATE TABLE public.brand_customization (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#0d9488'::text,
  secondary_color text DEFAULT '#2563eb'::text,
  accent_color text DEFAULT '#14b8a6'::text,
  font_family text DEFAULT 'Plus Jakarta Sans'::text,
  custom_css text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT brand_customization_pkey PRIMARY KEY (id),
  CONSTRAINT brand_customization_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Organization Settings
CREATE TABLE public.organization_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_name text NOT NULL,
  organization_email text,
  organization_phone text,
  organization_address text,
  organization_website text,
  tax_id text,
  business_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT organization_settings_pkey PRIMARY KEY (id),
  CONSTRAINT organization_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Payment Preferences
CREATE TABLE public.payment_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  default_currency text DEFAULT 'USD'::text,
  default_payment_method text,
  settlement_schedule text DEFAULT 'Daily'::text,
  auto_reconciliation boolean DEFAULT true,
  payment_confirmation_email boolean DEFAULT true,
  invoice_auto_send boolean DEFAULT false,
  late_payment_reminders boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT payment_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT payment_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Settings Activity Log
CREATE TABLE public.settings_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  setting_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT settings_activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT settings_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Team Invitations
CREATE TABLE public.team_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid,
  role user_role DEFAULT 'patient'::user_role,
  status invitation_status DEFAULT 'pending'::invitation_status,
  invitation_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  declined_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT team_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT team_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.user_profiles(id)
);
