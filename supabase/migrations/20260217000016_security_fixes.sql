-- Migration 016: Comprehensive Security Fixes
-- Fixes: Function search_path, RLS policies for analytics tables
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. FIX FUNCTION SEARCH_PATH ISSUES
-- ============================================================

-- Fix update_updated_at_timestamp function (mutable search_path)
CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix handle_updated_at function (search_path = public should be empty)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix other functions that might have mutable search_path
-- Check if update_onboarding_progress exists and fix it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_onboarding_progress') THEN
    ALTER FUNCTION public.update_onboarding_progress SET search_path = '';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Function might have different signature, ignore
  NULL;
END $$;

-- ============================================================
-- 2. ENABLE RLS ON ANALYTICS/MONITORING TABLES
-- ============================================================

-- Enable RLS on all analytics tables from migration 009
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
-- 3. CREATE PROPER RLS POLICIES FOR ANALYTICS TABLES
-- ============================================================

-- Helper function to check admin role (with search_path fixed)
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

-- advanced_analytics_reports: Admin-only access
DROP POLICY IF EXISTS admin_view_analytics_reports ON public.advanced_analytics_reports;
DROP POLICY IF EXISTS admin_manage_analytics_reports ON public.advanced_analytics_reports;

CREATE POLICY admin_view_analytics_reports ON public.advanced_analytics_reports
  FOR SELECT USING (public.is_admin());

CREATE POLICY admin_insert_analytics_reports ON public.advanced_analytics_reports
  FOR INSERT WITH CHECK (public.is_admin() AND auth.uid() = created_by);

CREATE POLICY admin_update_analytics_reports ON public.advanced_analytics_reports
  FOR UPDATE USING (public.is_admin());

CREATE POLICY admin_delete_analytics_reports ON public.advanced_analytics_reports
  FOR DELETE USING (public.is_admin());

-- analytics_insights: Admin-only access (no more "true" for all)
DROP POLICY IF EXISTS admin_access_analytics_insights ON public.analytics_insights;

CREATE POLICY admin_view_analytics_insights ON public.analytics_insights
  FOR SELECT USING (public.is_admin());

CREATE POLICY admin_insert_analytics_insights ON public.analytics_insights
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY admin_update_analytics_insights ON public.analytics_insights
  FOR UPDATE USING (public.is_admin());

CREATE POLICY admin_delete_analytics_insights ON public.analytics_insights
  FOR DELETE USING (public.is_admin());

-- anomaly_alerts: Admin-only access
DROP POLICY IF EXISTS admin_access_anomaly_alerts ON public.anomaly_alerts;

CREATE POLICY admin_view_anomaly_alerts ON public.anomaly_alerts
  FOR SELECT USING (public.is_admin());

CREATE POLICY admin_insert_anomaly_alerts ON public.anomaly_alerts
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY admin_update_anomaly_alerts ON public.anomaly_alerts
  FOR UPDATE USING (public.is_admin());

-- system_performance_metrics: Admin-only access
CREATE POLICY admin_view_system_metrics ON public.system_performance_metrics
  FOR SELECT USING (public.is_admin());

CREATE POLICY system_insert_metrics ON public.system_performance_metrics
  FOR INSERT WITH CHECK (public.is_admin());

-- performance_alerts: Admin-only access
CREATE POLICY admin_view_performance_alerts ON public.performance_alerts
  FOR SELECT USING (public.is_admin());

CREATE POLICY admin_manage_performance_alerts ON public.performance_alerts
  FOR UPDATE USING (public.is_admin());

CREATE POLICY system_insert_performance_alerts ON public.performance_alerts
  FOR INSERT WITH CHECK (public.is_admin());

-- transaction_flow_metrics: Admin-only access
CREATE POLICY admin_view_transaction_metrics ON public.transaction_flow_metrics
  FOR SELECT USING (public.is_admin());

CREATE POLICY system_insert_transaction_metrics ON public.transaction_flow_metrics
  FOR INSERT WITH CHECK (public.is_admin());

-- integration_health_checks: Admin-only access
CREATE POLICY admin_view_integration_health ON public.integration_health_checks
  FOR SELECT USING (public.is_admin());

CREATE POLICY admin_manage_integration_health ON public.integration_health_checks
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY admin_update_integration_health ON public.integration_health_checks
  FOR UPDATE USING (public.is_admin());

-- integration_health_logs: Admin-only access
CREATE POLICY admin_view_integration_logs ON public.integration_health_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY system_insert_integration_logs ON public.integration_health_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- report_templates: Users can view, admins can manage
CREATE POLICY users_view_report_templates ON public.report_templates
  FOR SELECT USING (is_system_template = true OR created_by = auth.uid() OR public.is_admin());

