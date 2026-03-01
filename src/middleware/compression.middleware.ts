/**
 * HTTP Response Compression Middleware
 *
 * Compresses API responses to reduce bandwidth usage and improve
 * response times. Supports gzip, deflate, and brotli compression.
 *
 * Usage:
 *   import { compressionMiddleware } from '../middleware/compression.middleware.js';
 *   app.use(compressionMiddleware);
 *
 * Features:
 * - Automatic mime-type detection
 * - Configurable compression thresholds
 * - Brotli support for modern browsers
 * - Skip compression for already-compressed content
 */

import { Request, Response, NextFunction } from 'express';
import { createGzip, createDeflate, createBrotliCompress } from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

interface CompressionOptions {
  threshold: number; // Minimum response size to compress (bytes)
  level: number; // Compression level 1-9 (higher = more compression)
  filter?: (req: Request, res: Response) => boolean; // Custom filter function
}

const defaultOptions: CompressionOptions = {
  threshold: 1024, // 1KB minimum - balanced threshold
  level: 4, // Moderate compression for balanced performance
};

// MIME types that should be compressed
const compressibleTypes = new Set([
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'text/xml',
  'application/octet-stream',
  'image/svg+xml',
]);

// MIME types that are already compressed and should be skipped
const precompressedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/',
  'audio/',
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/x-compress',
  'application/x-bzip2',
  'application/x-7z-compressed',
]);

/**
 * Determines the best compression algorithm based on Accept-Encoding header
 */
function getBestCompression(acceptEncoding: string): 'br' | 'gzip' | 'deflate' | null {
  if (!acceptEncoding) return null;

  const encodings = acceptEncoding.toLowerCase();

  // Prefer Brotli for best compression
  if (encodings.includes('br')) return 'br';

  // Fallback to gzip (widely supported)
  if (encodings.includes('gzip')) return 'gzip';

  // Last resort: deflate
  if (encodings.includes('deflate')) return 'deflate';

  return null;
}

/**
 * Checks if content type is compressible
 */
function shouldCompress(req: Request, res: Response, options: CompressionOptions): boolean {
  // Custom filter takes precedence
  if (options.filter && !options.filter(req, res)) {
    return false;
  }

  const contentType = res.getHeader('content-type') as string;
  if (!contentType) return false;

  // Skip already compressed content
  const baseType = contentType.split(';')[0].trim().toLowerCase();
  for (const precompressed of precompressedTypes) {
    if (baseType.startsWith(precompressed)) {
      return false;
    }
  }

  // Check if content type is compressible
  return compressibleTypes.has(baseType) || baseType.startsWith('text/');
}

/**
 * Creates and configures compression middleware
 */
export function createCompressionMiddleware(opts: Partial<CompressionOptions> = {}) {
  const options = { ...defaultOptions, ...opts };

  return (req: Request, res: Response, next: NextFunction): void => {
    const acceptEncoding = req.headers['accept-encoding'] as string;
    const compression = getBestCompression(acceptEncoding);

    if (!compression) {
      return next();
    }

    // Override res.end to check content length and apply compression
    const originalEnd = res.end;
    let isCompressed = false;

    res.end = function (this: Response, chunk?: any, encoding?: any, callback?: any): Response {
      // Handle different end() call patterns
      if (typeof chunk === 'function') {
        callback = chunk;
        chunk = undefined;
      } else if (typeof encoding === 'function') {
        callback = encoding;
        encoding = undefined;
      }

      // Skip compression if already applied or content is too small
      if (isCompressed || !chunk || !shouldCompress(req, res, options)) {
        return originalEnd.call(this, chunk, encoding, callback);
      }

      const contentLength = Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(chunk, encoding);

      if (contentLength < options.threshold) {
        return originalEnd.call(this, chunk, encoding, callback);
      }

      // Set appropriate headers
      res.setHeader('Content-Encoding', compression);
      res.setHeader('Vary', 'Accept-Encoding');
      res.removeHeader('Content-Length'); // Will be recalculated after compression

      isCompressed = true;

      try {
        // Create compression stream
        let compressor;
        switch (compression) {
          case 'br':
            compressor = createBrotliCompress({
              params: {
                [require('zlib').constants.BROTLI_PARAM_QUALITY]: options.level,
              },
            });
            break;
          case 'gzip':
            compressor = createGzip({ level: options.level });
            break;
          case 'deflate':
            compressor = createDeflate({ level: options.level });
            break;
          default:
            return originalEnd.call(this, chunk, encoding, callback);
        }

        // Compress the content
        const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
        const compressed: Buffer[] = [];

        compressor.on('data', (data: Buffer) => compressed.push(data));
        compressor.on('end', () => {
          const result = Buffer.concat(compressed);
          originalEnd.call(res, result, 'utf8' as BufferEncoding, callback);
        });
        compressor.on('error', (error) => {
          console.error('[Compression] Error:', error);
          // Fallback to uncompressed response
          res.removeHeader('Content-Encoding');
          originalEnd.call(res, chunk, encoding, callback);
        });

        compressor.end(bufferChunk);
      } catch (error) {
        console.error('[Compression] Unexpected error:', error);
        // Fallback to uncompressed response
        res.removeHeader('Content-Encoding');
        return originalEnd.call(this, chunk, encoding, callback);
      }

      return this;
    };

    next();
  };
}

/**
 * Default compression middleware with standard settings
 */
export const compressionMiddleware = createCompressionMiddleware();

/**
 * High-compression middleware for static assets
 */
export const highCompressionMiddleware = createCompressionMiddleware({
  threshold: 512, // Compress smaller files
  level: 9, // Maximum compression
});

/**
 * Fast compression middleware for frequent API calls
 */
export const fastCompressionMiddleware = createCompressionMiddleware({
  threshold: 2048, // Only compress larger responses
  level: 1, // Fastest compression
  filter: (req, res) => {
    // Skip compression for real-time endpoints
    return !req.path.includes('/realtime') && !req.path.includes('/stream');
  },
});

export default compressionMiddleware;
