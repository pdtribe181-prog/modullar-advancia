-- PayLedger Storage Bootstrap
-- Target project: pikguczsvikzragmrojz
-- Purpose: create the six required Storage buckets and align their policies with the current backend upload flow.
-- Run in Supabase SQL Editor after the core schema and helper functions (e.g. public.is_admin, public.is_provider) already exist.

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  ),
  (
    'provider-documents',
    'provider-documents',
    false,
    52428800,
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'medical-records',
    'medical-records',
    false,
    104857600,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/dicom', 'image/dicom-rle']
  ),
  (
    'invoice-attachments',
    'invoice-attachments',
    false,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
  ),
  (
    'dispute-evidence',
    'dispute-evidence',
    false,
    52428800,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg']
  ),
  (
    'message-attachments',
    'message-attachments',
    false,
    20971520,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar." ON storage.objects;
CREATE POLICY "Users can upload their own avatar." ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar." ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can delete their own avatar." ON storage.objects;
CREATE POLICY "Users can delete their own avatar." ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Providers can view their own documents." ON storage.objects;
CREATE POLICY "Providers can view their own documents." ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'provider-documents' AND
    (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Providers can upload their own documents." ON storage.objects;
CREATE POLICY "Providers can upload their own documents." ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'provider-documents' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Providers can update their own documents." ON storage.objects;
CREATE POLICY "Providers can update their own documents." ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'provider-documents' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Providers can delete their own documents." ON storage.objects;
CREATE POLICY "Providers can delete their own documents." ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'provider-documents' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can view their own medical records." ON storage.objects;
CREATE POLICY "Users can view their own medical records." ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-records' AND
    (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      OR public.is_admin()
      OR public.is_provider()
    )
  );

DROP POLICY IF EXISTS "Providers can upload medical records." ON storage.objects;
CREATE POLICY "Providers can upload medical records." ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'medical-records' AND
    (public.is_provider() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Providers can update medical records." ON storage.objects;
CREATE POLICY "Providers can update medical records." ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'medical-records' AND
    (public.is_provider() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Providers can delete medical records." ON storage.objects;
CREATE POLICY "Providers can delete medical records." ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'medical-records' AND
    (public.is_provider() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Users can view their own invoice attachments." ON storage.objects;
CREATE POLICY "Users can view their own invoice attachments." ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoice-attachments' AND
    (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      OR public.is_admin()
      OR public.is_provider()
    )
  );

DROP POLICY IF EXISTS "Providers can upload invoice attachments." ON storage.objects;
CREATE POLICY "Providers can upload invoice attachments." ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'invoice-attachments' AND
    (public.is_provider() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Providers can update invoice attachments." ON storage.objects;
CREATE POLICY "Providers can update invoice attachments." ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'invoice-attachments' AND
    (public.is_provider() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Providers can delete invoice attachments." ON storage.objects;
CREATE POLICY "Providers can delete invoice attachments." ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'invoice-attachments' AND
    (public.is_provider() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Users can view their own dispute evidence." ON storage.objects;
CREATE POLICY "Users can view their own dispute evidence." ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'dispute-evidence' AND
    (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can upload their own dispute evidence." ON storage.objects;
CREATE POLICY "Users can upload their own dispute evidence." ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dispute-evidence' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can update their own dispute evidence." ON storage.objects;
CREATE POLICY "Users can update their own dispute evidence." ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'dispute-evidence' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can delete their own dispute evidence." ON storage.objects;
CREATE POLICY "Users can delete their own dispute evidence." ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dispute-evidence' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can view their own message attachments." ON storage.objects;
CREATE POLICY "Users can view their own message attachments." ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments' AND
    (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can upload their own message attachments." ON storage.objects;
CREATE POLICY "Users can upload their own message attachments." ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can update their own message attachments." ON storage.objects;
CREATE POLICY "Users can update their own message attachments." ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'message-attachments' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can delete their own message attachments." ON storage.objects;
CREATE POLICY "Users can delete their own message attachments." ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'message-attachments' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

COMMIT;