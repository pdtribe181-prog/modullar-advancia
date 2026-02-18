import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
const accessToken = process.env.SUPABASE_ACCESS_TOKEN!;

async function runQuery(sql: string): Promise<any> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query: sql })
  });
  return response.json();
}

async function main() {
  console.log('Checking database tables...\n');
  
  const tables = await runQuery(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  
  console.log('Tables:', tables.map((t: any) => t.table_name).join(', '));
  
  const enums = await runQuery(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname IN ('user_role', 'payment_plan_status', 'payment_frequency', 'claim_status')
    GROUP BY t.typname;
  `);
  
  console.log('\nEnums:');
  enums.forEach((e: any) => console.log(`  ${e.typname}: ${e.values.join(', ')}`));
}

main();
