#!/usr/bin/env npx tsx
import 'dotenv/config';

type TokenSummary = {
  id: string;
  name: string;
  status?: string;
};

type PagesProject = {
  name: string;
  subdomain?: string;
  production_branch?: string;
};

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');
const listOnly = args.has('--list-only');
const pagesArg = getArgValue('--pages');
const tokensArg = getArgValue('--tokens');

const targetPages = splitCsv(pagesArg);
const targetTokens = splitCsv(tokensArg);

function getArgValue(flag: string): string | undefined {
  const match = process.argv.slice(2).find((arg) => arg.startsWith(`${flag}=`));
  return match ? match.slice(flag.length + 1) : undefined;
}

function splitCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

async function cloudflareFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      ...headers(),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as {
    success: boolean;
    errors?: Array<{ message?: string }>;
    result: T;
  };

  if (!response.ok || !payload.success) {
    const errorText = payload.errors?.map((entry) => entry.message).filter(Boolean).join('; ');
    throw new Error(errorText || `Cloudflare API request failed for ${path}`);
  }

  return payload.result;
}

async function verifyToken(): Promise<void> {
  const result = await cloudflareFetch<{ id: string; status: string }>('/user/tokens/verify');
  console.log(`Authenticated token: ${result.id} (${result.status})`);
}

async function listPagesProjects(): Promise<PagesProject[]> {
  if (!accountId) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
  }

  return cloudflareFetch<PagesProject[]>(`/accounts/${accountId}/pages/projects`);
}

async function listUserTokens(): Promise<TokenSummary[]> {
  return cloudflareFetch<TokenSummary[]>('/user/tokens');
}

async function deletePagesProject(projectName: string): Promise<void> {
  if (!accountId) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
  }

  await cloudflareFetch(`/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`, {
    method: 'DELETE',
  });
}

async function deleteUserToken(tokenId: string): Promise<void> {
  await cloudflareFetch(`/user/tokens/${encodeURIComponent(tokenId)}`, {
    method: 'DELETE',
  });
}

function printUsage(): void {
  console.log('Usage:');
  console.log('  npm run cloudflare:cleanup -- --list-only');
  console.log('  npm run cloudflare:cleanup -- --pages=my-pages-project --tokens="modullar-advancia build token"');
  console.log('  npm run cloudflare:cleanup -- --pages=my-pages-project --execute');
  console.log('');
  console.log('Notes:');
  console.log('  - Reads CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from the environment.');
  console.log('  - Dry-run is the default. Use --execute to actually delete.');
  console.log('  - Token deletion only works if your current token can list and revoke user API tokens.');
}

async function main(): Promise<void> {
  if (!apiToken) {
    throw new Error('Missing CLOUDFLARE_API_TOKEN');
  }

  if (!listOnly && targetPages.length === 0 && targetTokens.length === 0) {
    printUsage();
    throw new Error('No cleanup targets were provided.');
  }

  console.log(execute ? 'Mode: EXECUTE' : 'Mode: DRY-RUN');
  await verifyToken();

  const [pagesProjects, userTokens] = await Promise.all([
    accountId ? listPagesProjects().catch((error: unknown) => {
      console.warn(`Unable to list Pages projects: ${String(error)}`);
      return [] as PagesProject[];
    }) : Promise.resolve([] as PagesProject[]),
    listUserTokens().catch((error: unknown) => {
      console.warn(`Unable to list user tokens: ${String(error)}`);
      return [] as TokenSummary[];
    }),
  ]);

  if (pagesProjects.length > 0) {
    console.log('\nPages projects:');
    for (const project of pagesProjects) {
      console.log(`  - ${project.name}${project.subdomain ? ` (${project.subdomain})` : ''}`);
    }
  }

  if (userTokens.length > 0) {
    console.log('\nUser tokens:');
    for (const token of userTokens) {
      console.log(`  - ${token.name}${token.status ? ` [${token.status}]` : ''}`);
    }
  }

  if (listOnly) {
    return;
  }

  const matchedPages = pagesProjects.filter((project) => targetPages.includes(project.name));
  const missingPages = targetPages.filter((name) => !matchedPages.some((project) => project.name === name));

  const matchedTokens = userTokens.filter((token) => targetTokens.includes(token.name));
  const missingTokens = targetTokens.filter((name) => !matchedTokens.some((token) => token.name === name));

  console.log('\nRequested cleanup targets:');
  for (const project of matchedPages) {
    console.log(`  - Pages project: ${project.name}`);
  }
  for (const token of matchedTokens) {
    console.log(`  - User token: ${token.name}`);
  }
  for (const name of missingPages) {
    console.log(`  - Pages project not found: ${name}`);
  }
  for (const name of missingTokens) {
    console.log(`  - User token not found or not visible: ${name}`);
  }

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to apply deletions.');
    return;
  }

  for (const project of matchedPages) {
    console.log(`Deleting Pages project: ${project.name}`);
    await deletePagesProject(project.name);
  }

  for (const token of matchedTokens) {
    console.log(`Deleting user token: ${token.name}`);
    await deleteUserToken(token.id);
  }

  console.log('\nCleanup complete.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});