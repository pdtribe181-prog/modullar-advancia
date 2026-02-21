/**
 * Extract SQL from migration files for manual execution
 * Creates clean SQL-only files ready to paste into Supabase SQL Editor
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function extractMigrationSQL() {
  const migrationsDir = join(__dirname, '..', 'migrations');
  const outputDir = join(__dirname, '..', 'migrations-ready');

  // Create output directory
  try {
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create output directory:', err);
  }

  const files = readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith('.sql') && parseInt(f.split('_')[0]) >= 12)
    .sort((a: string, b: string) => {
      const numA = parseInt(a.split('_')[0]);
      const numB = parseInt(b.split('_')[0]);
      return numA - numB;
    });

  console.log('\n🚀 EXTRACTING SQL FROM MIGRATIONS\n');
  console.log(`📁 Output directory: ${outputDir}\n`);

  files.forEach((file: string, idx: number) => {
    console.log(`\n${idx + 1}. Processing: ${file}`);

    const inputPath = join(migrationsDir, file);
    const sqlContent = readFileSync(inputPath, 'utf-8');

    // Clean up: just the raw SQL
    const cleanSql = sqlContent.trim();

    // Create output file
    const outputPath = join(outputDir, file);
    writeFileSync(outputPath, cleanSql, 'utf-8');

    // Show file size
    const sizeKb = (Buffer.byteLength(cleanSql) / 1024).toFixed(2);
    console.log(`   ✅ Saved: ${sizeKb} KB`);
    console.log(`   📍 Run in: ${file}`);
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n✅ ALL SQL FILES READY FOR MANUAL EXECUTION\n`);
  console.log(`📂 Location: ${outputDir}\n`);

  console.log(`🔗 SUPABASE SQL EDITOR:`);
  console.log(`   https://supabase.com/dashboard/project/pikguczsvikzragmrojz/sql/new\n`);

  console.log(`📋 EXECUTION STEPS:\n`);
  console.log(`   STEP 1: Open Supabase SQL Editor (link above)`);
  console.log(`   STEP 2: For each migration file below (in order):`);
  console.log(`      a) Open file from migrations-ready/ folder`);
  console.log(`      b) Select All (Ctrl+A) → Copy (Ctrl+C)`);
  console.log(`      c) Paste into SQL Editor (Ctrl+V)`);
  console.log(`      d) Click "Run" button`);
  console.log(`      e) Verify green checkmark ✓ in Results\n`);

  console.log(`📌 FILE EXECUTION ORDER:\n`);
  files.forEach((file: string, idx: number) => {
    console.log(`   ${String(idx + 1).padStart(2)}. ${file}`);
  });

  console.log(`\n⏱️  TOTAL TIME: ~30-40 minutes`);
  console.log(`\n${'='.repeat(80)}\n`);
}

extractMigrationSQL().catch(console.error);
