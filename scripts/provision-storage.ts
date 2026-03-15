#!/usr/bin/env npx tsx
/**
 * provision-storage.ts
 *
 * Idempotently creates the six Supabase Storage buckets required by the
 * PayLedger upload middleware (src/middleware/upload.middleware.ts).
 *
 * Required env vars (set in .env or export in shell):
 *   SUPABASE_URL             – https://pikguczsvikzragmrojz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY – service_role JWT (NOT the anon key)
 *
 * Usage:
 *   npx tsx scripts/provision-storage.ts
 *   npm run provision:storage
 *
 * After buckets are created, apply the RLS policies by running
 * scripts/payledger-storage-bootstrap.sql in the Supabase SQL Editor, or via:
 *   npx tsx scripts/run-migration-rest.ts   (requires SUPABASE_ACCESS_TOKEN)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ── Env validation ──────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌  Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  );
  console.error('    Copy .env.example → .env and fill in the Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Bucket definitions — must stay in sync with BUCKET_CONFIGS in ────────────
// ── src/middleware/upload.middleware.ts                             ────────────

interface BucketDef {
  id: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

const BUCKETS: BucketDef[] = [
  {
    id: 'avatars',
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  {
    id: 'provider-documents',
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    id: 'medical-records',
    public: false,
    fileSizeLimit: 100 * 1024 * 1024, // 100 MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/dicom',
      'image/dicom-rle',
    ],
  },
  {
    id: 'invoice-attachments',
    public: false,
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    id: 'dispute-evidence',
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'video/mp4',
      'audio/mpeg',
    ],
  },
  {
    id: 'message-attachments',
    public: false,
    fileSizeLimit: 20 * 1024 * 1024, // 20 MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
    ],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const projectRef = SUPABASE_URL!.replace('https://', '').replace('.supabase.co', '');

  console.log('\n🗄️  Supabase Storage Provisioner');
  console.log(`   Project : ${projectRef}`);
  console.log(`   Buckets : ${BUCKETS.length}`);
  console.log('');

  let created = 0;
  let alreadyExist = 0;
  let errors = 0;

  for (const bucket of BUCKETS) {
    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
    });

    if (!error) {
      const vis = bucket.public ? 'public ' : 'private';
      console.log(`  ✅  created   ${vis}  ${bucket.id}`);
      created++;
    } else if (
      error.message?.toLowerCase().includes('already exists') ||
      error.message?.toLowerCase().includes('duplicate')
    ) {
      console.log(`  ⏭️   exists             ${bucket.id}`);
      alreadyExist++;
    } else {
      console.error(`  ❌  failed    —  ${bucket.id}: ${error.message}`);
      errors++;
    }
  }

  console.log('');
  console.log(
    `  Summary: ${created} created, ${alreadyExist} already present, ${errors} errors`
  );

  if (errors > 0) {
    console.error(
      '\n  ⚠️  One or more buckets could not be provisioned.\n' +
        '     Verify that SUPABASE_SERVICE_ROLE_KEY is the service_role JWT\n' +
        '     (found in Supabase Dashboard → Project Settings → API).'
    );
    process.exit(1);
  }

  console.log('\n  🎉  All storage buckets are ready.');

  if (created > 0) {
    console.log('');
    console.log('  Next: apply RLS policies.');
    console.log(
      '  Option A — SQL Editor: paste scripts/payledger-storage-bootstrap.sql'
    );
    console.log(
      '  Option B — Management API:\n' +
        '    SUPABASE_ACCESS_TOKEN=<token> npx tsx scripts/run-migration-rest.ts payledger-storage-bootstrap.sql'
    );
    console.log('');
    console.log('  Then verify everything with:  npm run verify:storage');
  }
  console.log('');
}

main().catch((err: unknown) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
