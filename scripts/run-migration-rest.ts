import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

async function runSqlViaRest(sql: string): Promise<{ data: any; error: any }> {
  // Use the PostgREST SQL endpoint (requires service role key)
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  if (!response.ok) {
    // Try alternative: direct query via management API
    return await runSqlViaManagementApi(sql);
  }

  return { data: await response.json(), error: null };
}

async function runSqlViaManagementApi(sql: string): Promise<{ data: any; error: any }> {
  // Supabase Management API for running SQL
  // Requires SUPABASE_ACCESS_TOKEN (personal access token from dashboard)
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!accessToken) {
    return {
      data: null,
      error: {
        message:
          'SUPABASE_ACCESS_TOKEN required for Management API. Get it from: https://supabase.com/dashboard/account/tokens',
      },
    };
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return { data: null, error: { message: errorText, status: response.status } };
  }

  return { data: await response.json(), error: null };
}

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: npx tsx scripts/run-migration-rest.ts <migration-file.sql>');
    console.error('Example: npx tsx scripts/run-migration-rest.ts 022_vault_encryption.sql');
    process.exit(1);
  }

  const migrationPath = join(__dirname, '..', 'migrations', migrationFile);

  // Prevent path traversal — resolved path must stay inside migrations/
  const migrationsDir = join(__dirname, '..', 'migrations');
  const resolvedPath = join(migrationsDir, migrationFile);
  if (!resolvedPath.startsWith(migrationsDir)) {
    console.error('Invalid migration file path (path traversal detected)');
    process.exit(1);
  }
  console.log(`Project: ${projectRef}`);

  let sql: string;
  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read migration file: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`SQL size: ${sql.length} bytes\n`);
  console.log('Executing via Supabase API...');

  const { data, error } = await runSqlViaManagementApi(sql);

  if (error) {
    console.error('\n✗ Migration failed:', error.message);
    if (error.status === 401) {
      console.error('\nTo fix: Add SUPABASE_ACCESS_TOKEN to .env');
      console.error('Get token from: https://supabase.com/dashboard/account/tokens');
    }
    process.exit(1);
  }

  console.log('\n✓ Migration completed successfully!');
  if (data) {
    console.log('Result:', JSON.stringify(data, null, 2));
  }
}

runMigration();
