-- Migration 013: Fix Function Security - Set Immutable Search Path
-- Run this in Supabase SQL Editor to fix the security warning
-- This addresses: "Function has a role mutable search_path"

-- Fix update_onboarding_progress function
-- Setting search_path to empty string is the most secure option
ALTER FUNCTION public.update_onboarding_progress() SET search_path = '';

-- If the above fails because the function doesn't exist or has different signature,
-- uncomment and run the appropriate version below:

-- Option 1: If function takes provider_id and step parameters
/*
CREATE OR REPLACE FUNCTION public.update_onboarding_progress(
  p_provider_id uuid,
  p_step integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.guided_onboarding_progress
  SET 
    current_step = p_step,
    completion_percentage = (p_step * 100 / total_steps),
    last_activity_at = now(),
    updated_at = now()
  WHERE provider_id = p_provider_id;
END;
$$;
*/

-- Option 2: If you need to drop and recreate with correct definition
-- First check the function definition in Supabase:
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'update_onboarding_progress';

-- Grant execute permission if needed
-- GRANT EXECUTE ON FUNCTION public.update_onboarding_progress TO authenticated;

-- Note: Setting search_path = '' is more secure than search_path = 'public'
-- because it prevents any implicit schema resolution and forces fully qualified names