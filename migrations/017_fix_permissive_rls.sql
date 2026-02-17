-- Migration 017: Fix Permissive RLS Policies
-- This migration fixes overly permissive RLS policies
-- Run this in Supabase SQL Editor

-- ============================================================
-- Create is_admin helper function
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Fix overly permissive policies by dropping and recreating
-- Only targets tables that exist in your database
-- ============================================================

-- COMPLIANCE_LOGS: Drop permissive policy and create proper ones
DROP POLICY IF EXISTS "Admins can view compliance logs" ON public.compliance_logs;
DROP POLICY IF EXISTS "admin_access_compliance_logs" ON public.compliance_logs;
DROP POLICY IF EXISTS "admin_select_compliance_logs" ON public.compliance_logs;
DROP POLICY IF EXISTS "admin_insert_compliance_logs" ON public.compliance_logs;

CREATE POLICY "admin_select_compliance_logs" ON public.compliance_logs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admin_insert_compliance_logs" ON public.compliance_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- API_KEYS: Admin and owner access only
DROP POLICY IF EXISTS "admin_access_api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "users_select_own_api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "users_manage_own_api_keys" ON public.api_keys;

CREATE POLICY "users_select_own_api_keys" ON public.api_keys
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "users_manage_own_api_keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- WEBHOOKS: Admin and owner access only
DROP POLICY IF EXISTS "admin_access_webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Users can view own webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "users_select_own_webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "users_manage_own_webhooks" ON public.webhooks;

CREATE POLICY "users_select_own_webhooks" ON public.webhooks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "users_manage_own_webhooks" ON public.webhooks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure RLS is enabled on core tables
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Done!
SELECT 'RLS policies updated successfully' as status;
