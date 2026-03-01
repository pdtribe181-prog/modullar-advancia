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

async function checkColumns() {
  const tableName = process.argv[2] || 'email_templates';
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}';`,
  });

  if (error) {
    console.error('Error:', error);
    // Fallback to a direct query if rpc doesn't exist
    const { data: tableData, error: tableError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    if (tableError) {
      console.error('Table Error:', tableError);
    } else {
      console.log('Table Data:', tableData);
    }
  } else {
    console.log('Columns:', data);
  }
}

checkColumns();
