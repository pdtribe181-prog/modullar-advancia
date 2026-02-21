-- Migration 045: Fix HIPAA audit log RLS policy
-- Resolves "RLS Policy Always True" warning by restricting inserts to the authenticated user's own ID.

DO $$
BEGIN
    -- Drop the overly permissive policy
    DROP POLICY IF EXISTS "System can insert HIPAA logs" ON public.hipaa_audit_log;

    -- Create a more restrictive policy
    CREATE POLICY "Users can insert own HIPAA logs" ON public.hipaa_audit_log
        FOR INSERT
        TO authenticated
        WITH CHECK (user_id = (select auth.uid()));
END $$;
