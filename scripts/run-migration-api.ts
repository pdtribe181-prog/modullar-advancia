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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

  // Split into individual statements and run each
  // Remove comments and split on semicolons followed by $$ blocks
  const statements = sql
    .split(/;\s*(?=DO\s+\$\$|CREATE|ALTER|DROP|COMMENT|INSERT|UPDATE|DELETE)/gi)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Found ${statements.length} statements to execute`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt.endsWith(';')) {
      statements[i] = stmt + ';';
    }
    
    try {
      // Use rpc to execute raw SQL
      const { error } = await supabase.rpc('exec_sql', { sql_query: statements[i] });
      
      if (error) {
        // Try alternative approach - just log and continue for non-critical errors
        console.log(`Statement ${i + 1}: ${error.message.substring(0, 50)}...`);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err: any) {
      console.log(`Statement ${i + 1} error: ${err.message?.substring(0, 50) || 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log(`\nMigration complete: ${successCount} succeeded, ${errorCount} failed`);
}

runMigration();
