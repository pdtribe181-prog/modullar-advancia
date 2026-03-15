import { createHash } from 'node:crypto';
import { getRedis } from '../lib/redis.js';

const REVOKED_TOKEN_PREFIX = 'auth:revoked-token:';
const FALLBACK_TTL_SECONDS = 60 * 60 * 24;

function getTokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getRevocationKey(token: string): string {
  return `${REVOKED_TOKEN_PREFIX}${getTokenFingerprint(token)}`;
}

function parseJwtExpiry(token: string): number | null {
  const segments = token.split('.');

  if (segments.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as {
      exp?: unknown;
    };

    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function getRevocationTtlSeconds(token: string): number {
  const exp = parseJwtExpiry(token);

  if (!exp) {
    return FALLBACK_TTL_SECONDS;
  }

  const ttl = exp - Math.floor(Date.now() / 1000);
  return ttl > 0 ? ttl : 60;
}

export async function revokeAccessToken(token: string): Promise<void> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return;
  }

  await getRedis().set(getRevocationKey(normalizedToken), '1', {
    ex: getRevocationTtlSeconds(normalizedToken),
  });
}

export async function isAccessTokenRevoked(token: string): Promise<boolean> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return false;
  }

  const revoked = await getRedis().get(getRevocationKey(normalizedToken));
  return revoked !== null;
}
