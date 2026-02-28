/**
 * API Versioning Middleware
 *
 * Supports version negotiation via:
 *   1. URL path prefix  — /api/v1/…  /api/v2/…   (primary, already in use)
 *   2. Accept header     — Accept: application/vnd.advancia.v2+json
 *   3. Custom header     — X-API-Version: 2
 *
 * The resolved version is attached to `req.apiVersion` (number).
 *
 * When a client requests a version that is deprecated, a
 * `Sunset` + `Deprecation` header pair is added to the response.
 *
 * When a client requests an unknown version, a 400 is returned.
 */

import type { Request, Response, NextFunction } from 'express';

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

/** Currently supported API versions. */
export const SUPPORTED_VERSIONS = [1] as const;

/** The latest (default) version new clients should use. */
export const CURRENT_VERSION: number = 1;

/** Versions that still work but are scheduled for removal. */
export const DEPRECATED_VERSIONS: Record<number, { sunset: string; message: string }> = {
  // Example for future use:
  // 1: { sunset: '2027-01-01', message: 'v1 will be removed on 2027-01-01. Please migrate to v2.' },
};

/* ------------------------------------------------------------------ */
/*  Augment Express Request                                           */
/* ------------------------------------------------------------------ */

declare global {
  namespace Express {
    interface Request {
      apiVersion?: number;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Middleware                                                         */
/* ------------------------------------------------------------------ */

/**
 * Resolve the requested API version and attach it to `req.apiVersion`.
 * Priority: URL path > Accept header > X-API-Version header > default.
 */
export function apiVersioning(req: Request, res: Response, next: NextFunction): void {
  let version: number | undefined;

  // 1. URL path prefix  — /api/v{N}/…
  const pathMatch = req.originalUrl.match(/\/api\/v(\d+)\//);
  if (pathMatch) {
    version = parseInt(pathMatch[1], 10);
  }

  // 2. Accept header    — application/vnd.advancia.v{N}+json
  if (version === undefined) {
    const accept = req.headers.accept || '';
    const acceptMatch = accept.match(/application\/vnd\.advancia\.v(\d+)\+json/);
    if (acceptMatch) {
      version = parseInt(acceptMatch[1], 10);
    }
  }

  // 3. Custom header    — X-API-Version: {N}
  if (version === undefined) {
    const header = req.headers['x-api-version'];
    if (typeof header === 'string' && /^\d+$/.test(header)) {
      version = parseInt(header, 10);
    }
  }

  // 4. Default to current version
  if (version === undefined) {
    version = CURRENT_VERSION;
  }

  // Validate version is supported
  if (!SUPPORTED_VERSIONS.includes(version as (typeof SUPPORTED_VERSIONS)[number])) {
    res.status(400).json({
      success: false,
      error: `API version ${version} is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
      currentVersion: CURRENT_VERSION,
    });
    return;
  }

  // Attach to request
  req.apiVersion = version;

  // Add response headers
  res.setHeader('X-API-Version', String(version));

  // Deprecation headers if applicable
  const deprecation = DEPRECATED_VERSIONS[version];
  if (deprecation) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', deprecation.sunset);
    res.setHeader('X-Deprecation-Notice', deprecation.message);
  }

  next();
}

/**
 * Guard that rejects requests targeting a specific version.
 * Useful for locking endpoints to a version range.
 *
 * Usage:
 *   router.get('/new-feature', requireVersion(2), handler);
 */
export function requireVersion(...allowed: number[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const v = req.apiVersion ?? CURRENT_VERSION;
    if (!allowed.includes(v)) {
      res.status(400).json({
        success: false,
        error: `This endpoint is only available in API version(s): ${allowed.join(', ')}`,
      });
      return;
    }
    next();
  };
}
