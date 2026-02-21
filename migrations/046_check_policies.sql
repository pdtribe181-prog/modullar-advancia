SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE (qual LIKE '%current_setting(%' AND qual NOT LIKE '%( SELECT current_setting(%')
   OR (with_check LIKE '%current_setting(%' AND with_check NOT LIKE '%( SELECT current_setting(%');
