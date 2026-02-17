-- Migration 009: Analytics, Monitoring, and Reporting Tables
-- Run this NINTH

-- Advanced Analytics Reports
CREATE TABLE public.advanced_analytics_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_name text NOT NULL,
  report_type text NOT NULL,
  description text,
  data_sources text[],
  query_config jsonb DEFAULT '{}'::jsonb,
  visualization_config jsonb DEFAULT '{}'::jsonb,
  schedule_frequency text CHECK (schedule_frequency = ANY (ARRAY['realtime'::text, 'hourly'::text, 'daily'::text, 'weekly'::text, 'monthly'::text, 'on_demand'::text])),
  is_active boolean DEFAULT true,
  last_generated_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT advanced_analytics_reports_pkey PRIMARY KEY (id),
  CONSTRAINT advanced_analytics_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- Analytics Insights
CREATE TABLE public.analytics_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  insight_category text NOT NULL,
  insight_title text NOT NULL,
  insight_description text NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 100),
  impact_level text CHECK (impact_level = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text])),
  recommended_actions jsonb DEFAULT '[]'::jsonb,
  data_points jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'reviewed'::text, 'actioned'::text, 'dismissed'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT analytics_insights_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_insights_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id)
);

-- Anomaly Alerts
CREATE TABLE public.anomaly_alerts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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

-- System Performance Metrics
CREATE TABLE public.system_performance_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  threshold_warning numeric,
  threshold_critical numeric,
  status text DEFAULT 'normal'::text CHECK (status = ANY (ARRAY['normal'::text, 'warning'::text, 'critical'::text])),
  component text,
  metadata jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT system_performance_metrics_pkey PRIMARY KEY (id)
);

-- Performance Alerts
CREATE TABLE public.performance_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text])),
  alert_message text NOT NULL,
  metric_id uuid,
  component text,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'acknowledged'::text, 'resolved'::text, 'muted'::text])),
  acknowledged_by uuid,
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT performance_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT performance_alerts_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.system_performance_metrics(id),
  CONSTRAINT performance_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.user_profiles(id)
);

-- Transaction Flow Metrics
CREATE TABLE public.transaction_flow_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  time_bucket timestamp with time zone NOT NULL,
  total_transactions integer DEFAULT 0,
  successful_transactions integer DEFAULT 0,
  failed_transactions integer DEFAULT 0,
  pending_transactions integer DEFAULT 0,
  total_volume numeric DEFAULT 0,
  average_transaction_time_ms integer,
  peak_transactions_per_minute integer,
  fraud_alerts_triggered integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT transaction_flow_metrics_pkey PRIMARY KEY (id)
);

-- Integration Health Checks
CREATE TABLE public.integration_health_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  integration_name text NOT NULL,
  integration_type text NOT NULL,
  endpoint_url text,
  check_frequency_minutes integer DEFAULT 5,
  last_check_at timestamp with time zone,
  next_check_at timestamp with time zone,
  status text DEFAULT 'unknown'::text CHECK (status = ANY (ARRAY['healthy'::text, 'degraded'::text, 'down'::text, 'unknown'::text])),
  response_time_ms integer,
  success_rate numeric,
  consecutive_failures integer DEFAULT 0,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT integration_health_checks_pkey PRIMARY KEY (id)
);

-- Integration Health Logs
CREATE TABLE public.integration_health_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  integration_id uuid,
  check_status text NOT NULL CHECK (check_status = ANY (ARRAY['success'::text, 'failure'::text, 'timeout'::text, 'error'::text])),
  response_time_ms integer,
  status_code integer,
  error_message text,
  request_details jsonb DEFAULT '{}'::jsonb,
  response_details jsonb DEFAULT '{}'::jsonb,
  checked_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT integration_health_logs_pkey PRIMARY KEY (id),
  CONSTRAINT integration_health_logs_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.integration_health_checks(id)
);

-- Report Templates
CREATE TABLE public.report_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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

-- Saved Reports
CREATE TABLE public.saved_reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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

-- Data Backup Schedules
CREATE TABLE public.data_backup_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  backup_name text NOT NULL,
  backup_type text NOT NULL CHECK (backup_type = ANY (ARRAY['full'::text, 'incremental'::text, 'differential'::text])),
  schedule_frequency text NOT NULL CHECK (schedule_frequency = ANY (ARRAY['hourly'::text, 'daily'::text, 'weekly'::text, 'monthly'::text])),
  schedule_time text,
  target_tables text[],
  retention_days integer DEFAULT 30,
  is_active boolean DEFAULT true,
  last_backup_at timestamp with time zone,
  next_backup_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT data_backup_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT data_backup_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- Data Backup Logs
CREATE TABLE public.data_backup_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  schedule_id uuid,
  backup_status text DEFAULT 'initiated'::text CHECK (backup_status = ANY (ARRAY['initiated'::text, 'in_progress'::text, 'completed'::text, 'failed'::text, 'partial'::text])),
  backup_size_mb numeric,
  backup_location text,
  records_backed_up integer,
  error_message text,
  backup_duration_ms integer,
  started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp with time zone,
  CONSTRAINT data_backup_logs_pkey PRIMARY KEY (id),
  CONSTRAINT data_backup_logs_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.data_backup_schedules(id)
);
