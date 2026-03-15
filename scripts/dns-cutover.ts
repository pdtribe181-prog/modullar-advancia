#!/usr/bin/env npx tsx
/**
 * dns-cutover.ts
 *
 * Adds / updates the two missing Cloudflare DNS records for advanciapayledger.com:
 *
 *   1. www   CNAME  → advanciapayledger.com   (proxied)
 *   2. api   A      → 76.13.77.8              (proxied, VPS on Hostinger)
 *
 * By default this script runs in DRY-RUN mode and only prints what it would do.
 * Pass --execute to actually update DNS.
 *
 * Required env vars (set in .env or export in shell):
 *   CLOUDFLARE_API_TOKEN  – Zone:Edit + Zone:Read permissions
 *   CLOUDFLARE_ZONE_ID    – Zone ID for advanciapayledger.com
 *                           (dash.cloudflare.com → advanciapayledger.com → Overview, right panel)
 *                           Hardcoded fallback: 0bff66558872c58ed5b8b7942acc34d9
 *
 * Usage:
 *   npx tsx scripts/dns-cutover.ts              # dry-run
 *   npx tsx scripts/dns-cutover.ts --execute    # apply changes
 *   npm run dns:cutover
 *   npm run dns:cutover -- --execute
 */

import 'dotenv/config';

// ── Config ───────────────────────────────────────────────────────────────────

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
// Zone ID is stable; fallback to the known value if not overridden in env.
const ZONE_ID =
  process.env.CLOUDFLARE_ZONE_ID ?? '0bff66558872c58ed5b8b7942acc34d9';

const VPS_IP = '76.13.77.8'; // Hostinger VPS — update if IP changes

const DRY_RUN = !process.argv.includes('--execute');

interface DnsRecord {
  id?: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  comment?: string;
}

interface CloudflareListResult {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
}

// ── Cloudflare helpers ───────────────────────────────────────────────────────

async function cfFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  if (!API_TOKEN) {
    throw new Error(
      'Missing CLOUDFLARE_API_TOKEN. ' +
        'Create a token at https://dash.cloudflare.com/profile/api-tokens ' +
        'with Zone:DNS:Edit + Zone:Zone:Read permissions.'
    );
  }

  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json()) as {
    success: boolean;
    errors?: Array<{ message?: string }>;
    result: T;
  };

  if (!res.ok || !body.success) {
    const msg = body.errors?.map((e) => e.message).filter(Boolean).join('; ');
    throw new Error(msg ?? `Cloudflare API error on ${path} (HTTP ${res.status})`);
  }

  return body.result;
}

async function listRecords(name: string): Promise<CloudflareListResult[]> {
  return cfFetch<CloudflareListResult[]>(
    `/zones/${ZONE_ID}/dns_records?name=${encodeURIComponent(name)}&per_page=10`
  );
}

async function createRecord(record: DnsRecord): Promise<CloudflareListResult> {
  return cfFetch<CloudflareListResult>(`/zones/${ZONE_ID}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

async function updateRecord(
  recordId: string,
  patch: Partial<DnsRecord>
): Promise<CloudflareListResult> {
  return cfFetch<CloudflareListResult>(`/zones/${ZONE_ID}/dns_records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// ── Target records ───────────────────────────────────────────────────────────

const TARGETS: DnsRecord[] = [
  {
    type: 'CNAME',
    name: 'www.advanciapayledger.com',
    content: 'advanciapayledger.com',
    proxied: true,
    ttl: 1, // 1 = Auto when proxied
    comment: 'www redirect to apex — added by dns-cutover.ts',
  },
  {
    type: 'A',
    name: 'api.advanciapayledger.com',
    content: VPS_IP,
    proxied: true,
    ttl: 1,
    comment: 'API routed to Hostinger VPS — added by dns-cutover.ts',
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌐  Cloudflare DNS Cutover — advanciapayledger.com');
  console.log(`    Zone   : ${ZONE_ID}`);
  console.log(`    Mode   : ${DRY_RUN ? '🔍 DRY-RUN (pass --execute to apply)' : '🚀 EXECUTE'}`);
  console.log('');

  for (const target of TARGETS) {
    console.log(`  ── ${target.name} (${target.type} → ${target.content})`);

    const existing = await listRecords(target.name);

    if (existing.length === 0) {
      // Record does not exist → create
      if (DRY_RUN) {
        console.log(`     would CREATE ${target.type} ${target.name} → ${target.content}`);
      } else {
        const created = await createRecord(target);
        console.log(`     ✅  created  id=${created.id}`);
      }
    } else {
      const rec = existing[0];
      const sameType = rec.type === target.type;
      const sameContent = rec.content === target.content;
      const sameProxy = rec.proxied === target.proxied;

      if (sameType && sameContent && sameProxy) {
        console.log(`     ⏭️   already correct — no change needed`);
        continue;
      }

      // Record exists but needs updating
      if (!sameType) {
        console.log(
          `     ⚠️  conflicting type: existing=${rec.type}, wanted=${target.type}`
        );
        console.log(
          `         You may need to delete the existing record manually in the dashboard.`
        );
        continue;
      }

      const diff: string[] = [];
      if (!sameContent) diff.push(`content: ${rec.content} → ${target.content}`);
      if (!sameProxy) diff.push(`proxied: ${rec.proxied} → ${target.proxied}`);

      if (DRY_RUN) {
        console.log(`     would UPDATE id=${rec.id} (${diff.join(', ')})`);
      } else {
        const updated = await updateRecord(rec.id, {
          content: target.content,
          proxied: target.proxied,
          ttl: target.ttl,
          comment: target.comment,
        });
        console.log(`     ✅  updated  id=${updated.id} (${diff.join(', ')})`);
      }
    }
    console.log('');
  }

  if (DRY_RUN) {
    console.log('  Run with --execute to apply the changes above.\n');
  } else {
    console.log('  🎉  DNS records applied.');
    console.log('  Note: propagation typically takes 1–5 minutes for proxied records.');
    console.log('  Verify with:  npm run cloudflare:check --verify\n');
  }
}

main().catch((err: unknown) => {
  console.error('\nFatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
