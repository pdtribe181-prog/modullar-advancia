import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%( SELECT auth.uid()%')
         OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%( SELECT auth.uid()%');
    `,
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Policies with auth.uid():', data);
  }
}

checkPolicies();
