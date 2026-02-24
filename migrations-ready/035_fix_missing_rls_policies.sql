-- ============================================================
-- Migration 035: Fix Missing RLS Policies
-- ============================================================
-- This migration adds basic RLS policies to tables that have RLS enabled
-- but no policies defined, which causes the "Table has RLS enabled, but no policies exist" warning.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. access_audit_logs
-- Only admins can view audit logs. System/Service role inserts them.
-- ============================================================
DROP POLICY IF EXISTS "Admins can view access audit logs" ON public.access_audit_logs;
CREATE POLICY "Admins can view access audit logs" ON public.access_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 2. advanced_analytics_reports
-- Only admins can view and manage advanced analytics.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage advanced analytics reports" ON public.advanced_analytics_reports;
CREATE POLICY "Admins can manage advanced analytics reports" ON public.advanced_analytics_reports
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3. analytics_insights
-- Only admins can view and manage analytics insights.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage analytics insights" ON public.analytics_insights;
CREATE POLICY "Admins can manage analytics insights" ON public.analytics_insights
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 4. anomaly_alerts
-- Only admins can view and manage anomaly alerts.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage anomaly alerts" ON public.anomaly_alerts;
CREATE POLICY "Admins can manage anomaly alerts" ON public.anomaly_alerts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5. audit_log_exports
-- Admins can manage all.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage audit log exports" ON public.audit_log_exports;
CREATE POLICY "Admins can manage audit log exports" ON public.audit_log_exports
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 6. claim_history
-- Staff/admins can manage all.
-- ============================================================
DROP POLICY IF EXISTS "Staff can manage claim history" ON public.claim_history;
CREATE POLICY "Staff can manage claim history" ON public.claim_history
  FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.is_provider())
  WITH CHECK (public.is_admin() OR public.is_provider());

-- ============================================================
-- 7. compliance_logs
-- Only admins can view compliance logs.
-- ============================================================
DROP POLICY IF EXISTS "Admins can view compliance logs" ON public.compliance_logs;
CREATE POLICY "Admins can view compliance logs" ON public.compliance_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 8. compliance_status
-- Only admins can manage compliance status.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage compliance status" ON public.compliance_status;
CREATE POLICY "Admins can manage compliance status" ON public.compliance_status
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 9. compliance_violations
-- Only admins can manage compliance violations.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage compliance violations" ON public.compliance_violations;
CREATE POLICY "Admins can manage compliance violations" ON public.compliance_violations
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 10. data_backup_logs
-- Only admins can view backup logs.
-- ============================================================
DROP POLICY IF EXISTS "Admins can view data backup logs" ON public.data_backup_logs;
CREATE POLICY "Admins can view data backup logs" ON public.data_backup_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 11. data_backup_schedules
-- Only admins can manage backup schedules.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage data backup schedules" ON public.data_backup_schedules;
CREATE POLICY "Admins can manage data backup schedules" ON public.data_backup_schedules
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 12. integration_health_checks
-- Only admins can manage integration health checks.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage integration health checks" ON public.integration_health_checks;
CREATE POLICY "Admins can manage integration health checks" ON public.integration_health_checks
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 13. integration_health_logs
-- Only admins can view integration health logs.
-- ============================================================
DROP POLICY IF EXISTS "Admins can view integration health logs" ON public.integration_health_logs;
CREATE POLICY "Admins can view integration health logs" ON public.integration_health_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 14. performance_alerts
-- Only admins can manage performance alerts.
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage performance alerts" ON public.performance_alerts;
CREATE POLICY "Admins can manage performance alerts" ON public.performance_alerts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMIT;
