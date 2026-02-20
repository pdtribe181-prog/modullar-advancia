import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false },
});

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
  console.log('\n🚀 Starting batch migration execution\n');

  const migrationFiles = await getMigrationFiles();
  console.log(`📋 Found ${migrationFiles.length} migration files:\n`);
  migrationFiles.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  let filesSucceeded = 0;
  let filesFailed = 0;
  const failedFiles: string[] = [];
  const startTime = Date.now();

  for (let fileIdx = 0; fileIdx < migrationFiles.length; fileIdx++) {
    const migrationFile = migrationFiles[fileIdx];
    const migrationPath = join(__dirname, '..', 'migrations', migrationFile);

    console.log(`\n📝 [${fileIdx + 1}/${migrationFiles.length}] Running: ${migrationFile}`);

    let sql: string;
    try {
      sql = readFileSync(migrationPath, 'utf-8');
    } catch (err) {
      console.error(`   ❌ Failed to read file`);
      filesFailed++;
      failedFiles.push(migrationFile);
      continue;
    }

    // Clean up SQL: remove comments and trim whitespace
    const cleanedSql = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();

    if (!cleanedSql) {
      console.log(`   ⏭️  Skipped (empty migration)`);
      filesSucceeded++;
      continue;
    }

    try {
      // Execute the entire SQL file as one query to preserve DO $$ blocks
      const { error, data } = await supabase.rpc('exec_sql', {
        sql_query: cleanedSql,
      });

      if (error) {
        console.error(`   ❌ Migration failed: ${error.message}`);
        filesFailed++;
        failedFiles.push(migrationFile);
      } else {
        console.log(`   ✅ Migration succeeded`);
        filesSucceeded++;
      }
    } catch (err: any) {
      const errorMsg = err.message?.substring(0, 100) || 'Unknown error';
      console.error(`   ❌ Migration failed: ${errorMsg}`);
      filesFailed++;
      failedFiles.push(migrationFile);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n📊 BATCH MIGRATION COMPLETE\n`);
  console.log(`   Total files: ${filesSucceeded + filesFailed}/${migrationFiles.length}`);
  console.log(`   ✅ Succeeded: ${filesSucceeded}`);
  console.log(`   ❌ Failed: ${filesFailed}`);
  console.log(`   Duration: ${duration}s\n`);

  if (failedFiles.length > 0) {
    console.log(`❌ FAILED MIGRATIONS:\n`);
    failedFiles.forEach((f, idx) => {
      console.log(`   ${idx + 1}. ${f}`);
    });

    console.log(`\n💡 NEXT STEPS:`);
    console.log(`   1. Review failed migrations above`);
    console.log(`   2. Execute manually in Supabase SQL Editor:`);
    console.log(`      https://supabase.com/dashboard/project/pikguczsvikzragmrojz/sql`);
    console.log(`   3. Or re-run this script after fixing:\n`);
    console.log(`      npx tsx scripts/run-all-migrations.ts\n`);

    if (filesSucceeded > 0) {
      console.log(`⚠️  Partial success: ${filesSucceeded} migrations completed\n`);
    }

    process.exit(filesFailed > 0 ? 1 : 0);
  }

  console.log(`\n✅ All migrations executed successfully! 🎉\n`);
  console.log(`Next steps:`);
  console.log(`   1. npm run dev        # Start development server`);
  console.log(`   2. npm run build:prod # Build for production\n`);
}

runAllMigrations().catch((err) => {
  console.error('🔥 Fatal error:', err.message);
  process.exit(1);
});
