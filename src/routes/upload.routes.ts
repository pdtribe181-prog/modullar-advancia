/**
 * File Upload Routes
 *
 * Handles validated file uploads and proxies them to Supabase Storage.
 * Each endpoint enforces per-bucket size/type limits via the upload middleware,
 * validates magic bytes, then stores the file under the authenticated user's
 * folder in the corresponding Supabase Storage bucket.
 *
 * Routes:
 *   POST /upload/avatar              – single image (avatars bucket, 5 MB)
 *   POST /upload/document            – up to 5 files (provider-documents, 50 MB each)
 *   POST /upload/medical-record      – up to 10 files (medical-records, 100 MB each)
 *   POST /upload/invoice-attachment   – up to 3 files (invoice-attachments, 10 MB each)
 *   POST /upload/dispute-evidence     – up to 10 files (dispute-evidence, 50 MB each)
 *   POST /upload/message-attachment   – up to 5 files (message-attachments, 20 MB each)
 */

import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  createUpload,
  validateFileContent,
  handleMulterError,
  BUCKET_CONFIGS,
} from '../middleware/upload.middleware.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { logger } from '../middleware/logging.middleware.js';

const router = Router();

// ────────────────────────────────────────────────────────────
// Helper – upload files to Supabase Storage
// ────────────────────────────────────────────────────────────

interface UploadResult {
  bucket: string;
  path: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string | null;
}

async function uploadToSupabase(
  file: Express.Multer.File,
  bucket: string,
  userId: string,
  subfolder?: string
): Promise<UploadResult> {
  const supabase = createServiceClient();
  const folder = subfolder ? `${userId}/${subfolder}` : userId;
  const storagePath = `${folder}/${file.filename}`;

  const { error } = await supabase.storage.from(bucket).upload(storagePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    logger.error('Supabase storage upload failed', error as Error, {
      bucket,
      path: storagePath,
    });
    throw AppError.internal('File upload failed');
  }

  // Generate public URL for public buckets, signed URL for private
  const bucketIsPublic = bucket === 'avatars';
  let url: string | null = null;

  if (bucketIsPublic) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    url = data.publicUrl;
  } else {
    const { data, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 3600); // 1 hour
    if (!signError && data) url = data.signedUrl;
  }

  return {
    bucket,
    path: storagePath,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    url,
  };
}

// ────────────────────────────────────────────────────────────
// POST /upload/avatar — single avatar image
// ────────────────────────────────────────────────────────────

router.post(
  '/avatar',
  authenticate,
  createUpload('avatars').single('file'),
  handleMulterError,
  validateFileContent('avatars'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError('No file provided', 400, 'NO_FILE');

    const userId = req.user!.id;
    const result = await uploadToSupabase(file, 'avatars', userId);

    // Update user profile avatar_url
    const supabase = createServiceClient();
    await supabase
      .from('user_profiles')
      .update({ avatar_url: result.url, updated_at: new Date().toISOString() })
      .eq('id', userId);

    logger.info('Avatar uploaded', { userId, path: result.path });
    res.json({ success: true, data: result });
  })
);

// ────────────────────────────────────────────────────────────
// POST /upload/document — provider documents
// ────────────────────────────────────────────────────────────

router.post(
  '/document',
  authenticate,
  createUpload('provider-documents').array('files', BUCKET_CONFIGS['provider-documents'].maxFiles),
  handleMulterError,
  validateFileContent('provider-documents'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) throw new AppError('No files provided', 400, 'NO_FILE');

    const userId = req.user!.id;
    const results = await Promise.all(
      files.map((f) => uploadToSupabase(f, 'provider-documents', userId))
    );

    logger.info('Provider documents uploaded', { userId, count: results.length });
    res.json({ success: true, data: { files: results } });
  })
);

// ────────────────────────────────────────────────────────────
// POST /upload/medical-record — HIPAA-sensitive medical records
// ────────────────────────────────────────────────────────────

router.post(
  '/medical-record',
  authenticate,
  createUpload('medical-records').array('files', BUCKET_CONFIGS['medical-records'].maxFiles),
  handleMulterError,
  validateFileContent('medical-records'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) throw new AppError('No files provided', 400, 'NO_FILE');

    const userId = req.user!.id;
    const results = await Promise.all(
      files.map((f) => uploadToSupabase(f, 'medical-records', userId))
    );

    // Audit log for HIPAA compliance
    const supabase = createServiceClient();
    await supabase.from('compliance_logs').insert({
      user_id: userId,
      action: 'medical_record_upload',
      details: { fileCount: results.length, paths: results.map((r) => r.path) },
    });

    logger.info('Medical records uploaded', { userId, count: results.length });
    res.json({ success: true, data: { files: results } });
  })
);

// ────────────────────────────────────────────────────────────
// POST /upload/invoice-attachment
// ────────────────────────────────────────────────────────────

router.post(
  '/invoice-attachment',
  authenticate,
  createUpload('invoice-attachments').array(
    'files',
    BUCKET_CONFIGS['invoice-attachments'].maxFiles
  ),
  handleMulterError,
  validateFileContent('invoice-attachments'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) throw new AppError('No files provided', 400, 'NO_FILE');

    const userId = req.user!.id;
    const results = await Promise.all(
      files.map((f) => uploadToSupabase(f, 'invoice-attachments', userId))
    );

    logger.info('Invoice attachments uploaded', { userId, count: results.length });
    res.json({ success: true, data: { files: results } });
  })
);

// ────────────────────────────────────────────────────────────
// POST /upload/dispute-evidence
// ────────────────────────────────────────────────────────────

router.post(
  '/dispute-evidence',
  authenticate,
  createUpload('dispute-evidence').array('files', BUCKET_CONFIGS['dispute-evidence'].maxFiles),
  handleMulterError,
  validateFileContent('dispute-evidence'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) throw new AppError('No files provided', 400, 'NO_FILE');

    const userId = req.user!.id;
    const results = await Promise.all(
      files.map((f) => uploadToSupabase(f, 'dispute-evidence', userId))
    );

    logger.info('Dispute evidence uploaded', { userId, count: results.length });
    res.json({ success: true, data: { files: results } });
  })
);

// ────────────────────────────────────────────────────────────
// POST /upload/message-attachment
// ────────────────────────────────────────────────────────────

router.post(
  '/message-attachment',
  authenticate,
  createUpload('message-attachments').array(
    'files',
    BUCKET_CONFIGS['message-attachments'].maxFiles
  ),
  handleMulterError,
  validateFileContent('message-attachments'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) throw new AppError('No files provided', 400, 'NO_FILE');

    const userId = req.user!.id;
    const results = await Promise.all(
      files.map((f) => uploadToSupabase(f, 'message-attachments', userId))
    );

    logger.info('Message attachments uploaded', { userId, count: results.length });
    res.json({ success: true, data: { files: results } });
  })
);

export default router;
