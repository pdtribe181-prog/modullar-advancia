/**
 * Upload Middleware & Routes Tests
 *
 * Tests file validation (MIME-type checking, magic bytes, size limits,
 * dangerous extensions) and upload route behaviour.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──

const mockUpload = jest.fn<any>();
const mockGetPublicUrl = jest
  .fn<any>()
  .mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/avatar.png' } });
const mockCreateSignedUrl = jest
  .fn<any>()
  .mockResolvedValue({ data: { signedUrl: 'https://cdn.example.com/signed' }, error: null });
const mockStorageUpload = jest
  .fn<any>()
  .mockResolvedValue({ data: { path: 'user/file.png' }, error: null });

const mockFrom = jest.fn<any>();
const mockStorageFrom = jest.fn<any>().mockReturnValue({
  upload: mockStorageUpload,
  getPublicUrl: mockGetPublicUrl,
  createSignedUrl: mockCreateSignedUrl,
});

jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: { from: mockFrom },
  createServiceClient: () => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  }),
}));

jest.unstable_mockModule('../services/stripe.service.js', () => ({
  stripeServices: {},
}));

jest.unstable_mockModule('../middleware/logging.middleware.js', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.unstable_mockModule('../middleware/rateLimit.middleware.js', () => ({
  authLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  apiLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  sensitiveLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  onboardingLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const mockUser = {
  id: 'a1111111-1111-4111-a111-111111111111',
  email: 'user@example.com',
  user_metadata: { full_name: 'Test User' },
};

jest.unstable_mockModule('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    next();
  },
  authenticateWithProfile: (req: any, _res: Response, next: NextFunction) => {
    req.user = mockUser;
    req.userProfile = { id: mockUser.id, role: 'patient' };
    next();
  },
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
  AuthenticatedRequest: {},
}));

// ── Dynamic imports ──

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { default: uploadRouter } = await import('../routes/upload.routes.js');
const {
  validateMagicBytes,
  safeFilename,
  BUCKET_CONFIGS,
  createUpload,
  validateFileContent,
  handleMulterError,
} = await import('../middleware/upload.middleware.js');
const { sendErrorResponse } = await import('../utils/errors.js');

// ── Test app ──

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/upload', uploadRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    sendErrorResponse(res, err, undefined);
  });
  return app;
}

// ══════════════════════════════════════════════════════════════
// Unit tests — middleware helpers
// ══════════════════════════════════════════════════════════════

describe('upload.middleware', () => {
  describe('BUCKET_CONFIGS', () => {
    it('defines 6 buckets', () => {
      expect(Object.keys(BUCKET_CONFIGS)).toHaveLength(6);
    });

    it('avatars bucket allows only images up to 5 MB', () => {
      const cfg = BUCKET_CONFIGS['avatars'];
      expect(cfg.maxSize).toBe(5 * 1024 * 1024);
      expect(cfg.allowedMimeTypes).toContain('image/jpeg');
      expect(cfg.allowedMimeTypes).toContain('image/png');
      expect(cfg.maxFiles).toBe(1);
    });

    it('medical-records bucket allows up to 100 MB', () => {
      expect(BUCKET_CONFIGS['medical-records'].maxSize).toBe(100 * 1024 * 1024);
    });
  });

  describe('validateMagicBytes', () => {
    it('accepts valid JPEG magic bytes', () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      expect(validateMagicBytes(buf, 'image/jpeg')).toBe(true);
    });

    it('rejects buffer that does not match JPEG', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG bytes
      expect(validateMagicBytes(buf, 'image/jpeg')).toBe(false);
    });

    it('accepts valid PNG magic bytes', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      expect(validateMagicBytes(buf, 'image/png')).toBe(true);
    });

    it('accepts valid PDF magic bytes', () => {
      const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
      expect(validateMagicBytes(buf, 'application/pdf')).toBe(true);
    });

    it('returns true for unknown MIME types (no signature)', () => {
      const buf = Buffer.from([0x00, 0x00, 0x00]);
      expect(validateMagicBytes(buf, 'application/dicom')).toBe(true);
    });

    it('returns false when buffer is too short', () => {
      const buf = Buffer.from([0xff]);
      expect(validateMagicBytes(buf, 'image/jpeg')).toBe(false);
    });
  });

  describe('safeFilename', () => {
    it('preserves the extension', () => {
      const name = safeFilename('photo.JPG');
      expect(name).toMatch(/\.jpg$/);
    });

    it('generates UUID-based name', () => {
      const name = safeFilename('test.png');
      // UUID v4: 8-4-4-4-12 hex
      expect(name).toMatch(/^[a-f0-9-]{36}\.png$/);
    });

    it('produces unique names', () => {
      const a = safeFilename('file.pdf');
      const b = safeFilename('file.pdf');
      expect(a).not.toBe(b);
    });
  });

  describe('createUpload', () => {
    it('throws for unknown bucket', () => {
      expect(() => createUpload('nonexistent')).toThrow('Unknown storage bucket');
    });

    it('returns a multer instance for known bucket', () => {
      const upload = createUpload('avatars');
      expect(upload).toBeDefined();
      expect(typeof upload.single).toBe('function');
      expect(typeof upload.array).toBe('function');
    });
  });

  describe('validateFileContent', () => {
    it('calls next when magic bytes match', () => {
      const middleware = validateFileContent('avatars');
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00]);
      const mockReq = {
        file: {
          buffer: jpegBuffer,
          mimetype: 'image/jpeg',
          originalname: 'photo.jpg',
          filename: '',
        },
      } as any;
      const next = jest.fn<any>();
      middleware(mockReq, {} as any, next);
      expect(next).toHaveBeenCalledWith();
      expect(mockReq.file.filename).toMatch(/\.jpg$/);
    });

    it('calls next with error when magic bytes do not match', () => {
      const middleware = validateFileContent('avatars');
      const badBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const mockReq = {
        file: {
          buffer: badBuffer,
          mimetype: 'image/jpeg',
          originalname: 'photo.jpg',
          filename: '',
        },
      } as any;
      const next = jest.fn<any>();
      middleware(mockReq, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('handles req.files array', () => {
      const middleware = validateFileContent('avatars');
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const mockReq = {
        files: [{ buffer: pngBuffer, mimetype: 'image/png', originalname: 'a.png', filename: '' }],
      } as any;
      const next = jest.fn<any>();
      middleware(mockReq, {} as any, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('calls next when no files present', () => {
      const middleware = validateFileContent('avatars');
      const mockReq = {} as any;
      const next = jest.fn<any>();
      middleware(mockReq, {} as any, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('handleMulterError', () => {
    it('converts LIMIT_FILE_SIZE to 413 AppError', async () => {
      const multerModule = (await import('multer')) as any;
      const multer = multerModule.default ?? multerModule;
      const err = new multer.MulterError('LIMIT_FILE_SIZE');
      const next = jest.fn<any>();
      handleMulterError(err, {} as any, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 413 }));
    });

    it('converts LIMIT_FILE_COUNT to 400 AppError', async () => {
      const multerModule = (await import('multer')) as any;
      const multer = multerModule.default ?? multerModule;
      const err = new multer.MulterError('LIMIT_FILE_COUNT');
      const next = jest.fn<any>();
      handleMulterError(err, {} as any, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('converts LIMIT_UNEXPECTED_FILE to 400 AppError', async () => {
      const multerModule = (await import('multer')) as any;
      const multer = multerModule.default ?? multerModule;
      const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      const next = jest.fn<any>();
      handleMulterError(err, {} as any, {} as any, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('passes AppError through unchanged', async () => {
      const { AppError } = await import('../utils/errors.js');
      const appErr = new AppError('custom', 422, 'CUSTOM');
      const next = jest.fn<any>();
      handleMulterError(appErr, {} as any, {} as any, next);
      expect(next).toHaveBeenCalledWith(appErr);
    });

    it('passes unknown errors through', () => {
      const err = new Error('random');
      const next = jest.fn<any>();
      handleMulterError(err, {} as any, {} as any, next);
      expect(next).toHaveBeenCalledWith(err);
    });

    it('handles unknown MulterError code with default case', async () => {
      const multerModule = (await import('multer')) as any;
      const multer = multerModule.default ?? multerModule;
      const err = new multer.MulterError('LIMIT_PART_COUNT');
      const next = jest.fn<any>();
      handleMulterError(err, {} as any, {} as any, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, code: 'UPLOAD_ERROR' })
      );
    });
  });
});

// ══════════════════════════════════════════════════════════════
// Integration tests — upload routes
// ══════════════════════════════════════════════════════════════

describe('upload.routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();

    // Mock the user_profiles update chain for avatar upload
    const updateChain: any = {};
    updateChain.update = jest.fn<any>().mockReturnValue(updateChain);
    updateChain.eq = jest.fn<any>().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(updateChain);

    // Reset storage mocks
    mockStorageUpload.mockResolvedValue({ data: { path: 'user/file.png' }, error: null });
  });

  describe('POST /upload/avatar', () => {
    it('uploads a valid JPEG avatar', async () => {
      // JPEG magic bytes + some padding
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

      const res = await request(app)
        .post('/upload/avatar')
        .set('Authorization', 'Bearer test-token')
        .attach('file', jpegBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bucket).toBe('avatars');
      expect(res.body.data.mimeType).toBe('image/jpeg');
      expect(mockStorageFrom).toHaveBeenCalledWith('avatars');
    });

    it('uploads a valid PNG avatar', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const res = await request(app)
        .post('/upload/avatar')
        .set('Authorization', 'Bearer test-token')
        .attach('file', pngBuffer, { filename: 'photo.png', contentType: 'image/png' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bucket).toBe('avatars');
    });

    it('rejects non-image MIME type', async () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

      const res = await request(app)
        .post('/upload/avatar')
        .set('Authorization', 'Bearer test-token')
        .attach('file', pdfBuffer, { filename: 'doc.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects file with dangerous extension even if MIME type is allowed', async () => {
      // Send valid JPEG MIME type but with .exe extension — triggers DANGEROUS_FILE_EXTENSION
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      const res = await request(app)
        .post('/upload/avatar')
        .set('Authorization', 'Bearer test-token')
        .attach('file', jpegBuffer, { filename: 'malware.exe', contentType: 'image/jpeg' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects file with mismatched magic bytes', async () => {
      // Claim JPEG content-type but send PNG bytes
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const res = await request(app)
        .post('/upload/avatar')
        .set('Authorization', 'Bearer test-token')
        .attach('file', pngBuffer, { filename: 'sneaky.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('content');
    });

    it('returns 400 when no file is provided', async () => {
      const res = await request(app)
        .post('/upload/avatar')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });

    it('returns 500 when Supabase storage fails', async () => {
      mockStorageUpload.mockResolvedValueOnce({ data: null, error: { message: 'Storage error' } });

      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      const res = await request(app)
        .post('/upload/avatar')
        .set('Authorization', 'Bearer test-token')
        .attach('file', jpegBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /upload/document', () => {
    it('uploads multiple PDF documents', async () => {
      mockStorageFrom.mockReturnValue({
        upload: mockStorageUpload,
        createSignedUrl: mockCreateSignedUrl,
      });

      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

      const res = await request(app)
        .post('/upload/document')
        .set('Authorization', 'Bearer test-token')
        .attach('files', pdfBuffer, { filename: 'license.pdf', contentType: 'application/pdf' })
        .attach('files', pdfBuffer, { filename: 'cert.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(200);
      expect(res.body.data.files).toHaveLength(2);
    });
  });

  describe('POST /upload/medical-record', () => {
    it('uploads medical record and creates compliance log', async () => {
      // Mock compliance_logs insert
      const insertChain: any = {};
      insertChain.insert = jest.fn<any>().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue(insertChain);

      mockStorageFrom.mockReturnValue({
        upload: mockStorageUpload,
        createSignedUrl: mockCreateSignedUrl,
      });

      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

      const res = await request(app)
        .post('/upload/medical-record')
        .set('Authorization', 'Bearer test-token')
        .attach('files', pdfBuffer, { filename: 'scan.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(200);
      expect(res.body.data.files).toHaveLength(1);
      // Compliance log insertion should have been called
      expect(mockFrom).toHaveBeenCalledWith('compliance_logs');
    });
  });

  describe('POST /upload/dispute-evidence', () => {
    it('uploads dispute evidence files', async () => {
      mockStorageFrom.mockReturnValue({
        upload: mockStorageUpload,
        createSignedUrl: mockCreateSignedUrl,
      });

      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

      const res = await request(app)
        .post('/upload/dispute-evidence')
        .set('Authorization', 'Bearer test-token')
        .attach('files', pdfBuffer, { filename: 'evidence.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.files).toHaveLength(1);
      expect(mockStorageFrom).toHaveBeenCalledWith('dispute-evidence');
    });

    it('returns 400 when no files are provided', async () => {
      const res = await request(app)
        .post('/upload/dispute-evidence')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /upload/message-attachment', () => {
    it('uploads message attachment files', async () => {
      mockStorageFrom.mockReturnValue({
        upload: mockStorageUpload,
        createSignedUrl: mockCreateSignedUrl,
      });

      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      const res = await request(app)
        .post('/upload/message-attachment')
        .set('Authorization', 'Bearer test-token')
        .attach('files', pngBuffer, { filename: 'screenshot.png', contentType: 'image/png' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.files).toHaveLength(1);
      expect(mockStorageFrom).toHaveBeenCalledWith('message-attachments');
    });

    it('returns 400 when no files are provided', async () => {
      const res = await request(app)
        .post('/upload/message-attachment')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /upload/invoice-attachment', () => {
    it('uploads invoice attachment files', async () => {
      mockStorageFrom.mockReturnValue({
        upload: mockStorageUpload,
        createSignedUrl: mockCreateSignedUrl,
      });

      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

      const res = await request(app)
        .post('/upload/invoice-attachment')
        .set('Authorization', 'Bearer test-token')
        .attach('files', pdfBuffer, { filename: 'receipt.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.files).toHaveLength(1);
      expect(mockStorageFrom).toHaveBeenCalledWith('invoice-attachments');
    });

    it('returns 400 when no files are provided', async () => {
      const res = await request(app)
        .post('/upload/invoice-attachment')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });
  });
});
