/**
 * Direct PostgreSQL Migration Runner
 * Connects directly to PostgreSQL (bypasses Supabase REST API limitations)
 * Requires: postgres package (npm install postgres)
 */

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Supabase PostgreSQL connection details
const supabaseUrl = process.env.SUPABASE_URL!;
const supabasePassword = process.env.SUPABASE_DB_PASSWORD!;

// Extract project ref and build direct DB host
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
const dbHost = `db.${projectRef}.supabase.co`;

const connectionString = `postgresql://postgres:${encodeURIComponent(supabasePassword)}@${dbHost}:5432/postgres`;

console.log(`\n🔐 Connecting to PostgreSQL: ${dbHost}`);
console.log(`📝 Connection string: postgresql://postgres:***@${dbHost}:5432/postgres\n`);

async function getMigrationFiles(): Promise<string[]> {
  const migrationsDir = join(__dirname, '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[0]);
      const numB = parseInt(b.split('_')[0]);
      return numA - numB;
    });

  return files;
}

async function runAllMigrations() {
  console.log('🚀 Starting direct PostgreSQL migration execution\n');

  // Dynamic import to allow graceful failure if postgres not installed
  let sql: any;
  try {
    const postgresModule = await import('postgres');
    sql = postgresModule.default ?? postgresModule;
  } catch (err) {
    console.error(
      '❌ Error: postgres package not found!\n',
      '💡 Install it with: npm install postgres\n'
    );
    process.exit(1);
  }

  const migrationFiles = await getMigrationFiles();
  console.log(`📋 Found ${migrationFiles.length} migration files:\n`);
  migrationFiles.slice(11).forEach((f, i) => console.log(`   ${i + 12}. ${f}`));

  let filesSucceeded = 0;
  let filesFailed = 0;
  const failedFiles: string[] = [];
  const startTime = Date.now();

  try {
    // Execute remaining migrations (assuming 001-011 already ran)
    for (let fileIdx = 11; fileIdx < migrationFiles.length; fileIdx++) {
      const migrationFile = migrationFiles[fileIdx];
      const migrationPath = join(__dirname, '..', 'migrations', migrationFile);

      console.log(`\n📝 [${fileIdx + 1}/${migrationFiles.length}] Running: ${migrationFile}`);

      let sqlContent: string;
      try {
        sqlContent = readFileSync(migrationPath, 'utf-8');
      } catch (err) {
        console.error(`   ❌ Failed to read file`);
        filesFailed++;
        failedFiles.push(migrationFile);
        continue;
      }

      // Clean up SQL: remove comments
      const cleanedSql = sqlContent
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim();

      if (!cleanedSql) {
        console.log(`   ⏭️  Skipped (empty migration)`);
        filesSucceeded++;
        continue;
      }

      // Create a fresh connection per migration to isolate failures
      let client: any;
      try {
        client = sql(connectionString);
        await client.unsafe(cleanedSql);
        console.log(`   ✅ Migration succeeded`);
        filesSucceeded++;
      } catch (err: any) {
        console.error(err);
        const errorMsg = err.message?.substring(0, 150) || 'Unknown error';
        console.error(`   ❌ Migration failed`);
        console.error(`   → ${errorMsg}\n`);
        filesFailed++;
        failedFiles.push(migrationFile);
      } finally {
        if (client) await client.end();
      }
    }
  } catch (err: any) {
    console.error('Fatal error:', err.message);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n📊 MIGRATION COMPLETION REPORT\n`);
  console.log(`   Total files: ${filesSucceeded + filesFailed}/${migrationFiles.length - 11}`);
  console.log(`   ✅ Succeeded: ${filesSucceeded}`);
  console.log(`   ❌ Failed: ${filesFailed}`);
  console.log(`   Duration: ${duration}s\n`);

  if (failedFiles.length > 0) {
    console.log(`❌ FAILED MIGRATIONS:\n`);
    failedFiles.forEach((f, idx) => {
      console.log(`   ${idx + 1}. ${f}`);
    });

    console.log(`\n💡 TROUBLESHOOTING:`);
    console.log(`   1. Check error messages above`);
    console.log(`   2. Review migration SQL file for syntax issues`);
    console.log(`   3. Re-run this script:\n`);
    console.log(`      npx tsx scripts/run-migrations-direct.ts\n`);

    process.exit(1);
  }

  console.log(`✅ All migrations executed successfully! 🎉\n`);
  console.log(`Next steps:`);
  console.log(`   1. npm run dev        # Start development server`);
  console.log(`   2. npm run test:connection  # Verify database\n`);
}

runAllMigrations().catch((err) => {
  console.error('🔥 Fatal error:', err.message);
  process.exit(1);
});
