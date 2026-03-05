#!/usr/bin/env tsx
/**
 * Run DNS verification for all three app domains.
 * Usage: npm run verify:domains   or   npx tsx scripts/verify-all-domains.ts
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, 'verify-dns.ts');
const tsxCli = path.resolve(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');

const DOMAINS = [
  'advanciapayledger.com',
  'advancia-healthcare.com',
  'advanciapayroll.com',
];

function run(domain: string): Promise<number> {
  return new Promise((resolve) => {
    // Invoke tsx via the local Node binary and CLI entrypoint so we
    // don't depend on `npx` or a globally available `tsx` binary.
    const child = spawn(process.execPath, [tsxCli, script, '--domain', domain], {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
    child.on('close', (code) => resolve(code ?? 0));
  });
}

async function main() {
  console.log('Verifying DNS for all three domains...\n');
  let hasFailure = false;
  for (const domain of DOMAINS) {
    const code = await run(domain);
    if (code !== 0) hasFailure = true;
    console.log('');
  }
  process.exit(hasFailure ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
