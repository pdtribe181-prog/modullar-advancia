/**
 * Run Supabase Migrations via Management API
 * Uses the Supabase Management API to execute SQL directly
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN!;

// Extract project ref from URL (e.g., https://abc123.supabase.co -> abc123)
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

async function runMigration() {
  if (!accessToken) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not set in .env');
    console.log('Get it from: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: npx tsx scripts/run-migration-direct.ts <migration_file.sql>');
    process.exit(1);
  }

  const migrationPath = join(__dirname, '..', 'migrations', migrationFile);

  // Prevent path traversal — resolved path must stay inside migrations/
  const migrationsDir = join(__dirname, '..', 'migrations');
  const resolvedPath = join(migrationsDir, migrationFile);
  if (!resolvedPath.startsWith(migrationsDir)) {
    console.error('❌ Invalid migration file path (path traversal detected)');
    process.exit(1);
  }

  console.log(`\n📝 Running migration: ${migrationFile}`);
  console.log(`📦 Project: ${projectRef}`);

  let sql: string;
  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch (err) {
    console.error(`❌ Failed to read migration file: ${migrationPath}`);
    process.exit(1);
  }

  console.log(`📄 SQL length: ${sql.length} characters\n`);

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Migration failed (${response.status}):`);
      console.error(errorText);
      process.exit(1);
    }

    const result = await response.json();

    if (result.error) {
      console.error('❌ Migration error:', result.error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');

    if (Array.isArray(result) && result.length > 0) {
      console.log(`📊 Results: ${result.length} statement(s) executed`);
    }

  } catch (err: any) {
    console.error('❌ Request failed:', err.message);
    process.exit(1);
  }
}

runMigration();
