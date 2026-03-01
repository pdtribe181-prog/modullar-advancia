#!/usr/bin/env npx tsx
/**
 * Cloudflare Configuration Checker & Guide
 * ---
 * Verifies Cloudflare settings for advanciapayledger.com and provides
 * step-by-step instructions for remaining configuration.
 *
 * Usage:
 *   npx tsx scripts/cloudflare-setup.ts            # check DNS + guide
 *   npx tsx scripts/cloudflare-setup.ts --verify    # also check SSL + headers via HTTP
 */

import 'dotenv/config';
import dns from 'node:dns/promises';
import https from 'node:https';
import http from 'node:http';

const VERIFY = process.argv.includes('--verify');
const DOMAIN = 'advanciapayledger.com';
const API_DOMAIN = `api.${DOMAIN}`;
const API_URL = `https://${API_DOMAIN}`;

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  detail: string;
}

const results: CheckResult[] = [];

function log(r: CheckResult) {
  const icon = { pass: '✅', fail: '❌', warn: '⚠️', skip: '⏭️' }[r.status];
  console.log(`  ${icon}  ${r.name}: ${r.detail}`);
  results.push(r);
}

async function checkDns() {
  console.log('\n  DNS Records:');
  console.log('  ─────────────────────────────────────────────────');

  // A record for root domain
  try {
    const rootA = await dns.resolve4(DOMAIN);
    log({ name: `${DOMAIN} A record`, status: 'pass', detail: rootA.join(', ') });
  } catch {
    log({ name: `${DOMAIN} A record`, status: 'fail', detail: 'Not found' });
  }

  // A record for API subdomain
  try {
    const apiA = await dns.resolve4(API_DOMAIN);
    log({ name: `${API_DOMAIN} A record`, status: 'pass', detail: apiA.join(', ') });
  } catch {
    log({
      name: `${API_DOMAIN} A record`,
      status: 'fail',
      detail: 'Not found — add A record pointing to VPS IP',
    });
  }

  // CNAME for www
  try {
    const www = await dns.resolveCname(`www.${DOMAIN}`);
    log({ name: `www.${DOMAIN} CNAME`, status: 'pass', detail: www.join(', ') });
  } catch {
    log({
      name: `www.${DOMAIN} CNAME`,
      status: 'warn',
      detail: 'Not found — add CNAME www → advanciapayledger.com',
    });
  }

  // MX records
  try {
    const mx = await dns.resolveMx(DOMAIN);
    log({
      name: 'MX records',
      status: 'pass',
      detail: mx.map((r) => `${r.exchange} (pri ${r.priority})`).join(', '),
    });
  } catch {
    log({ name: 'MX records', status: 'warn', detail: 'Not found' });
  }

  // DMARC
  try {
    const dmarc = await dns.resolveTxt(`_dmarc.${DOMAIN}`);
    const flat = dmarc.map((r) => r.join('')).join('');
    const hasQuarantine = flat.includes('p=quarantine') || flat.includes('p=reject');
    log({
      name: 'DMARC',
      status: hasQuarantine ? 'pass' : 'warn',
      detail: hasQuarantine
        ? flat.slice(0, 60)
        : `${flat.slice(0, 50)} — upgrade to p=quarantine after launch`,
    });
  } catch {
    log({ name: 'DMARC', status: 'fail', detail: 'Not found — add _dmarc TXT record' });
  }

  // SPF
  try {
    const spf = await dns.resolveTxt(DOMAIN);
    const spfRecord = spf.find((r) => r.join('').includes('v=spf1'));
    if (spfRecord) {
      log({ name: 'SPF', status: 'pass', detail: spfRecord.join('').slice(0, 60) });
    } else {
      log({ name: 'SPF', status: 'warn', detail: 'No SPF record found' });
    }
  } catch {
    log({ name: 'SPF', status: 'warn', detail: 'Could not resolve TXT records' });
  }
}

