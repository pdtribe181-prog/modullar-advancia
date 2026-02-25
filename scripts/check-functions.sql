-- Functions in public schema with mutable search_path
SELECT p.proname as function_name,
       pg_get_function_arguments(p.oid) as args,
       p.proconfig::text as config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (
    p.proconfig IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
    )
  )
ORDER BY p.proname;
