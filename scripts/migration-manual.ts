#!/usr/bin/env node
/**
 * MANUAL MIGRATION EXECUTION GUIDE
 *
 * Complete all remaining migrations 012-030 using Supabase SQL Editor
 * This guide provides step-by-step instructions
 */

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateMigrationGuide() {
  const migrationsDir = join(__dirname, '..', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && parseInt(f.split('_')[0]) >= 12)
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[0]);
      const numB = parseInt(b.split('_')[0]);
      return numA - numB;
    });

  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║' + '  🚀 COMPLETE REMAINING MIGRATIONS (012-030)'.padEnd(78) + '║');
  console.log('║' + '  Execute in Supabase SQL Editor for full database setup'.padEnd(78) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  console.log('\n📌 QUICK START:\n');
  console.log('1️⃣  Open: https://supabase.com/dashboard/project/pikguczsvikzragmrojz/sql/new');
  console.log('2️⃣  For each migration below (in order):\n');
  console.log('   a) Copy the SQL content from the file');
  console.log('   b) Paste into Supabase SQL Editor');
  console.log('   c) Click "Run" button');
  console.log('   d) Check "Results" tab for success/errors');
  console.log('   e) Move to next migration\n');
  console.log('   ⏱️  Estimated time: 20-30 minutes total\n');

  console.log('═'.repeat(80));
  console.log('\n📋 MIGRATIONS TO EXECUTE (in this order):\n');

  files.forEach((file, idx) => {
    const num = parseInt(file.split('_')[0]);
    const filePath = join(migrationsDir, file);
    const sqlContent = readFileSync(filePath, 'utf-8');
    const lineCount = sqlContent.split('\n').length;
    const preview = sqlContent
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('--'))
      .slice(0, 2)
      .map((l) => l.trim().substring(0, 60))
      .join(' ');

    console.log(`\n📌 STEP ${idx + 1} of ${files.length}`);
    console.log(`   File: ${file}`);
    console.log(`   Lines: ${lineCount}`);
    console.log(`   Content: ${preview}...`);
    console.log(`   Status: ⏳ PENDING MANUAL EXECUTION`);
  });

  console.log('\n\n' + '═'.repeat(80));
  console.log('\n✅ MIGRATION CHECKLIST:\n');

  files.forEach((file, idx) => {
    const num = parseInt(file.split('_')[0]);
    console.log(`   ${String(idx + 1).padStart(2)}. ☐ ${file}`);
  });

  console.log('\n\n' + '═'.repeat(80));
  console.log('\n📖 DETAILED INSTRUCTIONS:\n');

  files.forEach((file, idx) => {
    const num = parseInt(file.split('_')[0]);
    const filePath = join(migrationsDir, file);
    const sqlContent = readFileSync(filePath, 'utf-8');

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`\n📝 STEP ${idx + 1}: ${file}\n`);

    // Show first 500 chars as preview
    const preview = sqlContent.substring(0, 500);
    console.log('Preview of SQL content:');
    console.log('─'.repeat(80));
    console.log(preview + (sqlContent.length > 500 ? '\n... (file continues) ...' : ''));
    console.log('─'.repeat(80));

    console.log('\n✅ What to do:');
    console.log(
      `   1. Navigate to: c:\\Users\\mucha.DESKTOP-H7T9NPM\\modullar-advancia\\migrations\\${file}`
    );
    console.log(`   2. Copy ALL content from this file`);
    console.log(`   3. Paste into Supabase SQL Editor`);
    console.log(`   4. Click "Run"`);
    console.log(`   5. ✓ Mark as complete when Results show success (green checkmark)\n`);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('\n🎯 AFTER ALL MIGRATIONS ARE COMPLETE:\n');
  console.log('   ✅ Run: npm run test:connection');
  console.log('   ✅ Run: npm run dev');
  console.log('   ✅ Start: npm run dev (frontend)\n');
  console.log('   Your database will be 100% ready for production!\n');

  console.log('═'.repeat(80));
  console.log('\n💡 TROUBLESHOOTING:\n');
  console.log('   ❌ Error "function X does not exist"');
  console.log('      → Run migrations in sequential order (012 before 013, etc)\n');
  console.log('   ❌ Error "relation X does not exist"');
  console.log('      → Make sure previous migrations completed successfully\n');
  console.log('   ❌ Timeout or connection error');
  console.log('      → Refresh Supabase Dashboard and try again\n');

  console.log('═'.repeat(80));
  console.log('\n🔗 LINKS:\n');
  console.log('   SQL Editor: https://supabase.com/dashboard/project/pikguczsvikzragmrojz/sql/new');
  console.log('   Dashboard:  https://supabase.com/dashboard/project/pikguczsvikzragmrojz');
  console.log('   Docs:       https://supabase.com/docs/guides/database/connecting-to-postgres\n');

  console.log('═'.repeat(80));
  console.log('\n⏱️  Time Estimate:\n');
  console.log(`   • ${files.length} migrations to execute`);
  console.log(`   • ~1.5-2 minutes per migration`);
  console.log(
    `   • Total: ~${Math.ceil(files.length * 1.5)}-${Math.ceil(files.length * 2)} minutes\n`
  );

  console.log('═'.repeat(80));
  console.log('\n✨ Your Advancia PayLedger platform will be fully configured!\n');
}

generateMigrationGuide();
