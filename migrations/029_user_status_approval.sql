-- Migration: Add user status and last_login tracking
-- For admin approval workflow

-- Add status column to user_profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles'
                 AND column_name = 'status') THEN
    ALTER TABLE user_profiles
    ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended'));
  END IF;
END $$;

-- Add last_login column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_profiles'
                 AND column_name = 'last_login') THEN
    ALTER TABLE user_profiles
    ADD COLUMN last_login TIMESTAMPTZ;
  END IF;
END $$;

-- Update existing users to 'active' status (so they're not locked out)
UPDATE user_profiles SET status = 'active' WHERE status IS NULL OR status = 'pending';

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- Create index for last_login queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login);

-- Function to update last_login on sign-in (can be called from application)
CREATE OR REPLACE FUNCTION update_user_last_login(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles
  SET last_login = NOW(), updated_at = NOW()
  WHERE id = user_id;
END;
$$;

-- Policy to allow admins to update user status
DROP POLICY IF EXISTS "Admins can update user status" ON user_profiles;
CREATE POLICY "Admins can update user status" ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_user_last_login TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_last_login TO service_role;

COMMENT ON COLUMN user_profiles.status IS 'User account status: pending (awaiting admin approval), active (can login), suspended (blocked)';
COMMENT ON COLUMN user_profiles.last_login IS 'Timestamp of user last successful login';
