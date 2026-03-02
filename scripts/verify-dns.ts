#!/usr/bin/env npx tsx
/**
 * DNS Records Verification Script
 * ---
 * Checks all required DNS records for advanciapayledger.com
 *
 * Usage:
 *   npx tsx scripts/verify-dns.ts
 *   npx tsx scripts/verify-dns.ts --domain custom-domain.com
 */

import { resolve as dnsResolve } from 'node:dns';
import { promisify } from 'node:util';

const resolveTxt = promisify(dnsResolve as any).bind(null) as unknown as (
  hostname: string,
  rrtype: string
) => Promise<string[][]>;
const resolveA = promisify(dnsResolve as any).bind(null) as unknown as (
  hostname: string,
  rrtype: string
) => Promise<string[]>;
const resolveCname = promisify(dnsResolve as any).bind(null) as unknown as (
  hostname: string,
  rrtype: string
) => Promise<string[]>;
const resolveMx = promisify(dnsResolve as any).bind(null) as unknown as (
  hostname: string,
  rrtype: string
) => Promise<Array<{ exchange: string; priority: number }>>;

import dns from 'node:dns';
const resolver = new dns.Resolver();
// Use Cloudflare + Google public DNS
resolver.setServers(['1.1.1.1', '8.8.8.8']);

const resolve4 = promisify(resolver.resolve4.bind(resolver));
const resolve6 = promisify(resolver.resolve6.bind(resolver));
const resolveTxtR = promisify(resolver.resolveTxt.bind(resolver));
const resolveCnameR = promisify(resolver.resolveCname.bind(resolver));
const resolveMxR = promisify(resolver.resolveMx.bind(resolver));

// CLI args
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const DOMAIN = getArg('domain', 'advanciapayledger.com');

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
}

const results: CheckResult[] = [];

async function checkRecord(
  name: string,
  queryFn: () => Promise<any>,
  validate: (data: any) => { pass: boolean; detail: string }
) {
  try {
    const data = await queryFn();
    const { pass, detail } = validate(data);
    results.push({ name, status: pass ? 'PASS' : 'WARN', detail });
  } catch (err: any) {
    if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
      results.push({ name, status: 'FAIL', detail: 'Record not found' });
    } else {
      results.push({ name, status: 'FAIL', detail: err.message });
    }
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║     Advancia PayLedger - DNS Verification         ║
╠══════════════════════════════════════════════════╣
║  Domain: ${DOMAIN.padEnd(40)}║
╚══════════════════════════════════════════════════╝
  `);

  // 1. Root A record
  await checkRecord(
    `A record (${DOMAIN})`,
    () => resolve4(DOMAIN),
    (ips: string[]) => ({
      pass: ips.length > 0,
      detail: ips.length > 0 ? `Resolves to: ${ips.join(', ')}` : 'No A record',
    })
  );

  // 2. API subdomain A record
  await checkRecord(
    `A record (api.${DOMAIN})`,
    () => resolve4(`api.${DOMAIN}`),
    (ips: string[]) => ({
      pass: ips.length > 0,
      detail: ips.length > 0 ? `Resolves to: ${ips.join(', ')}` : 'No A record for api subdomain',
    })
  );

  // 3. WWW CNAME
  await checkRecord(
    `CNAME (www.${DOMAIN})`,
    () => resolveCnameR(`www.${DOMAIN}`),
    (targets: string[]) => ({
      pass: targets.length > 0,
      detail: targets.length > 0 ? `Points to: ${targets.join(', ')}` : 'No CNAME for www',
    })
  );

  // 4. SPF record
  await checkRecord(
    `TXT/SPF (${DOMAIN})`,
    () => resolveTxtR(DOMAIN),
    (records: string[][]) => {
      const flat = records.map((r: string[]) => r.join(''));
      const spf = flat.find((r: string) => r.startsWith('v=spf1'));
      return {
        pass: !!spf,
        detail: spf ? `SPF: ${spf.slice(0, 80)}` : 'No SPF record found',
      };
    }
  );

  // 5. DKIM record (Resend)
  await checkRecord(
    `TXT/DKIM (resend._domainkey.${DOMAIN})`,
    () => resolveTxtR(`resend._domainkey.${DOMAIN}`),
    (records: string[][]) => {
      const flat = records.map((r: string[]) => r.join(''));
      const dkim = flat.find(
        (r: string) => r.includes('DKIM') || r.startsWith('v=DKIM1') || r.startsWith('p=')
      );
      return {
        pass: !!dkim,
        detail: dkim
          ? `DKIM: ${dkim.slice(0, 60)}...`
          : `Found: ${flat[0]?.slice(0, 60) || 'empty'}`,
      };
    }
  );

  // 6. DMARC record
  await checkRecord(
    `TXT/DMARC (_dmarc.${DOMAIN})`,
    () => resolveTxtR(`_dmarc.${DOMAIN}`),
    (records: string[][]) => {
      const flat = records.map((r: string[]) => r.join(''));
      const dmarc = flat.find((r: string) => r.startsWith('v=DMARC1'));
      return {
        pass: !!dmarc,
        detail: dmarc
          ? `DMARC: ${dmarc}`
          : 'No DMARC record — add _dmarc TXT record (see scripts/dns-records-to-add.md)',
      };
    }
  );

  // 7. MX records
  await checkRecord(
    `MX (${DOMAIN})`,
    () => resolveMxR(DOMAIN),
    (records: Array<{ exchange: string; priority: number }>) => ({
      pass: records.length > 0,
      detail:
        records.length > 0
          ? records.map((r) => `${r.priority} ${r.exchange}`).join(', ')
          : 'No MX records',
    })
  );

  // 8. Check SSL/TLS via HTTPS fetch
  await checkRecord(
    `HTTPS (https://${DOMAIN})`,
    async () => {
      const resp = await fetch(`https://${DOMAIN}`, { signal: AbortSignal.timeout(10000) });
      return resp;
    },
    (resp: Response) => ({
      pass: resp.status < 500,
      detail: `Status: ${resp.status} ${resp.statusText}`,
    })
  );

  // 9. Check API health endpoint (server exposes GET /health at root, not under /api/v1)
  await checkRecord(
    `API Health (https://api.${DOMAIN}/health)`,
    async () => {
      const resp = await fetch(`https://api.${DOMAIN}/health`, {
        signal: AbortSignal.timeout(10000),
      });
      return resp;
    },
    (resp: Response) => ({
      pass: resp.status === 200,
      detail: `Status: ${resp.status} ${resp.statusText}`,
    })
  );

  // ── Report ──
  console.log('  Results:');
  console.log('  ─────────────────────────────────────────────────');
  const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠ ' };
  for (const r of results) {
    console.log(`  ${icons[r.status]}  ${r.name}`);
    console.log(`      ${r.detail}`);
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`
╔══════════════════════════════════════════════════╗
║                    SUMMARY                        ║
╠══════════════════════════════════════════════════╣
  ✅ Passed:  ${passed}
  ⚠  Warned:  ${warned}
  ❌ Failed:  ${failed}
  Total:     ${results.length}
╚══════════════════════════════════════════════════╝
  `);

  if (failed > 0) {
    console.log('  Action required:');
    for (const r of results.filter((r) => r.status === 'FAIL')) {
      console.log(`    → ${r.name}: ${r.detail}`);
    }
    console.log('');
    console.log('  See scripts/dns-records-to-add.md for instructions.\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('DNS verification failed:', err);
  process.exit(1);
});
