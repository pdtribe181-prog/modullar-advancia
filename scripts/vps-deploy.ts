#!/usr/bin/env npx tsx
/**
 * VPS Quick-Deploy — Push latest code to production VPS
 * ---
 * Runs from your LOCAL machine to deploy the latest main branch to VPS.
 *
 * Usage:
 *   npx tsx scripts/vps-deploy.ts             # dry-run (shows commands)
 *   npx tsx scripts/vps-deploy.ts --apply      # actually deploy
 *   npx tsx scripts/vps-deploy.ts --apply --env # also upload .env
 */

import { execSync } from 'node:child_process';

const DRY_RUN = !process.argv.includes('--apply');
const UPLOAD_ENV = process.argv.includes('--env');

const VPS_HOST = process.env.VPS_HOST ?? '76.13.77.8';
const VPS_USER = process.env.VPS_USER ?? 'root';
const VPS_APP_DIR = process.env.VPS_APP_DIR ?? '/var/www/advancia';
const SSH = `${VPS_USER}@${VPS_HOST}`;

interface Step {
  label: string;
  local?: string;
  remote?: string;
  condition?: boolean;
}

const steps: Step[] = [
  {
    label: 'Pre-flight: ensure local is clean and on main',
    local: 'git diff --quiet HEAD || (echo "Working tree dirty — commit first" && exit 1)',
  },
  {
    label: 'Push latest to origin/main',
    local: 'git push origin main',
  },
  {
    label: 'Upload .env to VPS',
    local: `scp .env ${SSH}:${VPS_APP_DIR}/.env`,
    condition: UPLOAD_ENV,
  },
  {
    label: 'Pull latest on VPS',
    remote: `cd ${VPS_APP_DIR} && git fetch --all --prune && git checkout main && git pull --ff-only`,
  },
  {
    label: 'Install dependencies',
    remote: `cd ${VPS_APP_DIR} && npm ci --ignore-scripts`,
  },
  {
    label: 'Build',
    remote: `cd ${VPS_APP_DIR} && npm run build`,
  },
  {
    label: 'Prune dev dependencies',
    remote: `cd ${VPS_APP_DIR} && npm prune --omit=dev`,
  },
  {
    label: 'Run preflight checks',
    remote: `cd ${VPS_APP_DIR} && npx tsx scripts/preflight-check.ts || true`,
  },
  {
    label: 'Reload PM2',
    remote: `cd ${VPS_APP_DIR} && pm2 reload config/ecosystem.config.cjs --env production`,
  },
  {
    label: 'Health check (wait 5s)',
    remote: 'sleep 5 && curl -sf http://localhost:3000/health || echo "⚠ Health check failed"',
  },
];

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Command failed: ${cmd}\n${msg}`);
  }
}

function main() {
  console.log(`
╔══════════════════════════════════════════════════╗
║    Advancia PayLedger — VPS Quick-Deploy          ║
╠══════════════════════════════════════════════════╣
║  Target:  ${SSH.padEnd(40)}║
║  App Dir: ${VPS_APP_DIR.padEnd(40)}║
║  Mode:    ${(DRY_RUN ? 'DRY RUN (add --apply to execute)' : '🔴  LIVE DEPLOY').padEnd(40)}║
╚══════════════════════════════════════════════════╝
  `);

  const activeSteps = steps.filter((s) => s.condition === undefined || s.condition);

  for (let i = 0; i < activeSteps.length; i++) {
    const step = activeSteps[i];
    const num = `[${i + 1}/${activeSteps.length}]`;
    console.log(`${num} ${step.label}`);

    if (step.local) {
      console.log(`     $ ${step.local}`);
      if (!DRY_RUN) {
        const out = run(step.local);
        if (out) console.log(`     ${out}`);
      }
    }

    if (step.remote) {
      const sshCmd = `ssh ${SSH} "${step.remote.replace(/"/g, '\\"')}"`;
      console.log(`     $ ssh ${SSH} "${step.remote}"`);
      if (!DRY_RUN) {
        const out = run(sshCmd);
        if (out) console.log(`     ${out}`);
      }
    }

    console.log('');
  }

  if (DRY_RUN) {
    console.log('  === DRY RUN complete. Add --apply to execute. ===');
  } else {
    console.log('  ✅  Deploy complete!');
    console.log('  Verify: curl -s https://api.advanciapayledger.com/health');
  }
}

main();
