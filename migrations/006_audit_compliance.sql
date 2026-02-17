-- Migration 006: Audit and Compliance Tables
-- Run this SIXTH

-- Access Audit Logs
CREATE TABLE public.access_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  access_granted boolean DEFAULT true,
  denial_reason text,
  ip_address text,
  user_agent text,
  session_id text,
  request_method text,
  request_path text,
  response_status integer,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT access_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT access_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Compliance Logs
CREATE TABLE public.compliance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  status text DEFAULT 'success'::text,
  error_message text,
  request_method text,
  request_path text,
  response_status integer,
  CONSTRAINT compliance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Compliance Status
CREATE TABLE public.compliance_status (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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

-- Compliance Violations
CREATE TABLE public.compliance_violations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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

-- Compliance Workflow Rules
CREATE TABLE public.compliance_workflow_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  rule_type text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  conditions jsonb DEFAULT '{}'::jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  is_active boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  last_executed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT compliance_workflow_rules_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_workflow_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- Compliance Workflow Executions
CREATE TABLE public.compliance_workflow_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rule_id uuid,
  execution_status text DEFAULT 'pending'::text CHECK (execution_status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'skipped'::text])),
  trigger_data jsonb DEFAULT '{}'::jsonb,
  execution_result jsonb DEFAULT '{}'::jsonb,
  error_message text,
  execution_duration_ms integer,
  executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT compliance_workflow_executions_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_workflow_executions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.compliance_workflow_rules(id)
);

-- Audit Access Controls
CREATE TABLE public.audit_access_controls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  custom_role_id uuid,
  access_level audit_access_level DEFAULT 'none'::audit_access_level,
  can_view_compliance_logs boolean DEFAULT false,
  can_view_user_actions boolean DEFAULT false,
  can_view_system_logs boolean DEFAULT false,
  can_export_audit_data boolean DEFAULT false,
  can_delete_audit_logs boolean DEFAULT false,
  resource_restrictions jsonb DEFAULT '{}'::jsonb,
  time_range_restrictions jsonb DEFAULT '{}'::jsonb,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_access_controls_pkey PRIMARY KEY (id),
  CONSTRAINT audit_access_controls_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT audit_access_controls_custom_role_id_fkey FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id),
  CONSTRAINT audit_access_controls_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id)
);

-- Audit Log Exports
CREATE TABLE public.audit_log_exports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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
