#!/usr/bin/env npx tsx
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const TARGET_PATHS = [
  'README.md',
  '.env.example',
  '.env.staging.example',
  '.github',
  'docs',
  'scripts',
  'config',
];

const EXCLUDE_RELATIVE_FILES = new Set([
  '.github/copilot-instructions.md',
  '.github/instructions/infrastructure-no-render.instructions.md',
  'scripts/verify-no-render-hosting.ts',
]);

const EXCLUDE_RELATIVE_PREFIXES = ['frontend/dist/', 'archive/', 'node_modules/'];

const HOSTING_PATTERN = /(onrender\.com|render\.ya?ml|RENDER_)/gi;
const MAX_PRINTED_MATCHES = 120;

type Match = {
  path: string;
  line: number;
  text: string;
};

function toRelPath(absPath: string): string {
  return absPath.slice(ROOT.length + 1).replace(/\\/g, '/');
}

function shouldSkip(relPath: string): boolean {
  if (EXCLUDE_RELATIVE_FILES.has(relPath)) {
    return true;
  }

  return EXCLUDE_RELATIVE_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function collectFiles(absPath: string, files: string[]): void {
  const relPath = toRelPath(absPath);

  if (shouldSkip(relPath)) {
    return;
  }

  const stats = statSync(absPath);
  if (stats.isDirectory()) {
    const entries = readdirSync(absPath);
    for (const entry of entries) {
      collectFiles(join(absPath, entry), files);
    }
    return;
  }

  files.push(absPath);
}

function findMatches(absPath: string): Match[] {
  const relPath = toRelPath(absPath);
  const content = readFileSync(absPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const matches: Match[] = [];

  lines.forEach((lineText, index) => {
    HOSTING_PATTERN.lastIndex = 0;
    if (!HOSTING_PATTERN.test(lineText)) {
      return;
    }

    matches.push({
      path: relPath,
      line: index + 1,
      text: lineText.trim(),
    });
  });

  return matches;
}

function main(): void {
  const filesToScan: string[] = [];

  for (const target of TARGET_PATHS) {
    const abs = resolve(ROOT, target);
    if (!existsSync(abs)) {
      continue;
    }
    collectFiles(abs, filesToScan);
  }

  const allMatches = filesToScan.flatMap(findMatches);

  if (allMatches.length === 0) {
    console.log('HOSTING_INDICATOR_MATCH_COUNT=0');
    console.log('No legacy hosting indicators found in active deployment files.');
    process.exit(0);
  }

  console.error(`HOSTING_INDICATOR_MATCH_COUNT=${allMatches.length}`);
  console.error('Found legacy hosting indicators in active deployment files:');

  allMatches.slice(0, MAX_PRINTED_MATCHES).forEach((match) => {
    console.error(`${match.path}:${match.line} ${match.text}`);
  });

  if (allMatches.length > MAX_PRINTED_MATCHES) {
    console.error(`...and ${allMatches.length - MAX_PRINTED_MATCHES} more`);
  }

  process.exit(1);
}

main();