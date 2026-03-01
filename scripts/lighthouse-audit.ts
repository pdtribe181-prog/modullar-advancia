#!/usr/bin/env npx tsx
/**
 * Lighthouse Audit Runner
 * ---
 * Runs Lighthouse audits against the frontend and API, targeting >90 on all axes.
 *
 * Prerequisites:
 *   - Google Chrome installed (Lighthouse uses Chromium)
 *   - npm install -g lighthouse  (or uses npx)
 *
 * Usage:
 *   npx tsx scripts/lighthouse-audit.ts                    # audit production frontend
 *   npx tsx scripts/lighthouse-audit.ts --url https://staging.advanciapayledger.com
 *   npx tsx scripts/lighthouse-audit.ts --api              # also check API /docs endpoint
 *   npx tsx scripts/lighthouse-audit.ts --json             # output raw JSON
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_URL =
  process.argv.find((a) => a.startsWith('--url='))?.split('=')[1] ||
  (process.argv.includes('--url')
    ? process.argv[process.argv.indexOf('--url') + 1]
    : 'https://advanciapayledger.com');

const CHECK_API = process.argv.includes('--api');
const JSON_OUT = process.argv.includes('--json');
const API_URL = 'https://api.advanciapayledger.com/docs';
const OUTPUT_DIR = path.resolve(import.meta.dirname ?? '.', '..', 'lighthouse-reports');

interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

const THRESHOLDS: LighthouseScores = {
  performance: 90,
  accessibility: 90,
  bestPractices: 90,
  seo: 90,
};

function hasLighthouse(): boolean {
  const result = spawnSync('npx', ['lighthouse', '--version'], {
    encoding: 'utf-8',
    shell: true,
    timeout: 15000,
  });
  return result.status === 0;
}

function hasChrome(): boolean {
  const result = spawnSync(
    process.platform === 'win32'
      ? 'where chrome'
      : process.platform === 'darwin'
        ? 'ls /Applications/Google\\ Chrome.app'
        : 'which google-chrome || which chromium-browser',
    { encoding: 'utf-8', shell: true, timeout: 5000 }
  );
  return result.status === 0;
}

function runLighthouse(url: string, label: string): LighthouseScores | null {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const safeName = label.replace(/[^a-zA-Z0-9-]/g, '_');
  const jsonPath = path.join(OUTPUT_DIR, `${safeName}-${timestamp}.json`);
  const htmlPath = path.join(OUTPUT_DIR, `${safeName}-${timestamp}.html`);

  console.log(`\n  Running Lighthouse on: ${url}`);
  console.log('  This may take 30-60 seconds...\n');

  try {
    execSync(
      `npx lighthouse "${url}" ` +
        `--output=json,html ` +
        `--output-path="${path.join(OUTPUT_DIR, `${safeName}-${timestamp}`)}" ` +
        `--chrome-flags="--headless --no-sandbox --disable-gpu" ` +
        `--quiet ` +
        `--only-categories=performance,accessibility,best-practices,seo`,
      { encoding: 'utf-8', timeout: 120000, stdio: 'pipe' }
    );

    // Lighthouse appends .report.json / .report.html
    const actualJsonPath = `${path.join(OUTPUT_DIR, `${safeName}-${timestamp}`)}.report.json`;
    const actualHtmlPath = `${path.join(OUTPUT_DIR, `${safeName}-${timestamp}`)}.report.html`;

    if (fs.existsSync(actualJsonPath)) {
      const report = JSON.parse(fs.readFileSync(actualJsonPath, 'utf-8'));
      const scores: LighthouseScores = {
        performance: Math.round((report.categories?.performance?.score ?? 0) * 100),
        accessibility: Math.round((report.categories?.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((report.categories?.['best-practices']?.score ?? 0) * 100),
        seo: Math.round((report.categories?.seo?.score ?? 0) * 100),
      };

      if (JSON_OUT) {
        console.log(JSON.stringify(scores, null, 2));
      }

      console.log(`  HTML report: ${actualHtmlPath}`);
      return scores;
    }

    // Try without .report suffix
    if (fs.existsSync(jsonPath)) {
      const report = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const scores: LighthouseScores = {
        performance: Math.round((report.categories?.performance?.score ?? 0) * 100),
        accessibility: Math.round((report.categories?.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((report.categories?.['best-practices']?.score ?? 0) * 100),
        seo: Math.round((report.categories?.seo?.score ?? 0) * 100),
      };
      console.log(`  HTML report: ${htmlPath}`);
      return scores;
    }

    console.log('  ⚠️  Could not find Lighthouse JSON output');
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ Lighthouse failed: ${msg.split('\n')[0]}`);
    return null;
  }
}

function printScores(label: string, scores: LighthouseScores) {
  console.log(`\n  ${label}:`);
  console.log('  ─────────────────────────────────────────────────');

  const entries: [keyof LighthouseScores, string][] = [
    ['performance', 'Performance'],
    ['accessibility', 'Accessibility'],
    ['bestPractices', 'Best Practices'],
    ['seo', 'SEO'],
  ];

  let allPass = true;
  for (const [key, name] of entries) {
    const score = scores[key];
    const threshold = THRESHOLDS[key];
    const pass = score >= threshold;
    if (!pass) allPass = false;
    const icon = pass ? '✅' : score >= threshold - 10 ? '⚠️' : '❌';
    const bar = '█'.repeat(Math.floor(score / 5)) + '░'.repeat(20 - Math.floor(score / 5));
    console.log(
      `  ${icon}  ${name.padEnd(16)} ${String(score).padStart(3)}/100  ${bar}  (target: ${threshold})`
    );
  }

  return allPass;
}

function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║    Advancia PayLedger — Lighthouse Audit          ║
╠══════════════════════════════════════════════════╣
║  Target:     ${FRONTEND_URL.slice(0, 37).padEnd(37)}║
║  Thresholds: >90 Performance, A11y, BP, SEO       ║
╚══════════════════════════════════════════════════╝
  `);

  // Check prerequisites
  console.log('  Prerequisites:');
  console.log('  ─────────────────────────────────────────────────');

  const chromOk = hasChrome();
  console.log(`  ${chromOk ? '✅' : '❌'}  Google Chrome / Chromium`);

  const lhOk = hasLighthouse();
  console.log(`  ${lhOk ? '✅' : '⚠️'}  Lighthouse CLI (will use npx)`);

  if (!chromOk) {
    console.log(`
  Chrome is required for Lighthouse.
  Install: https://www.google.com/chrome/
    `);
    printManualGuide();
    process.exit(1);
  }

  // Run audits
  const allResults: { label: string; scores: LighthouseScores; pass: boolean }[] = [];

  const frontendScores = runLighthouse(FRONTEND_URL, 'frontend');
  if (frontendScores) {
    const pass = printScores('Frontend', frontendScores);
    allResults.push({ label: 'Frontend', scores: frontendScores, pass });
  }

  if (CHECK_API) {
    const apiScores = runLighthouse(API_URL, 'api-docs');
    if (apiScores) {
      const pass = printScores('API Docs', apiScores);
      allResults.push({ label: 'API Docs', scores: apiScores, pass });
    }
  }

  // Summary
  if (allResults.length > 0) {
    const allPass = allResults.every((r) => r.pass);
    console.log(`
╔══════════════════════════════════════════════════╗
║  ${allPass ? '✅ ALL AUDITS PASSED (>90 on all axes)' : '⚠️  SOME SCORES BELOW TARGET'}            ║
╠══════════════════════════════════════════════════╣
║  Reports saved to: lighthouse-reports/            ║
╚══════════════════════════════════════════════════╝
    `);
  }

  printManualGuide();
}

function printManualGuide() {
  console.log(`
  Manual Lighthouse Options:
  ─────────────────────────────────────────────────
  1. Chrome DevTools:
     Open ${FRONTEND_URL} → F12 → Lighthouse tab → Run

  2. PageSpeed Insights (online, no install):
     https://pagespeed.web.dev/analysis?url=${encodeURIComponent(FRONTEND_URL)}

  3. CLI with custom config:
     npx lighthouse ${FRONTEND_URL} --view --preset=desktop
     npx lighthouse ${FRONTEND_URL} --view --preset=perf

  Common Performance Improvements:
  ─────────────────────────────────────────────────
  · Enable Brotli compression in Cloudflare
  · Add Cache-Control headers for static assets (Vite handles this)
  · Optimize images: use WebP/AVIF, add width/height attributes
  · Preload critical fonts: <link rel="preload" href="...woff2" as="font">
  · Code-split routes: React.lazy() + Suspense
  · Minimize main-thread work: defer non-critical JS
  · Ensure proper meta tags: <title>, <meta description>, <meta viewport>
  `);
}

main();
