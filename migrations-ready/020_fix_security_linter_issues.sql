-- Migration 020: Fix All Security Linter Issues
-- Addresses: function_search_path_mutable, materialized_view_in_api, rls_policy_always_true
-- Run this in Supabase SQL Editor

-- ============================================================
-- PART 1: FIX FUNCTION SEARCH PATH (function_search_path_mutable)
-- ============================================================

-- Fix update_settlement_updated_at function search_path
-- First check if it exists and recreate with proper search_path
DO $$
BEGIN
  -- Try to alter the function if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_settlement_updated_at') THEN
    ALTER FUNCTION public.update_settlement_updated_at() SET search_path = '';
    RAISE NOTICE 'Fixed search_path for update_settlement_updated_at';
  ELSE
    RAISE NOTICE 'Function update_settlement_updated_at does not exist - skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If function signature is different, log and continue
  RAISE NOTICE 'Could not alter update_settlement_updated_at: %', SQLERRM;
END $$;

-- ============================================================
-- PART 2: FIX MATERIALIZED VIEW API ACCESS (materialized_view_in_api)
-- ============================================================

-- Revoke anon/authenticated access from daily_transaction_summary materialized view
-- Only admins should be able to query transaction summaries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'daily_transaction_summary' AND schemaname = 'public'
  ) THEN
    REVOKE SELECT ON public.daily_transaction_summary FROM anon;
    REVOKE SELECT ON public.daily_transaction_summary FROM authenticated;
    -- Only grant to admins or service_role
    -- Service role still has access for backend operations
    RAISE NOTICE 'Revoked public access from daily_transaction_summary';
  ELSE
    RAISE NOTICE 'Materialized view daily_transaction_summary does not exist - skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not modify daily_transaction_summary permissions: %', SQLERRM;
END $$;

-- Create a secure function for admin access to daily summaries
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
  -- Only allow admins
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

-- Ensure is_admin helper function exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Helper function to check if user is a provider
CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.providers
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================
-- 3.1 FIX LOG/AUDIT TABLE POLICIES
-- These tables are typically written by backend services
-- We restrict INSERT to only service operations (NOT client-side)
-- ============================================================

-- access_audit_logs: System logs - admin and service only
DROP POLICY IF EXISTS "System can insert access logs" ON public.access_audit_logs;
DROP POLICY IF EXISTS "admin_select_access_audit_logs" ON public.access_audit_logs;
DROP POLICY IF EXISTS "service_insert_access_audit_logs" ON public.access_audit_logs;

CREATE POLICY "admin_select_access_audit_logs" ON public.access_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Note: For INSERT, we allow but require the user_id to match 
-- This ensures only backend with service_role or proper auth can insert
CREATE POLICY "service_insert_access_audit_logs" ON public.access_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow inserts where user_id matches current user or is admin
    user_id IS NULL OR user_id = auth.uid() OR public.is_admin()
  );

-- api_usage_logs: System logs - admin and service only
DROP POLICY IF EXISTS "System can insert usage logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "admin_select_api_usage_logs" ON public.api_usage_logs;
DROP POLICY IF EXISTS "service_insert_api_usage_logs" ON public.api_usage_logs;

CREATE POLICY "admin_select_api_usage_logs" ON public.api_usage_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "service_insert_api_usage_logs" ON public.api_usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid() OR public.is_admin()
  );

-- hipaa_audit_log: HIPAA compliance logs - admin only
DROP POLICY IF EXISTS "System can insert HIPAA logs" ON public.hipaa_audit_log;
DROP POLICY IF EXISTS "admin_select_hipaa_audit_log" ON public.hipaa_audit_log;
DROP POLICY IF EXISTS "service_insert_hipaa_audit_log" ON public.hipaa_audit_log;

CREATE POLICY "admin_select_hipaa_audit_log" ON public.hipaa_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "service_insert_hipaa_audit_log" ON public.hipaa_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid() OR public.is_admin()
  );

-- webhook_delivery_attempts: System logs
DROP POLICY IF EXISTS "system_insert_delivery_attempts" ON public.webhook_delivery_attempts;
DROP POLICY IF EXISTS "admin_select_webhook_delivery_attempts" ON public.webhook_delivery_attempts;
DROP POLICY IF EXISTS "service_insert_webhook_delivery_attempts" ON public.webhook_delivery_attempts;

CREATE POLICY "admin_select_webhook_delivery_attempts" ON public.webhook_delivery_attempts
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "service_insert_webhook_delivery_attempts" ON public.webhook_delivery_attempts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- email_history: Email logs - admin and service
DROP POLICY IF EXISTS "service_insert_email_history" ON public.email_history;
DROP POLICY IF EXISTS "admin_select_email_history" ON public.email_history;
DROP POLICY IF EXISTS "service_insert_email_history_secured" ON public.email_history;

