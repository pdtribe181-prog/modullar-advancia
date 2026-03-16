#!/usr/bin/env npx tsx
/**
 * DNS Records Verification Script
 * ---
 * Checks all required DNS records for advanciapayledger.com
 *
 * Usage:
 *   npx tsx scripts/verify-dns.ts
 *   npx tsx scripts/verify-dns.ts --domain custom-domain.com
 *   npx tsx scripts/verify-dns.ts --strict
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
const STRICT = args.includes('--strict');
const IS_PAYLEDGER = DOMAIN === 'advanciapayledger.com';
const IS_HEALTHCARE = DOMAIN === 'advancia-healthcare.com';
const IS_PAYROLL = DOMAIN === 'advanciapayroll.com';

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
}

const results: CheckResult[] = [];

function pushResult(name: string, status: 'PASS' | 'FAIL' | 'WARN', detail: string) {
  results.push({ name, status, detail });
}

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

async function checkHttps(url: string, timeoutMs = 20000): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'manual',
    method: 'GET',
  });
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
  if (IS_PAYLEDGER) {
    await checkRecord(
      `A record (api.${DOMAIN})`,
      () => resolve4(`api.${DOMAIN}`),
      (ips: string[]) => ({
        pass: ips.length > 0,
        detail: ips.length > 0 ? `Resolves to: ${ips.join(', ')}` : 'No A record for api subdomain',
      })
    );
  } else if (IS_HEALTHCARE) {
    pushResult(
      `A record (api.${DOMAIN})`,
      'WARN',
      'Not required in the current live setup. Healthcare frontend is live, but no separate api.advancia-healthcare.com host is configured.'
    );
  } else if (IS_PAYROLL) {
    pushResult(
      `A record (api.${DOMAIN})`,
      'WARN',
      'Not required. Payroll is expected to remain a redirect-only domain, not an app or API host.'
    );
  }

  // 3. WWW CNAME
  // Some setups use only redirect rules for www without an explicit CNAME.
  try {
    const targets = await resolveCnameR(`www.${DOMAIN}`);
    pushResult(
      `CNAME (www.${DOMAIN})`,
      targets.length > 0 ? 'PASS' : 'WARN',
      targets.length > 0
        ? `Points to: ${targets.join(', ')}`
        : 'No CNAME for www (redirect-only setup may still be valid)'
    );
  } catch {
    try {
      const wwwResp = await checkHttps(`https://www.${DOMAIN}`);
      pushResult(
        `CNAME (www.${DOMAIN})`,
        'WARN',
        `No CNAME record, but https://www.${DOMAIN} responds (${wwwResp.status} ${wwwResp.statusText}).`
      );
    } catch {
      pushResult(
        `CNAME (www.${DOMAIN})`,
        IS_PAYROLL ? 'WARN' : 'FAIL',
        IS_PAYROLL
          ? 'Record not found (acceptable for redirect-only payroll domain)'
          : 'Record not found'
      );
    }
  }

  // 4. SPF record
  if (IS_PAYROLL) {
    pushResult(
      `TXT/SPF (${DOMAIN})`,
      'WARN',
      'Optional for redirect-only payroll domain. Add SPF only if this domain sends mail directly.'
    );
  } else {
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
  }

  // 5. DKIM record (Resend)
  if (IS_PAYROLL) {
    pushResult(
      `TXT/DKIM (resend._domainkey.${DOMAIN})`,
      'WARN',
      'Optional for payroll. Add DKIM only if advanciapayroll.com will send mail directly; otherwise redirect-only is sufficient.'
    );
  } else {
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
  }

  // 6. DMARC record
  if (IS_PAYROLL) {
    pushResult(
      `TXT/DMARC (_dmarc.${DOMAIN})`,
      'WARN',
      'Optional for redirect-only payroll domain. Add DMARC if this domain will send or receive mail.'
    );
  } else {
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
  }

  // 7. MX records
  if (IS_PAYROLL) {
    pushResult(
      `MX (${DOMAIN})`,
      'WARN',
      'Optional for redirect-only payroll domain. Add MX only if this domain needs inbound mail.'
    );
  } else {
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
  }

  // 8. Check SSL/TLS via HTTPS fetch
  if (IS_PAYROLL) {
    try {
      const resp = await checkHttps(`https://${DOMAIN}`);
      const location = resp.headers.get('location') || '';
      const isRedirect = [301, 302, 307, 308].includes(resp.status);
      const targetsPayLedger = location.startsWith('https://advanciapayledger.com');
      pushResult(
        `HTTPS redirect (https://${DOMAIN})`,
        isRedirect && targetsPayLedger ? 'PASS' : 'WARN',
        `Status: ${resp.status} ${resp.statusText}${location ? ` -> ${location}` : ''}`
      );
    } catch (err: any) {
      pushResult(
        `HTTPS redirect (https://${DOMAIN})`,
        'WARN',
        `Timed out or unreachable from current network: ${err.message}`
      );
    }
  } else {
    try {
      const resp = await checkHttps(`https://${DOMAIN}`);
      pushResult(
        `HTTPS (https://${DOMAIN})`,
        resp.status < 500 ? 'PASS' : 'FAIL',
        `Status: ${resp.status} ${resp.statusText}`
      );
    } catch (err: any) {
      pushResult(
        `HTTPS (https://${DOMAIN})`,
        'WARN',
        `Timed out or unreachable from current network: ${err.message}`
      );
    }
  }

  // 9. Check API health endpoint (server exposes GET /health at root, not under /api/v1)
  if (IS_PAYLEDGER) {
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
  } else if (IS_HEALTHCARE) {
    pushResult(
      `API Health (https://api.${DOMAIN}/health)`,
      'WARN',
      'Not required in the current live setup unless you split healthcare onto its own API host.'
    );
  } else if (IS_PAYROLL) {
    pushResult(
      `API Health (https://api.${DOMAIN}/health)`,
      'WARN',
      'Not required. Payroll should remain redirect-only and should not expose an API host.'
    );
  }

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
  Mode:      ${STRICT ? 'strict (warnings fail)' : 'standard (warnings allowed)'}
╚══════════════════════════════════════════════════╝
  `);

  const hasBlockingWarning = STRICT && warned > 0;
  if (failed > 0 || hasBlockingWarning) {
    console.log('  Action required:');
    for (const r of results.filter((r) => r.status === 'FAIL')) {
      console.log(`    → ${r.name}: ${r.detail}`);
    }
    if (hasBlockingWarning) {
      for (const r of results.filter((r) => r.status === 'WARN')) {
        console.log(`    → [WARN] ${r.name}: ${r.detail}`);
      }
    }
    console.log('');
    console.log('  See scripts/dns-records-to-add.md for instructions.\n');
  }

  process.exitCode = failed > 0 || hasBlockingWarning ? 1 : 0;
}

main().catch((err) => {
  console.error('DNS verification failed:', err);
  process.exitCode = 1;
});
