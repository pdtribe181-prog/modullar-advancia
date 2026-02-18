-- Fix SECURITY DEFINER Views
-- These views bypass RLS of the querying user - setting security_invoker = true fixes this

-- Fix all 8 flagged views
ALTER VIEW IF EXISTS public.permission_audit_trail SET (security_invoker = true);
ALTER VIEW IF EXISTS public.monthly_revenue_trends SET (security_invoker = true);
ALTER VIEW IF EXISTS public.role_distribution_stats SET (security_invoker = true);
ALTER VIEW IF EXISTS public.revenue_analysis_detailed SET (security_invoker = true);
ALTER VIEW IF EXISTS public.payment_method_distribution SET (security_invoker = true);
ALTER VIEW IF EXISTS public.compliance_audit_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.provider_performance_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.payment_trends_analysis SET (security_invoker = true);
