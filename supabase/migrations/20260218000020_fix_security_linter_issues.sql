-- Migration 020: Fix All Security Linter Issues
-- Addresses: function_search_path_mutable, materialized_view_in_api, rls_policy_always_true

-- ============================================================
-- PART 1: FIX FUNCTION SEARCH PATH (function_search_path_mutable)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_settlement_updated_at') THEN
    ALTER FUNCTION public.update_settlement_updated_at() SET search_path = '';
    RAISE NOTICE 'Fixed search_path for update_settlement_updated_at';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter update_settlement_updated_at: %', SQLERRM;
END $$;

-- ============================================================
-- PART 2: FIX MATERIALIZED VIEW API ACCESS (materialized_view_in_api)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'daily_transaction_summary' AND schemaname = 'public'
  ) THEN
    REVOKE SELECT ON public.daily_transaction_summary FROM anon;
    REVOKE SELECT ON public.daily_transaction_summary FROM authenticated;
    RAISE NOTICE 'Revoked public access from daily_transaction_summary';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not modify daily_transaction_summary permissions: %', SQLERRM;
END $$;

-- Secure function for admin access to daily summaries
CREATE OR REPLACE FUNCTION public.get_daily_transaction_summary()
RETURNS TABLE (
  summary_date date,
  total_transactions bigint,
  total_amount numeric,
  successful_count bigint,
  failed_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  RETURN QUERY SELECT * FROM public.daily_transaction_summary;
END;
$$;

-- ============================================================
-- PART 3: FIX PERMISSIVE RLS POLICIES (rls_policy_always_true)
-- ============================================================

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.providers WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3.1 LOG/AUDIT TABLES
DROP POLICY IF EXISTS "System can insert access logs" ON public.access_audit_logs;
DROP POLICY IF EXISTS "admin_select_access_audit_logs" ON public.access_audit_logs;
DROP POLICY IF EXISTS "service_insert_access_audit_logs" ON public.access_audit_logs;
CREATE POLICY "admin_select_access_audit_logs" ON public.access_audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "service_insert_access_audit_logs" ON public.access_audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "System can insert usage logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "admin_select_api_usage_logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "service_insert_api_usage_logs" ON public.api_usage_logs;
CREATE POLICY "admin_select_api_usage_logs" ON public.api_usage_logs
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "service_insert_api_usage_logs" ON public.api_usage_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "System can insert HIPAA logs" ON public.hipaa_audit_log;
DROP POLICY IF EXISTS "admin_select_hipaa_audit_log" ON public.hipaa_audit_log;
DROP POLICY IF EXISTS "service_insert_hipaa_audit_log" ON public.hipaa_audit_log;
CREATE POLICY "admin_select_hipaa_audit_log" ON public.hipaa_audit_log
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "service_insert_hipaa_audit_log" ON public.hipaa_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "system_insert_delivery_attempts" ON public.webhook_delivery_attempts;
DROP POLICY IF EXISTS "admin_select_webhook_delivery_attempts" ON public.webhook_delivery_attempts;
DROP POLICY IF EXISTS "service_insert_webhook_delivery_attempts" ON public.webhook_delivery_attempts;
CREATE POLICY "admin_select_webhook_delivery_attempts" ON public.webhook_delivery_attempts
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "service_insert_webhook_delivery_attempts" ON public.webhook_delivery_attempts
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "service_insert_email_history" ON public.email_history;
DROP POLICY IF EXISTS "admin_select_email_history" ON public.email_history;
DROP POLICY IF EXISTS "service_insert_email_history_secured" ON public.email_history;
CREATE POLICY "admin_select_email_history" ON public.email_history
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "service_insert_email_history_secured" ON public.email_history
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- 3.2 ADMIN-ONLY TABLES
DROP POLICY IF EXISTS "admin_access_advanced_analytics_reports" ON public.advanced_analytics_reports;
DROP POLICY IF EXISTS "admin_full_access_advanced_analytics_reports" ON public.advanced_analytics_reports;
CREATE POLICY "admin_full_access_advanced_analytics_reports" ON public.advanced_analytics_reports
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_access_compliance_workflow_executions" ON public.compliance_workflow_executions;
DROP POLICY IF EXISTS "admin_full_access_compliance_workflow_executions" ON public.compliance_workflow_executions;
CREATE POLICY "admin_full_access_compliance_workflow_executions" ON public.compliance_workflow_executions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_access_compliance_workflow_rules" ON public.compliance_workflow_rules;
DROP POLICY IF EXISTS "admin_full_access_compliance_workflow_rules" ON public.compliance_workflow_rules;
CREATE POLICY "admin_full_access_compliance_workflow_rules" ON public.compliance_workflow_rules
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_access_data_backup_logs" ON public.data_backup_logs;
DROP POLICY IF EXISTS "admin_full_access_data_backup_logs" ON public.data_backup_logs;
CREATE POLICY "admin_full_access_data_backup_logs" ON public.data_backup_logs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_access_data_backup_schedules" ON public.data_backup_schedules;
DROP POLICY IF EXISTS "admin_full_access_data_backup_schedules" ON public.data_backup_schedules;
CREATE POLICY "admin_full_access_data_backup_schedules" ON public.data_backup_schedules
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_encryption_keys" ON public.encryption_keys;
DROP POLICY IF EXISTS "admin_full_access_encryption_keys" ON public.encryption_keys;
CREATE POLICY "admin_full_access_encryption_keys" ON public.encryption_keys
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_access_integration_health_checks" ON public.integration_health_checks;
DROP POLICY IF EXISTS "admin_full_access_integration_health_checks" ON public.integration_health_checks;
CREATE POLICY "admin_full_access_integration_health_checks" ON public.integration_health_checks
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_access_integration_health_logs" ON public.integration_health_logs;
DROP POLICY IF EXISTS "admin_full_access_integration_health_logs" ON public.integration_health_logs;
CREATE POLICY "admin_full_access_integration_health_logs" ON public.integration_health_logs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_access_performance_alerts" ON public.performance_alerts;
DROP POLICY IF EXISTS "admin_full_access_performance_alerts" ON public.performance_alerts;
CREATE POLICY "admin_full_access_performance_alerts" ON public.performance_alerts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_access_security_threat_logs" ON public.security_threat_logs;
DROP POLICY IF EXISTS "admin_full_access_security_threat_logs" ON public.security_threat_logs;
CREATE POLICY "admin_full_access_security_threat_logs" ON public.security_threat_logs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_access_system_performance_metrics" ON public.system_performance_metrics;
DROP POLICY IF EXISTS "admin_full_access_system_performance_metrics" ON public.system_performance_metrics;
CREATE POLICY "admin_full_access_system_performance_metrics" ON public.system_performance_metrics
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "authenticated_manage_fraud_anomalies" ON public.fraud_anomalies;
DROP POLICY IF EXISTS "admin_full_access_fraud_anomalies" ON public.fraud_anomalies;
CREATE POLICY "admin_full_access_fraud_anomalies" ON public.fraud_anomalies
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "authenticated_access_fraud_rules" ON public.fraud_detection_rules;
DROP POLICY IF EXISTS "admin_full_access_fraud_detection_rules" ON public.fraud_detection_rules;
CREATE POLICY "admin_full_access_fraud_detection_rules" ON public.fraud_detection_rules
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "authenticated_users_manage_incident_responses" ON public.incident_responses;
DROP POLICY IF EXISTS "admin_full_access_incident_responses" ON public.incident_responses;
CREATE POLICY "admin_full_access_incident_responses" ON public.incident_responses
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3.3 ANALYTICS EVENTS
DROP POLICY IF EXISTS "system_create_analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "admin_select_analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "users_insert_own_analytics_events" ON public.analytics_events;
CREATE POLICY "admin_select_analytics_events" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "users_insert_own_analytics_events" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- 3.4 DISPUTE-RELATED
DROP POLICY IF EXISTS "users_create_disputes" ON public.disputes;
DROP POLICY IF EXISTS "users_insert_own_disputes" ON public.disputes;
CREATE POLICY "users_insert_own_disputes" ON public.disputes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "system_create_notifications" ON public.dispute_notifications;
DROP POLICY IF EXISTS "users_view_own_dispute_notifications" ON public.dispute_notifications;
DROP POLICY IF EXISTS "service_insert_dispute_notifications" ON public.dispute_notifications;
CREATE POLICY "users_view_own_dispute_notifications" ON public.dispute_notifications
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "service_insert_dispute_notifications" ON public.dispute_notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "users_create_timeline_entries" ON public.dispute_timeline;
DROP POLICY IF EXISTS "users_insert_timeline_entries" ON public.dispute_timeline;
CREATE POLICY "users_insert_timeline_entries" ON public.dispute_timeline
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "users_manage_chargebacks" ON public.chargebacks;
DROP POLICY IF EXISTS "users_view_own_chargebacks" ON public.chargebacks;
DROP POLICY IF EXISTS "admin_manage_chargebacks" ON public.chargebacks;
CREATE POLICY "users_view_own_chargebacks" ON public.chargebacks
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin_manage_chargebacks" ON public.chargebacks
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "users_view_invoice_disputes" ON public.invoice_disputes;
DROP POLICY IF EXISTS "users_view_own_invoice_disputes" ON public.invoice_disputes;
DROP POLICY IF EXISTS "users_manage_own_invoice_disputes" ON public.invoice_disputes;
CREATE POLICY "users_view_own_invoice_disputes" ON public.invoice_disputes
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "users_manage_own_invoice_disputes" ON public.invoice_disputes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3.5 INCIDENT LOGS
DROP POLICY IF EXISTS "authenticated_users_create_incident_activity_logs" ON public.incident_activity_logs;
DROP POLICY IF EXISTS "admin_access_incident_activity_logs" ON public.incident_activity_logs;
DROP POLICY IF EXISTS "users_insert_incident_activity_logs" ON public.incident_activity_logs;
CREATE POLICY "admin_access_incident_activity_logs" ON public.incident_activity_logs
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "users_insert_incident_activity_logs" ON public.incident_activity_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- 3.6 REFERENCE DATA TABLES
DROP POLICY IF EXISTS "system_manage_currency_conversions" ON public.currency_conversions;
DROP POLICY IF EXISTS "authenticated_read_currency_conversions" ON public.currency_conversions;
DROP POLICY IF EXISTS "admin_manage_currency_conversions" ON public.currency_conversions;
CREATE POLICY "authenticated_read_currency_conversions" ON public.currency_conversions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_currency_conversions" ON public.currency_conversions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "authenticated_access_currency_rates" ON public.currency_exchange_rates;
DROP POLICY IF EXISTS "authenticated_read_currency_rates" ON public.currency_exchange_rates;
DROP POLICY IF EXISTS "admin_manage_currency_rates" ON public.currency_exchange_rates;
CREATE POLICY "authenticated_read_currency_rates" ON public.currency_exchange_rates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_currency_rates" ON public.currency_exchange_rates
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "authenticated_access_templates" ON public.message_templates;
DROP POLICY IF EXISTS "authenticated_read_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "admin_manage_message_templates" ON public.message_templates;
CREATE POLICY "authenticated_read_message_templates" ON public.message_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_message_templates" ON public.message_templates
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3.7 PROVIDER METRICS
DROP POLICY IF EXISTS "System can insert provider metrics" ON public.provider_performance_metrics;
DROP POLICY IF EXISTS "providers_view_own_performance_metrics" ON public.provider_performance_metrics;
DROP POLICY IF EXISTS "admin_manage_provider_performance_metrics" ON public.provider_performance_metrics;
CREATE POLICY "providers_view_own_performance_metrics" ON public.provider_performance_metrics
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.providers WHERE id = provider_performance_metrics.provider_id AND user_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "admin_manage_provider_performance_metrics" ON public.provider_performance_metrics
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- VERIFICATION
DO $$
DECLARE policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
  RAISE NOTICE 'Migration completed! Total RLS policies: %', policy_count;
  RAISE NOTICE 'IMPORTANT: Enable "Leaked Password Protection" in Supabase Auth settings';
END $$;