function httpGet(
  url: string
): Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      // consume the body
      res.resume();
      resolve({ statusCode: res.statusCode ?? 0, headers: res.headers });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function checkHttps() {
  console.log('\n  HTTPS & Headers:');
  console.log('  ─────────────────────────────────────────────────');

  // SSL connectivity
  try {
    const res = await httpGet(`${API_URL}/health`);
    log({
      name: 'HTTPS reachable',
      status: res.statusCode >= 200 && res.statusCode < 500 ? 'pass' : 'warn',
      detail: `${API_URL}/health → HTTP ${res.statusCode}`,
    });

    // Check security headers
    const hsts = res.headers['strict-transport-security'];
    log({
      name: 'HSTS',
      status: hsts ? 'pass' : 'warn',
      detail: hsts ? String(hsts).slice(0, 60) : 'Not present — enable via Cloudflare or app',
    });

    const cfRay = res.headers['cf-ray'];
    log({
      name: 'Cloudflare proxy',
      status: cfRay ? 'pass' : 'warn',
      detail: cfRay
        ? `Active (cf-ray: ${cfRay})`
        : 'Not detected — ensure orange-cloud (proxy) is enabled',
    });

    const xFrame = res.headers['x-frame-options'];
    log({
      name: 'X-Frame-Options',
      status: xFrame ? 'pass' : 'warn',
      detail: xFrame ? String(xFrame) : 'Not set',
    });

    const csp = res.headers['content-security-policy'];
    log({
      name: 'CSP header',
      status: csp ? 'pass' : 'warn',
      detail: csp ? 'Present' : 'Not set on health endpoint (may be set on HTML routes)',
    });

    const server = res.headers['server'];
    if (server && String(server).toLowerCase().includes('cloudflare')) {
      log({ name: 'Server header', status: 'pass', detail: 'cloudflare (origin server hidden)' });
    } else {
      log({
        name: 'Server header',
        status: 'warn',
        detail: `${server ?? 'not set'} — Cloudflare proxy may not be active`,
      });
    }
  } catch (err) {
    log({
      name: 'HTTPS reachable',
      status: 'fail',
      detail: `Cannot reach ${API_URL}/health — ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Check HTTP → HTTPS redirect
  try {
    const httpRes = await httpGet(`http://${API_DOMAIN}/health`);
    if (httpRes.statusCode >= 300 && httpRes.statusCode < 400) {
      log({
        name: 'HTTP → HTTPS redirect',
        status: 'pass',
        detail: `HTTP ${httpRes.statusCode} redirect`,
      });
    } else {
      log({
        name: 'HTTP → HTTPS redirect',
        status: 'warn',
        detail: `HTTP ${httpRes.statusCode} — expected 301/302 redirect`,
      });
    }
  } catch {
    log({
      name: 'HTTP → HTTPS redirect',
      status: 'skip',
      detail: 'Could not test (HTTP port may be blocked)',
    });
  }
}

function printCloudflareGuide() {
  console.log(`
  Cloudflare Configuration Guide:
  ═════════════════════════════════════════════════

  1. SSL/TLS → Overview
     ┌──────────────────────────────────────────┐
     │  Set encryption mode to: Full (Strict)   │
     │  This requires a valid origin cert.      │
     │  If using Let's Encrypt, you're good.    │
     └──────────────────────────────────────────┘
     Dashboard: https://dash.cloudflare.com → ${DOMAIN} → SSL/TLS

  2. SSL/TLS → Edge Certificates
     □  Always Use HTTPS: ON
     □  HTTP Strict Transport Security (HSTS): Enable
        - Max Age: 6 months (15768000)
        - Include subdomains: Yes
        - Preload: Yes (after confirming no HTTP-only resources)
     □  Minimum TLS Version: 1.2
     □  Opportunistic Encryption: ON
     □  TLS 1.3: ON

  3. Security → Bots
     □  Bot Fight Mode: ON
     □  This blocks known bad bots (scrapers, credential stuffers)
     □  Legitimate Stripe webhook calls are NOT blocked by this

  4. Security → WAF (Web Application Firewall)
     □  Enable Cloudflare Managed Ruleset
     □  Consider a custom rule to allow Stripe webhook IPs:
        Expression: (http.request.uri.path eq "/api/v1/stripe/webhook")
        Action: Skip all WAF rules (Stripe signs requests; WAF may strip body)

  5. Speed → Optimization
     □  Brotli: ON
     □  Early Hints: ON
     □  Auto Minify: JS, CSS, HTML (for frontend only)
     □  Rocket Loader: OFF (can break SPAs)

  6. Caching → Configuration
     □  Browser Cache TTL: Respect Existing Headers
     □  Caching Level: Standard
     □  Add Page Rule for API:
        URL: api.${DOMAIN}/*
        Cache Level: Bypass (API responses should NOT be cached)
     □  Add Page Rule for frontend static assets:
        URL: ${DOMAIN}/*.js, *.css, *.woff2
        Cache Level: Cache Everything, Edge TTL: 1 month

  7. DNS
     □  Proxy status for api.${DOMAIN}: Proxied (orange cloud) ✓
     □  Proxy status for ${DOMAIN}: Proxied (orange cloud) ✓
     □  www.${DOMAIN}: CNAME → ${DOMAIN} (Proxied)

  8. Network
     □  WebSockets: ON (if using real-time features)
     □  HTTP/2: ON (default)
     □  HTTP/3 (QUIC): ON

  9. Rules → Redirect Rules
     □  www.${DOMAIN}/* → https://${DOMAIN}/$1 (301 Permanent)
  `);
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Advancia PayLedger — Cloudflare Setup Guide     ║
╠══════════════════════════════════════════════════╣
║  Domain: ${DOMAIN.padEnd(41)}║
║  API:    ${API_DOMAIN.padEnd(41)}║
╚══════════════════════════════════════════════════╝
  `);

  await checkDns();

  if (VERIFY) {
    await checkHttps();
  } else {
    console.log('\n  Add --verify to also check HTTPS connectivity and headers.');
  }

  printCloudflareGuide();

  // Summary
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;

  console.log(`
╔══════════════════════════════════════════════════╗
║                    SUMMARY                        ║
╠══════════════════════════════════════════════════╣
  ✅ Passed:  ${passed}
  ❌ Failed:  ${failed}
  ⚠️  Warnings: ${warned}
╚══════════════════════════════════════════════════╝
  `);
}

main().catch(console.error);
