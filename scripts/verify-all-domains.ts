#!/usr/bin/env tsx
/**
 * Run DNS verification for all three app domains.
 * Usage: npm run verify:domains   or   npx tsx scripts/verify-all-domains.ts
 *        npm run verify:domains:strict   or   npx tsx scripts/verify-all-domains.ts --strict
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, 'verify-dns.ts');
const tsxCli = path.resolve(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
const STRICT = process.argv.slice(2).includes('--strict');

const DOMAINS = [
  'advanciapayledger.com',
  'advancia-healthcare.com',
  'advanciapayroll.com',
];

function run(domain: string): Promise<number> {
  return new Promise((resolve) => {
    const childArgs = [tsxCli, script, '--domain', domain];
    if (STRICT) {
      childArgs.push('--strict');
    }

    // Invoke tsx via the local Node binary and CLI entrypoint so we
    // don't depend on `npx` or a globally available `tsx` binary.
    const child = spawn(process.execPath, childArgs, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
    child.on('close', (code) => resolve(code ?? 0));
  });
}

async function main() {
  console.log('Verifying DNS for all three domains...\n');
  if (STRICT) {
    console.log('Strict mode enabled: warnings will fail the run.\n');
  }
  let hasFailure = false;
  for (const domain of DOMAINS) {
    const code = await run(domain);
    if (code !== 0) hasFailure = true;
    console.log('');
  }
  process.exitCode = hasFailure ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