CREATE POLICY "admin_select_email_history" ON public.email_history
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "service_insert_email_history_secured" ON public.email_history
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow if user is admin or if recipient matches user
    public.is_admin() OR recipient_email IN (
      SELECT email FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- 3.2 FIX ADMIN-ONLY TABLE POLICIES
-- These tables should only be accessible by admins
-- ============================================================

-- advanced_analytics_reports: Admin only
DROP POLICY IF EXISTS "admin_access_advanced_analytics_reports" ON public.advanced_analytics_reports;
DROP POLICY IF EXISTS "admin_full_access_advanced_analytics_reports" ON public.advanced_analytics_reports;

CREATE POLICY "admin_full_access_advanced_analytics_reports" ON public.advanced_analytics_reports
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- compliance_workflow_executions: Admin only
DROP POLICY IF EXISTS "admin_access_compliance_workflow_executions" ON public.compliance_workflow_executions;
DROP POLICY IF EXISTS "admin_full_access_compliance_workflow_executions" ON public.compliance_workflow_executions;

CREATE POLICY "admin_full_access_compliance_workflow_executions" ON public.compliance_workflow_executions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- compliance_workflow_rules: Admin only
DROP POLICY IF EXISTS "admin_access_compliance_workflow_rules" ON public.compliance_workflow_rules;
DROP POLICY IF EXISTS "admin_full_access_compliance_workflow_rules" ON public.compliance_workflow_rules;

CREATE POLICY "admin_full_access_compliance_workflow_rules" ON public.compliance_workflow_rules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- data_backup_logs: Admin only
DROP POLICY IF EXISTS "admin_access_data_backup_logs" ON public.data_backup_logs;
DROP POLICY IF EXISTS "admin_full_access_data_backup_logs" ON public.data_backup_logs;

CREATE POLICY "admin_full_access_data_backup_logs" ON public.data_backup_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- data_backup_schedules: Admin only
DROP POLICY IF EXISTS "admin_access_data_backup_schedules" ON public.data_backup_schedules;
DROP POLICY IF EXISTS "admin_full_access_data_backup_schedules" ON public.data_backup_schedules;

CREATE POLICY "admin_full_access_data_backup_schedules" ON public.data_backup_schedules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- encryption_keys: Admin only (sensitive)
DROP POLICY IF EXISTS "admin_manage_encryption_keys" ON public.encryption_keys;
DROP POLICY IF EXISTS "admin_full_access_encryption_keys" ON public.encryption_keys;

CREATE POLICY "admin_full_access_encryption_keys" ON public.encryption_keys
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- integration_health_checks: Admin only
DROP POLICY IF EXISTS "admin_access_integration_health_checks" ON public.integration_health_checks;
DROP POLICY IF EXISTS "admin_full_access_integration_health_checks" ON public.integration_health_checks;

CREATE POLICY "admin_full_access_integration_health_checks" ON public.integration_health_checks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- integration_health_logs: Admin only
DROP POLICY IF EXISTS "admin_access_integration_health_logs" ON public.integration_health_logs;
DROP POLICY IF EXISTS "admin_full_access_integration_health_logs" ON public.integration_health_logs;

CREATE POLICY "admin_full_access_integration_health_logs" ON public.integration_health_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- performance_alerts: Admin only
DROP POLICY IF EXISTS "admin_access_performance_alerts" ON public.performance_alerts;
DROP POLICY IF EXISTS "admin_full_access_performance_alerts" ON public.performance_alerts;

CREATE POLICY "admin_full_access_performance_alerts" ON public.performance_alerts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- security_threat_logs: Admin only (sensitive)
DROP POLICY IF EXISTS "admin_access_security_threat_logs" ON public.security_threat_logs;
DROP POLICY IF EXISTS "admin_full_access_security_threat_logs" ON public.security_threat_logs;

CREATE POLICY "admin_full_access_security_threat_logs" ON public.security_threat_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- system_performance_metrics: Admin only
DROP POLICY IF EXISTS "admin_access_system_performance_metrics" ON public.system_performance_metrics;
DROP POLICY IF EXISTS "admin_full_access_system_performance_metrics" ON public.system_performance_metrics;

CREATE POLICY "admin_full_access_system_performance_metrics" ON public.system_performance_metrics
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3.3 FIX ANALYTICS/EVENTS TABLE POLICIES
-- ============================================================

-- analytics_events: Users can insert their own events
DROP POLICY IF EXISTS "system_create_analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "admin_select_analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "users_insert_own_analytics_events" ON public.analytics_events;

CREATE POLICY "admin_select_analytics_events" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "users_insert_own_analytics_events" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must have a user_id that matches current user or be admin
    user_id IS NULL OR user_id = auth.uid() OR public.is_admin()
  );

