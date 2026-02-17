import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore - pg module types
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const { Pool } = pg;

// Supabase pooler connection (session mode)
const connectionString = `postgresql://postgres.pikguczsvikzragmrojz:hrW2LjBFeUT6dLdD@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

async function runMigration() {
  const migrationFile = process.argv[2] || '015_stripe_integration.sql';
  const migrationPath = join(__dirname, '..', 'migrations', migrationFile);
  
  console.log(`Running migration: ${migrationFile}`);
  
  let sql: string;
  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read migration file: ${migrationPath}`);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('Connected to Supabase PostgreSQL');
    
    await client.query(sql);
    console.log('Migration completed successfully!');
    
    client.release();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
