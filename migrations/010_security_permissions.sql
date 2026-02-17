-- Migration 010: Security, Permissions, and Incident Management Tables
-- Run this TENTH (FINAL)

-- User Permissions
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  permission permission_type NOT NULL,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id)
);

-- User Role Assignments
CREATE TABLE public.user_role_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  custom_role_id uuid,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_role_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT user_role_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT user_role_assignments_custom_role_id_fkey FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id),
  CONSTRAINT user_role_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.user_profiles(id)
);

-- Transaction Permissions
CREATE TABLE public.transaction_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  custom_role_id uuid,
  transaction_type transaction_type NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  can_export boolean DEFAULT false,
  restrictions jsonb DEFAULT '{}'::jsonb,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT transaction_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT transaction_permissions_custom_role_id_fkey FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id),
  CONSTRAINT transaction_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id)
);

-- Role Permission Templates
CREATE TABLE public.role_permission_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  custom_role_id uuid,
  transaction_type transaction_type NOT NULL,
  default_permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_permission_templates_pkey PRIMARY KEY (id),
  CONSTRAINT role_permission_templates_custom_role_id_fkey FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id)
);

-- Security Threat Logs
CREATE TABLE public.security_threat_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  threat_type text NOT NULL,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text])),
  source_ip text,
  user_id uuid,
  resource_type text,
  resource_id uuid,
  threat_description text NOT NULL,
  detection_method text NOT NULL,
  status text DEFAULT 'detected'::text CHECK (status = ANY (ARRAY['detected'::text, 'investigating'::text, 'mitigated'::text, 'resolved'::text, 'false_positive'::text])),
  mitigation_action text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT security_threat_logs_pkey PRIMARY KEY (id),
  CONSTRAINT security_threat_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT security_threat_logs_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.user_profiles(id)
);

-- Risk Detections
CREATE TABLE public.risk_detections (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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

-- Incident Responses
CREATE TABLE public.incident_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_type incident_type NOT NULL,
  severity incident_severity NOT NULL,
  status incident_status DEFAULT 'open'::incident_status,
  title text NOT NULL,
  description text,
  affected_systems text[],
  assigned_to uuid,
  reported_by uuid,
  source_alert_id uuid,
  source_alert_type text,
  impact_assessment text,
  mitigation_steps text,
  resolution_notes text,
  detected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT incident_responses_pkey PRIMARY KEY (id),
  CONSTRAINT incident_responses_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id),
  CONSTRAINT incident_responses_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.user_profiles(id)
);

-- Incident Activity Logs
CREATE TABLE public.incident_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid,
  user_id uuid,
  action_type text NOT NULL,
  action_description text NOT NULL,
  previous_status incident_status,
  new_status incident_status,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT incident_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT incident_activity_logs_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incident_responses(id),
  CONSTRAINT incident_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- MIGRATION COMPLETE
-- Your Supabase database schema is now fully deployed!