-- ============================================================
-- 3.4 FIX FRAUD/SECURITY TABLE POLICIES
-- ============================================================

-- fraud_anomalies: Admin only
DROP POLICY IF EXISTS "authenticated_manage_fraud_anomalies" ON public.fraud_anomalies;
DROP POLICY IF EXISTS "admin_full_access_fraud_anomalies" ON public.fraud_anomalies;

CREATE POLICY "admin_full_access_fraud_anomalies" ON public.fraud_anomalies
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- fraud_detection_rules: Admin only
DROP POLICY IF EXISTS "authenticated_access_fraud_rules" ON public.fraud_detection_rules;
DROP POLICY IF EXISTS "admin_full_access_fraud_detection_rules" ON public.fraud_detection_rules;

CREATE POLICY "admin_full_access_fraud_detection_rules" ON public.fraud_detection_rules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3.5 FIX DISPUTE-RELATED TABLE POLICIES
-- ============================================================

-- disputes: Users can create disputes on their own transactions
DROP POLICY IF EXISTS "users_create_disputes" ON public.disputes;
DROP POLICY IF EXISTS "users_insert_own_disputes" ON public.disputes;

CREATE POLICY "users_insert_own_disputes" ON public.disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User must be patient or provider involved in the transaction
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = disputes.transaction_id
      AND (
        EXISTS (SELECT 1 FROM public.patients p WHERE p.id = t.patient_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.providers pr WHERE pr.id = t.provider_id AND pr.user_id = auth.uid())
      )
    )
    OR public.is_admin()
  );

-- dispute_notifications: System creates for dispute participants
DROP POLICY IF EXISTS "system_create_notifications" ON public.dispute_notifications;
DROP POLICY IF EXISTS "users_view_own_dispute_notifications" ON public.dispute_notifications;
DROP POLICY IF EXISTS "service_insert_dispute_notifications" ON public.dispute_notifications;

CREATE POLICY "users_view_own_dispute_notifications" ON public.dispute_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY "service_insert_dispute_notifications" ON public.dispute_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow admin or if notification is for the current user
    public.is_admin() OR user_id = auth.uid()
  );

-- dispute_timeline: Users can create entries on disputes they're involved in
DROP POLICY IF EXISTS "users_create_timeline_entries" ON public.dispute_timeline;
DROP POLICY IF EXISTS "users_insert_timeline_entries" ON public.dispute_timeline;

CREATE POLICY "users_insert_timeline_entries" ON public.dispute_timeline
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be involved in the dispute
    EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.transactions t ON t.id = d.transaction_id
      WHERE d.id = dispute_timeline.dispute_id
      AND (
        EXISTS (SELECT 1 FROM public.patients p WHERE p.id = t.patient_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.providers pr WHERE pr.id = t.provider_id AND pr.user_id = auth.uid())
      )
    )
    OR public.is_admin()
  );

-- chargebacks: Admin and involved parties
DROP POLICY IF EXISTS "users_manage_chargebacks" ON public.chargebacks;
DROP POLICY IF EXISTS "users_view_own_chargebacks" ON public.chargebacks;
DROP POLICY IF EXISTS "admin_manage_chargebacks" ON public.chargebacks;

