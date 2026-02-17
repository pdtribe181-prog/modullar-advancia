-- Migration 017: Fix Permissive RLS Policies
-- Removes "ALL" policies with (true) that bypass security
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. DROP ALL PERMISSIVE "ALL" POLICIES
-- ============================================================

-- Drop the overly permissive policies on analytics tables
DROP POLICY IF EXISTS admin_access_advanced_analytics_reports ON public.advanced_analytics_reports;
DROP POLICY IF EXISTS admin_access_analytics_insights ON public.analytics_insights;
DROP POLICY IF EXISTS admin_access_anomaly_alerts ON public.anomaly_alerts;
DROP POLICY IF EXISTS admin_access_system_performance_metrics ON public.system_performance_metrics;
DROP POLICY IF EXISTS admin_access_performance_alerts ON public.performance_alerts;
DROP POLICY IF EXISTS admin_access_transaction_flow_metrics ON public.transaction_flow_metrics;
DROP POLICY IF EXISTS admin_access_integration_health_checks ON public.integration_health_checks;
DROP POLICY IF EXISTS admin_access_integration_health_logs ON public.integration_health_logs;
DROP POLICY IF EXISTS admin_access_report_templates ON public.report_templates;
DROP POLICY IF EXISTS admin_access_saved_reports ON public.saved_reports;
DROP POLICY IF EXISTS admin_access_data_backup_schedules ON public.data_backup_schedules;
DROP POLICY IF EXISTS admin_access_data_backup_logs ON public.data_backup_logs;

-- Also drop any "true" policies
DROP POLICY IF EXISTS allow_all_advanced_analytics_reports ON public.advanced_analytics_reports;
DROP POLICY IF EXISTS allow_all_analytics_insights ON public.analytics_insights;
DROP POLICY IF EXISTS allow_all_anomaly_alerts ON public.anomaly_alerts;

-- ============================================================
-- 2. DROP EXISTING INDIVIDUAL POLICIES (to recreate cleanly)
-- ============================================================

DROP POLICY IF EXISTS admin_view_analytics_reports ON public.advanced_analytics_reports;
DROP POLICY IF EXISTS admin_insert_analytics_reports ON public.advanced_analytics_reports;
DROP POLICY IF EXISTS admin_update_analytics_reports ON public.advanced_analytics_reports;
DROP POLICY IF EXISTS admin_delete_analytics_reports ON public.advanced_analytics_reports;

DROP POLICY IF EXISTS admin_view_analytics_insights ON public.analytics_insights;
DROP POLICY IF EXISTS admin_insert_analytics_insights ON public.analytics_insights;
DROP POLICY IF EXISTS admin_update_analytics_insights ON public.analytics_insights;
DROP POLICY IF EXISTS admin_delete_analytics_insights ON public.analytics_insights;

DROP POLICY IF EXISTS admin_view_anomaly_alerts ON public.anomaly_alerts;
DROP POLICY IF EXISTS admin_insert_anomaly_alerts ON public.anomaly_alerts;
DROP POLICY IF EXISTS admin_update_anomaly_alerts ON public.anomaly_alerts;

DROP POLICY IF EXISTS admin_view_system_metrics ON public.system_performance_metrics;
DROP POLICY IF EXISTS system_insert_metrics ON public.system_performance_metrics;

DROP POLICY IF EXISTS admin_view_performance_alerts ON public.performance_alerts;
DROP POLICY IF EXISTS admin_manage_performance_alerts ON public.performance_alerts;
DROP POLICY IF EXISTS system_insert_performance_alerts ON public.performance_alerts;

DROP POLICY IF EXISTS admin_view_transaction_metrics ON public.transaction_flow_metrics;
DROP POLICY IF EXISTS system_insert_transaction_metrics ON public.transaction_flow_metrics;

-- ============================================================
-- 3. CREATE is_admin FUNCTION (if not exists)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ============================================================
-- 4. CREATE PROPER RESTRICTIVE POLICIES
-- ============================================================

-- advanced_analytics_reports: Separate policies per operation
CREATE POLICY admin_select_advanced_analytics ON public.advanced_analytics_reports
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_advanced_analytics ON public.advanced_analytics_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY admin_update_advanced_analytics ON public.advanced_analytics_reports
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY admin_delete_advanced_analytics ON public.advanced_analytics_reports
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- analytics_insights
CREATE POLICY admin_select_analytics_insights ON public.analytics_insights
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_analytics_insights ON public.analytics_insights
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY admin_update_analytics_insights ON public.analytics_insights
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY admin_delete_analytics_insights ON public.analytics_insights
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- anomaly_alerts
CREATE POLICY admin_select_anomaly_alerts ON public.anomaly_alerts
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_anomaly_alerts ON public.anomaly_alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY admin_update_anomaly_alerts ON public.anomaly_alerts
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY admin_delete_anomaly_alerts ON public.anomaly_alerts
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- system_performance_metrics
CREATE POLICY admin_select_system_metrics ON public.system_performance_metrics
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_system_metrics ON public.system_performance_metrics
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- performance_alerts
CREATE POLICY admin_select_perf_alerts ON public.performance_alerts
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_perf_alerts ON public.performance_alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY admin_update_perf_alerts ON public.performance_alerts
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- transaction_flow_metrics
CREATE POLICY admin_select_txn_metrics ON public.transaction_flow_metrics
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_txn_metrics ON public.transaction_flow_metrics
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- integration_health_checks
CREATE POLICY admin_select_integration_checks ON public.integration_health_checks
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_integration_checks ON public.integration_health_checks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY admin_update_integration_checks ON public.integration_health_checks
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- integration_health_logs
CREATE POLICY admin_select_integration_logs ON public.integration_health_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_integration_logs ON public.integration_health_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- report_templates: Admins manage, users can view
CREATE POLICY admin_select_report_templates ON public.report_templates
  FOR SELECT TO authenticated
  USING (public.is_admin() OR is_public = true);

CREATE POLICY admin_insert_report_templates ON public.report_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY admin_update_report_templates ON public.report_templates
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY admin_delete_report_templates ON public.report_templates
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- saved_reports: Users can manage their own
CREATE POLICY users_select_saved_reports ON public.saved_reports
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY users_insert_saved_reports ON public.saved_reports
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY users_update_saved_reports ON public.saved_reports
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY users_delete_saved_reports ON public.saved_reports
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

-- data_backup_schedules: Admin only
CREATE POLICY admin_select_backup_schedules ON public.data_backup_schedules
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_backup_schedules ON public.data_backup_schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY admin_update_backup_schedules ON public.data_backup_schedules
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY admin_delete_backup_schedules ON public.data_backup_schedules
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- data_backup_logs: Admin only
CREATE POLICY admin_select_backup_logs ON public.data_backup_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_insert_backup_logs ON public.data_backup_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5. VERIFY RLS IS ENABLED
-- ============================================================

ALTER TABLE IF EXISTS public.advanced_analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transaction_flow_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integration_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integration_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.data_backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.data_backup_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DONE: All analytics tables now have proper restrictive policies
-- ============================================================
