/**
 * File Upload Validation Middleware
 *
 * Provides multer-based file handling with per-bucket validation that mirrors
 * the Supabase Storage bucket definitions (migration 014).
 *
 * Buckets:
 *   avatars            – 5 MB,  image/*
 *   provider-documents – 50 MB, pdf, images, docx
 *   medical-records    – 100 MB, pdf, images, DICOM
 *   invoice-attachments– 10 MB, pdf, images
 *   dispute-evidence   – 50 MB, pdf, images, video, audio
 *   message-attachments– 20 MB, pdf, images, gif, video
 */

import multer, { type FileFilterCallback, type StorageEngine } from 'multer';
import type { Request } from 'express';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../utils/errors.js';

// ────────────────────────────────────────────────────────────
// Bucket configuration — mirrors Supabase storage buckets
// ────────────────────────────────────────────────────────────

export interface BucketConfig {
  /** Maximum file size in bytes */
  maxSize: number;
  /** Allowed MIME types */
  allowedMimeTypes: string[];
  /** Maximum number of files per request */
  maxFiles: number;
}

export const BUCKET_CONFIGS: Record<string, BucketConfig> = {
  avatars: {
    maxSize: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFiles: 1,
  },
  'provider-documents': {
    maxSize: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxFiles: 5,
  },
  'medical-records': {
    maxSize: 100 * 1024 * 1024, // 100 MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/dicom',
      'image/dicom-rle',
    ],
    maxFiles: 10,
  },
  'invoice-attachments': {
    maxSize: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxFiles: 3,
  },
  'dispute-evidence': {
    maxSize: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg'],
    maxFiles: 10,
  },
  'message-attachments': {
    maxSize: 20 * 1024 * 1024, // 20 MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    maxFiles: 5,
  },
};

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/** Generate a collision-resistant filename while preserving the extension. */
function safeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const id = crypto.randomUUID();
  return `${id}${ext}`;
}

/** Validate MIME type against magic bytes (first few bytes of buffer).
 *  This catches clients that simply forge the Content-Type header. */
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF)
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'video/mp4': [], // ftyp box varies, skip deep check
  'audio/mpeg': [0xff, 0xfb], // MP3 sync word (common)
};

export function validateMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  const expected = MAGIC_BYTES[declaredMime];
  if (!expected || expected.length === 0) return true; // no signature to check
  if (buffer.length < expected.length) return false;
  return expected.every((byte, i) => buffer[i] === byte);
}

// ────────────────────────────────────────────────────────────
// Multer factories
// ────────────────────────────────────────────────────────────

/** Memory storage — files stay in RAM and are forwarded to Supabase Storage. */
const memoryStorage: StorageEngine = multer.memoryStorage();

/**
 * Create a multer instance configured for a specific bucket.
 *
 * @param bucket – One of the keys in BUCKET_CONFIGS
 * @returns multer instance ready to be used as Express middleware
 *
 * @example
 *   router.post('/avatar', authenticate, createUpload('avatars').single('file'), handler);
 */
export function createUpload(bucket: string) {
  const config = BUCKET_CONFIGS[bucket];
  if (!config) {
    throw new Error(`Unknown storage bucket: "${bucket}"`);
  }

  return multer({
    storage: memoryStorage,
    limits: {
      fileSize: config.maxSize,
      files: config.maxFiles,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      // 1. MIME-type whitelist
      if (!config.allowedMimeTypes.includes(file.mimetype)) {
        return cb(
          new AppError(
            `File type "${file.mimetype}" is not allowed for bucket "${bucket}". ` +
              `Allowed: ${config.allowedMimeTypes.join(', ')}`,
            400,
            'INVALID_FILE_TYPE'
          )
        );
      }

      // 2. Extension sanity check (prevents .exe renamed to .pdf)
      const ext = path.extname(file.originalname).toLowerCase();
      const DANGEROUS_EXTENSIONS = [
        '.exe',
        '.bat',
        '.cmd',
        '.sh',
        '.ps1',
        '.msi',
        '.dll',
        '.scr',
        '.com',
        '.vbs',
        '.js',
        '.php',
      ];
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        return cb(
          new AppError(`File extension "${ext}" is not allowed.`, 400, 'DANGEROUS_FILE_EXTENSION')
        );
      }

      cb(null, true);
    },
  });
}

/**
 * Post-upload magic-byte validation middleware.
 * Use AFTER multer has parsed the file into `req.file` / `req.files`.
 */
export function validateFileContent(bucket: string) {
  return (req: Request, _res: unknown, next: (err?: unknown) => void) => {
    const files: Express.Multer.File[] = [];

    if ((req as any).file) files.push((req as any).file);
    if (Array.isArray((req as any).files)) files.push(...(req as any).files);

    for (const file of files) {
      if (!validateMagicBytes(file.buffer, file.mimetype)) {
        return next(
          new AppError(
            `File content does not match declared type "${file.mimetype}".`,
            400,
            'FILE_CONTENT_MISMATCH'
          )
        );
      }

      // Overwrite originalname with safe name to prevent path traversal
      file.filename = safeFilename(file.originalname);
    }

    next();
  };
}

/**
 * Error-handling wrapper that converts multer-specific errors
 * (e.g. LIMIT_FILE_SIZE) into AppErrors with user-friendly messages.
 */
export function handleMulterError(
  err: any,
  _req: Request,
  _res: unknown,
  next: (err?: unknown) => void
) {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE': {
        return next(new AppError('File exceeds maximum allowed size.', 413, 'FILE_TOO_LARGE'));
      }
      case 'LIMIT_FILE_COUNT': {
        return next(new AppError('Too many files uploaded.', 400, 'TOO_MANY_FILES'));
      }
      case 'LIMIT_UNEXPECTED_FILE': {
        return next(new AppError('Unexpected file field name.', 400, 'UNEXPECTED_FIELD'));
      }
      default:
        return next(new AppError(`Upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
    }
  }

  // AppError thrown from fileFilter — pass along
  if (err instanceof AppError) {
    return next(err);
  }

  next(err);
}

export { safeFilename };
