import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Extract connection details from SUPABASE_URL
// Format: https://[project-ref].supabase.co
const supabaseUrl = process.env.SUPABASE_URL!;
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

// Supabase connection options:
// 1. DATABASE_URL - full connection string (preferred)
// 2. Direct database connection (port 5432)
// Format: postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
const connectionString = process.env.DATABASE_URL || 
  `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.${projectRef}.supabase.co:5432/postgres`;

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Usage: npx tsx scripts/run-migration-pg.ts <migration-file.sql>');
    console.error('Example: npx tsx scripts/run-migration-pg.ts 022_vault_encryption.sql');
    process.exit(1);
  }
  
  const migrationPath = join(__dirname, '..', 'migrations', migrationFile);
  
  console.log(`Running migration: ${migrationFile}`);
  
  let sql: string;
  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read migration file: ${migrationPath}`);
    process.exit(1);
  }

  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_PASSWORD) {
    console.error('\nMissing database credentials!');
    console.error('Add one of the following to your .env file:');
    console.error('  DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres');
    console.error('  SUPABASE_DB_PASSWORD=[your-database-password]');
    console.error('\nYou can find your database password in Supabase Dashboard:');
    console.error('  Settings > Database > Connection string > Password');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');
    
    console.log('Executing migration...');
    await client.query(sql);
    
    console.log('\n✓ Migration completed successfully!');
  } catch (err: any) {
    console.error('\n✗ Migration failed:', err.message);
    
    // Show more context for syntax errors
    if (err.position) {
      const pos = parseInt(err.position);
      const context = sql.substring(Math.max(0, pos - 100), pos + 100);
      console.error('\nError near:\n', context);
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
