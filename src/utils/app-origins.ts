const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';

export const APP_ORIGINS = [
  'https://advanciapayledger.com',
  'https://www.advanciapayledger.com',
  'https://app.advanciapayledger.com',
  'https://advancia-healthcare.com',
  'https://www.advancia-healthcare.com',
] as const;

export const LOCAL_APP_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
] as const;

function normalizeOrigin(candidate?: string | null): string | null {
  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function getEnvOrigins(): string[] {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin));
}

export function getDefaultFrontendOrigin(): string {
  return normalizeOrigin(process.env.FRONTEND_URL) || DEFAULT_FRONTEND_ORIGIN;
}

export function getAllowedAppOrigins(): string[] {
  const origins = [
    ...APP_ORIGINS,
    ...LOCAL_APP_ORIGINS,
    process.env.FRONTEND_URL,
    ...getEnvOrigins(),
  ]
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));

  return [...new Set(origins)];
}

export function getValidatedAppOrigin(candidate?: string | null): string | null {
  const normalized = normalizeOrigin(candidate);

  if (!normalized) {
    return null;
  }

  return getAllowedAppOrigins().includes(normalized) ? normalized : null;
}

export function getValidatedAppUrl(candidate?: string | null): string | null {
  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);
    return getValidatedAppOrigin(url.origin) ? url.toString() : null;
  } catch {
    return null;
  }
}
