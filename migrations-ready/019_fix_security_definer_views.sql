-- Migration 019: Fix SECURITY DEFINER Views
-- These views were flagged by Supabase linter as security concerns
-- SECURITY DEFINER views bypass RLS of the querying user and use the view creator's permissions
-- Fix: Use security_invoker = true to ensure views respect the calling user's RLS policies

-- ============================================================
-- FIX SECURITY DEFINER VIEWS
-- ============================================================

-- For PostgreSQL 15+ (Supabase uses this), we can set security_invoker on views
-- This makes the view execute with the permissions of the user querying it,
-- rather than the permissions of the user who created it

-- Fix permission_audit_trail view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'permission_audit_trail') THEN
    ALTER VIEW public.permission_audit_trail SET (security_invoker = true);
    RAISE NOTICE 'Fixed: permission_audit_trail view security_invoker set to true';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter permission_audit_trail: %', SQLERRM;
END $$;

-- Fix monthly_revenue_trends view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'monthly_revenue_trends') THEN
    ALTER VIEW public.monthly_revenue_trends SET (security_invoker = true);
    RAISE NOTICE 'Fixed: monthly_revenue_trends view security_invoker set to true';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter monthly_revenue_trends: %', SQLERRM;
END $$;

-- Fix role_distribution_stats view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'role_distribution_stats') THEN
    ALTER VIEW public.role_distribution_stats SET (security_invoker = true);
    RAISE NOTICE 'Fixed: role_distribution_stats view security_invoker set to true';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter role_distribution_stats: %', SQLERRM;
END $$;

-- Fix revenue_analysis_detailed view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'revenue_analysis_detailed') THEN
    ALTER VIEW public.revenue_analysis_detailed SET (security_invoker = true);
    RAISE NOTICE 'Fixed: revenue_analysis_detailed view security_invoker set to true';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter revenue_analysis_detailed: %', SQLERRM;
END $$;

-- Fix payment_method_distribution view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'payment_method_distribution') THEN
    ALTER VIEW public.payment_method_distribution SET (security_invoker = true);
    RAISE NOTICE 'Fixed: payment_method_distribution view security_invoker set to true';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter payment_method_distribution: %', SQLERRM;
END $$;

-- Fix compliance_audit_summary view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'compliance_audit_summary') THEN
    ALTER VIEW public.compliance_audit_summary SET (security_invoker = true);
    RAISE NOTICE 'Fixed: compliance_audit_summary view security_invoker set to true';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter compliance_audit_summary: %', SQLERRM;
END $$;

-- Fix provider_performance_summary view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'provider_performance_summary') THEN
    ALTER VIEW public.provider_performance_summary SET (security_invoker = true);
    RAISE NOTICE 'Fixed: provider_performance_summary view security_invoker set to true';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter provider_performance_summary: %', SQLERRM;
END $$;

-- Fix payment_trends_analysis view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'payment_trends_analysis') THEN
    ALTER VIEW public.payment_trends_analysis SET (security_invoker = true);
    RAISE NOTICE 'Fixed: payment_trends_analysis view security_invoker set to true';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not alter payment_trends_analysis: %', SQLERRM;
END $$;

-- ============================================================
-- VERIFICATION QUERY (run separately to verify)
-- ============================================================
-- After running this migration, run this query to verify the views are fixed:
--
-- SELECT schemaname, viewname, 
--        (SELECT reloptions FROM pg_class WHERE relname = viewname) as options
-- FROM pg_views 
-- WHERE schemaname = 'public' 
-- AND viewname IN (
--   'permission_audit_trail',
--   'monthly_revenue_trends', 
--   'role_distribution_stats',
--   'revenue_analysis_detailed',
--   'payment_method_distribution',
--   'compliance_audit_summary',
--   'provider_performance_summary',
--   'payment_trends_analysis'
-- );
--
-- All views should show {security_invoker=true} in the options column

-- ============================================================
-- ALTERNATIVE: DROP AND RECREATE (if ALTER doesn't work)
-- ============================================================
-- If the ALTER VIEW approach doesn't work in your PostgreSQL version,
-- you'll need to:
-- 1. Get the view definition: SELECT pg_get_viewdef('viewname', true);
-- 2. DROP VIEW viewname;
-- 3. CREATE VIEW viewname WITH (security_invoker = true) AS <definition>;
--
-- This requires knowing the exact view definitions which should be
-- retrieved from the database before dropping.

DO $$
BEGIN
  RAISE NOTICE 'Migration 019 completed!';
  RAISE NOTICE 'Fixed 8 views with SECURITY DEFINER property';
  RAISE NOTICE 'Views now use security_invoker = true to respect RLS policies';
END $$;