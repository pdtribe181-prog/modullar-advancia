-- ============================================================
-- COMPREHENSIVE SECURITY LINTER CHECK
-- ============================================================

-- 1. Tables with RLS enabled but NO policies
SELECT 'RLS_NO_POLICY' as issue, c.relname as name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = c.relname AND p.schemaname = 'public')
ORDER BY c.relname;

-- 2. Functions with mutable search_path
SELECT 'MUTABLE_SEARCH_PATH' as issue, p.proname as name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc_info pi
    WHERE pi.oid = p.oid
  )
  AND p.proconfig IS NULL OR NOT (p.proconfig::text[] @> ARRAY['search_path=public'])
ORDER BY p.proname;

-- 3. Views with security_definer (not security_invoker)
SELECT 'SECURITY_DEFINER_VIEW' as issue, c.relname as name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND NOT (
    EXISTS (
      SELECT 1 FROM pg_options_to_table(c.reloptions)
      WHERE option_name = 'security_invoker' AND option_value = 'on'
    )
  )
ORDER BY c.relname;

-- 4. Policies using bare auth.uid() or auth.role() without (SELECT ...)
SELECT 'BARE_AUTH_CALL' as issue,
       tablename || ' -> ' || policyname as name,
       CASE
         WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid()%' AND qual::text NOT LIKE '%( SELECT auth.uid()%' THEN 'qual: bare auth.uid()'
         WHEN qual::text LIKE '%auth.role()%' AND qual::text NOT LIKE '%(SELECT auth.role()%' AND qual::text NOT LIKE '%( SELECT auth.role()%' THEN 'qual: bare auth.role()'
         WHEN with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid()%' AND with_check::text NOT LIKE '%( SELECT auth.uid()%' THEN 'with_check: bare auth.uid()'
         WHEN with_check::text LIKE '%auth.role()%' AND with_check::text NOT LIKE '%(SELECT auth.role()%' AND with_check::text NOT LIKE '%( SELECT auth.role()%' THEN 'with_check: bare auth.role()'
       END as detail
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid()%' AND qual::text NOT LIKE '%( SELECT auth.uid()%')
    OR (qual::text LIKE '%auth.role()%' AND qual::text NOT LIKE '%(SELECT auth.role()%' AND qual::text NOT LIKE '%( SELECT auth.role()%')
    OR (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid()%' AND with_check::text NOT LIKE '%( SELECT auth.uid()%')
    OR (with_check::text LIKE '%auth.role()%' AND with_check::text NOT LIKE '%(SELECT auth.role()%' AND with_check::text NOT LIKE '%( SELECT auth.role()%')
  )
ORDER BY tablename, policyname;

-- 5. Duplicate permissive policies
SELECT 'DUPLICATE_POLICY' as issue,
       tablename || ' [' || roles::text || '] ' || cmd as name,
       array_agg(policyname)::text as detail
FROM pg_policies
WHERE schemaname = 'public'
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, roles::text, cmd
HAVING count(*) > 1
ORDER BY tablename;
