-- Fix: Overly permissive RLS policy on public.hipaa_audit_log
-- Issue: "System can insert HIPAA logs" uses WITH CHECK (true) - unrestricted access
-- Fix: Restrict INSERT to admins only (backend uses service role key which bypasses RLS)

-- Drop the permissive policy
DROP POLICY IF EXISTS "System can insert HIPAA logs" ON public.hipaa_audit_log;

-- Drop any existing named variants to avoid conflicts
DROP POLICY IF EXISTS "admin_select_hipaa_audit_log" ON public.hipaa_audit_log;
DROP POLICY IF EXISTS "service_insert_hipaa_audit_log" ON public.hipaa_audit_log;
DROP POLICY IF EXISTS "Admins can view all HIPAA logs" ON public.hipaa_audit_log;

-- SELECT: Admins only
CREATE POLICY "admin_select_hipaa_audit_log"
  ON public.hipaa_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT: Restricted to service role or admin users
-- Backend inserts via service_role key bypass RLS entirely
-- This policy covers any authenticated inserts (should be admin-only)
CREATE POLICY "service_insert_hipaa_audit_log"
  ON public.hipaa_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());
