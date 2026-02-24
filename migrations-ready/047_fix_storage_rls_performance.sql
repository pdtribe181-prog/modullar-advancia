-- Migration 047: Fix storage RLS performance by wrapping auth.uid() in a select statement
-- This prevents the function from being evaluated for every row.

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on storage.objects that use auth.uid() directly
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%( SELECT auth.uid()%')
           OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%( SELECT auth.uid()%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Recreate the policies with (select auth.uid())
-- Avatars
CREATE POLICY "Users can upload their own avatar." ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can update their own avatar." ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can delete their own avatar." ON storage.objects
    FOR DELETE
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- Documents
CREATE POLICY "Providers can view their own documents." ON storage.objects
    FOR SELECT
    USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Providers can upload their own documents." ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Providers can update their own documents." ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Providers can delete their own documents." ON storage.objects
    FOR DELETE
    USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- Medical Records
CREATE POLICY "Users can view their own medical records." ON storage.objects
    FOR SELECT
    USING (bucket_id = 'medical_records' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Patients can upload own medical records" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'medical_records' AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- Invoices
CREATE POLICY "Users can view their own invoice attachments." ON storage.objects
    FOR SELECT
    USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- Disputes
CREATE POLICY "Users can view their own dispute evidence." ON storage.objects
    FOR SELECT
    USING (bucket_id = 'disputes' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can upload their own dispute evidence." ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'disputes' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can update their own dispute evidence." ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'disputes' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can delete their own dispute evidence." ON storage.objects
    FOR DELETE
    USING (bucket_id = 'disputes' AND (storage.foldername(name))[1] = (select auth.uid())::text);

-- Messages
CREATE POLICY "Users can view their own message attachments." ON storage.objects
    FOR SELECT
    USING (bucket_id = 'messages' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can upload their own message attachments." ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'messages' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can update their own message attachments." ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'messages' AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Users can delete their own message attachments." ON storage.objects
    FOR DELETE
    USING (bucket_id = 'messages' AND (storage.foldername(name))[1] = (select auth.uid())::text);