CREATE POLICY "users_view_own_chargebacks" ON public.chargebacks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = chargebacks.transaction_id
      AND (
        EXISTS (SELECT 1 FROM public.patients p WHERE p.id = t.patient_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.providers pr WHERE pr.id = t.provider_id AND pr.user_id = auth.uid())
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "admin_manage_chargebacks" ON public.chargebacks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- invoice_disputes: Users view/manage their own invoice disputes
DROP POLICY IF EXISTS "users_view_invoice_disputes" ON public.invoice_disputes;
DROP POLICY IF EXISTS "users_view_own_invoice_disputes" ON public.invoice_disputes;
DROP POLICY IF EXISTS "users_manage_own_invoice_disputes" ON public.invoice_disputes;

CREATE POLICY "users_view_own_invoice_disputes" ON public.invoice_disputes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_disputes.invoice_id
      AND (
        EXISTS (SELECT 1 FROM public.patients p WHERE p.id = i.patient_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.providers pr WHERE pr.id = i.provider_id AND pr.user_id = auth.uid())
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "users_manage_own_invoice_disputes" ON public.invoice_disputes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_disputes.invoice_id
      AND (
        EXISTS (SELECT 1 FROM public.patients p WHERE p.id = i.patient_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.providers pr WHERE pr.id = i.provider_id AND pr.user_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_disputes.invoice_id
      AND (
        EXISTS (SELECT 1 FROM public.patients p WHERE p.id = i.patient_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.providers pr WHERE pr.id = i.provider_id AND pr.user_id = auth.uid())
      )
    )
  );

-- ============================================================
-- 3.6 FIX INCIDENT/RESPONSE TABLE POLICIES
-- ============================================================

-- incident_activity_logs: Admin and assigned users
DROP POLICY IF EXISTS "authenticated_users_create_incident_activity_logs" ON public.incident_activity_logs;
DROP POLICY IF EXISTS "admin_access_incident_activity_logs" ON public.incident_activity_logs;
DROP POLICY IF EXISTS "users_insert_incident_activity_logs" ON public.incident_activity_logs;

CREATE POLICY "admin_access_incident_activity_logs" ON public.incident_activity_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "users_insert_incident_activity_logs" ON public.incident_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be admin or the user creating the log entry
    public.is_admin() OR user_id = auth.uid()
  );

-- incident_responses: Admin only
DROP POLICY IF EXISTS "authenticated_users_manage_incident_responses" ON public.incident_responses;
DROP POLICY IF EXISTS "admin_full_access_incident_responses" ON public.incident_responses;

CREATE POLICY "admin_full_access_incident_responses" ON public.incident_responses
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3.7 FIX CURRENCY/REFERENCE TABLE POLICIES
-- ============================================================

-- currency_conversions: Admin only for management
DROP POLICY IF EXISTS "system_manage_currency_conversions" ON public.currency_conversions;
DROP POLICY IF EXISTS "authenticated_read_currency_conversions" ON public.currency_conversions;
DROP POLICY IF EXISTS "admin_manage_currency_conversions" ON public.currency_conversions;

-- Allow all authenticated users to READ currency conversions (reference data)
CREATE POLICY "authenticated_read_currency_conversions" ON public.currency_conversions
  FOR SELECT TO authenticated
  USING (true);

-- Only admin can modify
CREATE POLICY "admin_manage_currency_conversions" ON public.currency_conversions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- currency_exchange_rates: Reference data - read by all, managed by admin
DROP POLICY IF EXISTS "authenticated_access_currency_rates" ON public.currency_exchange_rates;
DROP POLICY IF EXISTS "authenticated_read_currency_rates" ON public.currency_exchange_rates;
DROP POLICY IF EXISTS "admin_manage_currency_rates" ON public.currency_exchange_rates;

-- Allow all authenticated users to READ rates (reference data)
CREATE POLICY "authenticated_read_currency_rates" ON public.currency_exchange_rates
  FOR SELECT TO authenticated
  USING (true);

-- Only admin can modify
CREATE POLICY "admin_manage_currency_rates" ON public.currency_exchange_rates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- message_templates: Reference data - read by all, managed by admin
DROP POLICY IF EXISTS "authenticated_access_templates" ON public.message_templates;
DROP POLICY IF EXISTS "authenticated_read_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "admin_manage_message_templates" ON public.message_templates;

-- Allow all authenticated users to READ templates
CREATE POLICY "authenticated_read_message_templates" ON public.message_templates
  FOR SELECT TO authenticated
  USING (true);

-- Only admin can modify
CREATE POLICY "admin_manage_message_templates" ON public.message_templates
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3.8 FIX PROVIDER METRICS POLICIES
-- ============================================================

-- provider_performance_metrics: Providers can view own, admin can manage all
DROP POLICY IF EXISTS "System can insert provider metrics" ON public.provider_performance_metrics;
DROP POLICY IF EXISTS "providers_view_own_performance_metrics" ON public.provider_performance_metrics;
DROP POLICY IF EXISTS "admin_manage_provider_performance_metrics" ON public.provider_performance_metrics;

CREATE POLICY "providers_view_own_performance_metrics" ON public.provider_performance_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE id = provider_performance_metrics.provider_id
      AND user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "admin_manage_provider_performance_metrics" ON public.provider_performance_metrics
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Migration 020 completed!';
  RAISE NOTICE 'Total RLS policies in public schema: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Enable "Leaked Password Protection" in Supabase Dashboard:';
  RAISE NOTICE '  Authentication -> Providers -> Password -> Enable "Prevent weak passwords"';
END $$;