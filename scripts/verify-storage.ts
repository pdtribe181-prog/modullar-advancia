import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

type BucketExpectation = {
  id: string;
  public: boolean;
};

const expectedBuckets: BucketExpectation[] = [
  { id: 'avatars', public: true },
  { id: 'provider-documents', public: false },
  { id: 'medical-records', public: false },
  { id: 'invoice-attachments', public: false },
  { id: 'dispute-evidence', public: false },
  { id: 'message-attachments', public: false },
];

const expectedPolicyNames = [
  'Avatar images are publicly accessible.',
  'Users can upload their own avatar.',
  'Users can update their own avatar.',
  'Users can delete their own avatar.',
  'Providers can view their own documents.',
  'Providers can upload their own documents.',
  'Providers can update their own documents.',
  'Providers can delete their own documents.',
  'Users can view their own medical records.',
  'Providers can upload medical records.',
  'Providers can update medical records.',
  'Providers can delete medical records.',
  'Users can view their own invoice attachments.',
  'Providers can upload invoice attachments.',
  'Providers can update invoice attachments.',
  'Providers can delete invoice attachments.',
  'Users can view their own dispute evidence.',
  'Users can upload their own dispute evidence.',
  'Users can update their own dispute evidence.',
  'Users can delete their own dispute evidence.',
  'Users can view their own message attachments.',
  'Users can upload their own message attachments.',
  'Users can update their own message attachments.',
  'Users can delete their own message attachments.',
];

function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_DB_POOLER_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL
  );
}

async function main() {
  const databaseUrl = process.argv[2] || resolveDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      'Missing database connection string. Run `npx tsx scripts/verify-storage.ts "postgresql://postgres:<password>@db.pikguczsvikzragmrojz.supabase.co:5432/postgres"` or set SUPABASE_DB_POOLER_URL, DATABASE_URL, or SUPABASE_DATABASE_URL.'
    );
  }

  const sql = postgres(databaseUrl, {
    ssl: 'require',
    max: 1,
  });

  try {
    const buckets = await sql<{
      id: string;
      public: boolean;
      file_size_limit: number | null;
      allowed_mime_types: string[] | null;
    }[]>`
      select id, public, file_size_limit, allowed_mime_types
      from storage.buckets
      where id in ${sql(expectedBuckets.map((bucket) => bucket.id))}
      order by id;
    `;

    const policies = await sql<{
      policyname: string;
      cmd: string;
    }[]>`
      select policyname, cmd
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
      order by policyname;
    `;

    const foundBucketMap = new Map(buckets.map((bucket) => [bucket.id, bucket]));
    const missingBuckets = expectedBuckets.filter((bucket) => !foundBucketMap.has(bucket.id));
    const wrongVisibility = expectedBuckets.filter((bucket) => {
      const found = foundBucketMap.get(bucket.id);
      return found && found.public !== bucket.public;
    });

    const foundPolicies = new Set(policies.map((policy) => policy.policyname));
    const missingPolicies = expectedPolicyNames.filter((policyName) => !foundPolicies.has(policyName));

    console.log(`Project storage summary for pikguczsvikzragmrojz`);
    console.log(`Expected buckets: ${expectedBuckets.length}`);
    console.log(`Found buckets: ${buckets.length}`);
    console.log('');

    for (const expected of expectedBuckets) {
      const bucket = foundBucketMap.get(expected.id);
      if (!bucket) {
        console.log(`MISSING  ${expected.id}`);
        continue;
      }

      console.log(
        `OK       ${bucket.id} public=${bucket.public} limit=${bucket.file_size_limit ?? 'null'}`
      );
    }

    console.log('');
    console.log(`Storage object policies found: ${policies.length}`);

    if (missingBuckets.length === 0 && wrongVisibility.length === 0) {
      console.log('Bucket visibility check: PASS');
    } else {
      console.log('Bucket visibility check: FAIL');
    }

    if (missingPolicies.length === 0) {
      console.log('Expected policy names check: PASS');
    } else {
      console.log(`Expected policy names check: FAIL (${missingPolicies.length} missing)`);
      for (const policyName of missingPolicies) {
        console.log(`MISSING POLICY  ${policyName}`);
      }
    }

    if (missingBuckets.length > 0 || wrongVisibility.length > 0 || missingPolicies.length > 0) {
      process.exitCode = 2;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error('Storage verification failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});