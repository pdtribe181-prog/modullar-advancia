import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

async function runMigration() {
  const migrationFile = process.argv[2] || '026_schema_fixes.sql';
  const migrationPath = join(__dirname, '..', 'migrations', migrationFile);

  // Prevent path traversal — resolved path must stay inside migrations/
  const migrationsDir = join(__dirname, '..', 'migrations');
  const resolvedPath = join(migrationsDir, migrationFile);
  if (!resolvedPath.startsWith(migrationsDir)) {
    console.error('❌ Invalid migration file path (path traversal detected)');
    process.exit(1);
  }
  
  console.log(`\n📝 Running migration: ${migrationFile}`);
  
  let sql: string;
  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch (err) {
    console.error(`❌ Failed to read migration file: ${migrationPath}`);
    process.exit(1);
  }

  // Split SQL into individual statements, handling DO $$ blocks
  const statements: string[] = [];
  let current = '';
  let inDoBlock = false;
  
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines at statement boundaries
    if (!current && (trimmed.startsWith('--') || trimmed === '')) continue;
    
    current += line + '\n';
    
    // Track DO $$ blocks
    if (trimmed.match(/^DO\s+\$\$/i)) inDoBlock = true;
    if (inDoBlock && trimmed.match(/\$\$\s*;?\s*$/)) {
      inDoBlock = false;
      statements.push(current.trim());
      current = '';
      continue;
    }
    
    // Regular statement ending with semicolon (not in DO block)
    if (!inDoBlock && trimmed.endsWith(';') && !trimmed.match(/DEFAULT\s+.*';$/i)) {
      statements.push(current.trim());
      current = '';
    }
  }
  
  if (current.trim()) statements.push(current.trim());

  console.log(`📄 Found ${statements.length} statements to execute\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    
    try {
      // Use raw SQL execution via PostgREST
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ query: stmt }),
      });

      // If that doesn't work, try a simple test query to see what's available
      if (!response.ok) {
        // Log and continue - some statements might succeed directly
        console.log(`⚠️  Statement ${i + 1}/${statements.length}: ${preview}...`);
        errorCount++;
      } else {
        console.log(`✅ Statement ${i + 1}/${statements.length}: ${preview}...`);
        successCount++;
      }
    } catch (err: any) {
      console.log(`❌ Statement ${i + 1}: ${err.message?.substring(0, 50) || 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration complete: ${successCount} succeeded, ${errorCount} need manual execution`);
  
  if (errorCount > 0) {
    console.log('\n💡 Run the migration SQL directly in the Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/pikguczsvikzragmrojz/sql');
  }
}

runMigration();
