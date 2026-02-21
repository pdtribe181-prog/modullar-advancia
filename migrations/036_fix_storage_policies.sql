-- ============================================================
-- Migration 036: Fix Storage Policies
-- ============================================================
-- This migration ensures that all storage buckets have the correct RLS policies
-- applied to them.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. avatars (Public)
-- Anyone can view, authenticated users can upload/update their own.
-- ============================================================
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

-- ============================================================
-- 2. provider-documents (Private)
-- Providers can upload/view their own, admins can view all.
-- ============================================================
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

-- ============================================================
-- 3. medical-records (Private)
-- Patients can view their own, providers can view/upload for their patients.
-- ============================================================
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

-- ============================================================
-- 4. invoice-attachments (Private)
-- Users can view their own, providers can upload.
-- ============================================================
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

-- ============================================================
-- 5. dispute-evidence (Private)
-- Users can upload/view their own, admins can view all.
-- ============================================================
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

-- ============================================================
-- 6. message-attachments (Private)
-- Users can upload/view their own.
-- ============================================================
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