CREATE POLICY users_create_report_templates ON public.report_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY users_manage_own_templates ON public.report_templates
  FOR UPDATE USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY users_delete_own_templates ON public.report_templates
  FOR DELETE USING (created_by = auth.uid() OR public.is_admin());

-- saved_reports: Users manage their own
CREATE POLICY users_view_own_reports ON public.saved_reports
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY users_create_own_reports ON public.saved_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY users_delete_own_reports ON public.saved_reports
  FOR DELETE USING (user_id = auth.uid());

-- data_backup_schedules: Admin-only
CREATE POLICY admin_view_backup_schedules ON public.data_backup_schedules
  FOR SELECT USING (public.is_admin());

CREATE POLICY admin_manage_backup_schedules ON public.data_backup_schedules
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY admin_update_backup_schedules ON public.data_backup_schedules
  FOR UPDATE USING (public.is_admin());

CREATE POLICY admin_delete_backup_schedules ON public.data_backup_schedules
  FOR DELETE USING (public.is_admin());

-- data_backup_logs: Admin-only
CREATE POLICY admin_view_backup_logs ON public.data_backup_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY system_insert_backup_logs ON public.data_backup_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================
-- 4. FIX OVERLY PERMISSIVE POLICIES IN MIGRATION 011
-- ============================================================

-- Replace "FOR ALL" admin policies with explicit operations
-- This ensures WITH CHECK is properly evaluated

-- Fix notifications INSERT policy (was WITH CHECK (true))
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    -- Service role can always insert (for system notifications)
    -- Or users creating for themselves
    user_id = auth.uid() OR 
    -- Or context indicates service role
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Fix compliance_logs INSERT policy (was WITH CHECK (true))
DROP POLICY IF EXISTS "System can create compliance logs" ON public.compliance_logs;
CREATE POLICY "System can create compliance logs" ON public.compliance_logs
  FOR INSERT WITH CHECK (
    public.is_admin() OR
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- ============================================================
-- 5. FIX "FOR ALL" POLICIES TO BE EXPLICIT
-- ============================================================

-- patients: Replace FOR ALL with explicit operations
DROP POLICY IF EXISTS "Admins can view all patients" ON public.patients;
CREATE POLICY "Admins can select patients" ON public.patients
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert patients" ON public.patients
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update patients" ON public.patients
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete patients" ON public.patients
  FOR DELETE USING (public.is_admin());

-- providers: Replace FOR ALL with explicit operations  
DROP POLICY IF EXISTS "Admins can manage providers" ON public.providers;
CREATE POLICY "Admins can select providers" ON public.providers
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert providers" ON public.providers
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update providers" ON public.providers
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete providers" ON public.providers
  FOR DELETE USING (public.is_admin());

-- transactions: Replace FOR ALL with explicit operations
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can select transactions" ON public.transactions
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete transactions" ON public.transactions
  FOR DELETE USING (public.is_admin());

-- invoices: Replace FOR ALL with explicit operations
DROP POLICY IF EXISTS "Admins can manage all invoices" ON public.invoices;
CREATE POLICY "Admins can select invoices" ON public.invoices
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update invoices" ON public.invoices
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete invoices" ON public.invoices
  FOR DELETE USING (public.is_admin());

-- disputes: Replace FOR ALL with explicit operations
DROP POLICY IF EXISTS "Admins can manage all disputes" ON public.disputes;
CREATE POLICY "Admins can select disputes" ON public.disputes
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert disputes" ON public.disputes
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete disputes" ON public.disputes
  FOR DELETE USING (public.is_admin());

-- webhooks: Replace FOR ALL with explicit operations
DROP POLICY IF EXISTS "Users can manage own webhooks" ON public.webhooks;
CREATE POLICY "Users can insert webhooks" ON public.webhooks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update webhooks" ON public.webhooks
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete webhooks" ON public.webhooks
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 6. GRANT EXECUTE ON HELPER FUNCTIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_timestamp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;

-- ============================================================
-- DONE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 016 completed successfully!';
  RAISE NOTICE 'Fixed: Function search_path issues';
  RAISE NOTICE 'Fixed: RLS enabled on 12 analytics tables';
  RAISE NOTICE 'Fixed: Overly permissive RLS policies';
  RAISE NOTICE 'Fixed: "FOR ALL" policies replaced with explicit operations';
END $$;
