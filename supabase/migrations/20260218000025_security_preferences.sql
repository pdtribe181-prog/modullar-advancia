-- Migration 025: Security Preferences & Account Recovery
-- Adds security notification preferences and recovery phone columns

-- ============================================================
-- ADD SECURITY PREFERENCES TO USER_PROFILES
-- ============================================================

-- Add security_preferences column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS security_preferences jsonb DEFAULT '{
  "emailNotifications": true,
  "smsNotifications": false,
  "notifyOnLogin": false,
  "notifyOnPasswordChange": true,
  "notifyOnEmailChange": true,
  "notifyOnNewDevice": true
}'::jsonb;

-- Add recovery_phone column (different from primary phone)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS recovery_phone text;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS recovery_phone_verified boolean DEFAULT false;

-- Index for recovery phone lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_recovery_phone 
ON public.user_profiles(recovery_phone) 
WHERE recovery_phone IS NOT NULL;

-- ============================================================
-- SECURITY EVENTS LOG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'login', 'logout', 'password_changed', 'email_changed',
    'phone_changed', 'mfa_enabled', 'mfa_disabled', 'mfa_challenged',
    'recovery_initiated', 'recovery_completed', 'identity_linked',
    'identity_unlinked', 'failed_login', 'suspicious_activity'
  )),
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  location jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);

-- RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own security events" ON public.security_events;
CREATE POLICY "Users can view their own security events"
ON public.security_events FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
CREATE POLICY "System can insert security events"
ON public.security_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can view all security events
DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
CREATE POLICY "Admins can view all security events"
ON public.security_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================
-- FUNCTION TO LOG SECURITY EVENTS
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type,
    p_ip_address,
    p_user_agent,
    p_metadata
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE public.security_events IS 'Audit log for security-related events';
COMMENT ON COLUMN public.user_profiles.security_preferences IS 'User notification preferences for security alerts';
COMMENT ON COLUMN public.user_profiles.recovery_phone IS 'Phone number for account recovery (separate from primary phone)';
