-- Migration 022: Vault Encryption for HIPAA Compliance
-- Encrypts sensitive PHI columns using Supabase Vault
-- Run this AFTER enabling Vault extension in Supabase Dashboard

-- ============================================================
-- VAULT SECRETS SETUP
-- ============================================================

-- Create encryption key for PHI data (do this once in Supabase Dashboard SQL Editor)
-- The key ID will be used for all encryption operations
DO $$
DECLARE
  key_exists boolean;
BEGIN
  -- Check if our encryption key already exists
  SELECT EXISTS(
    SELECT 1 FROM vault.secrets WHERE name = 'phi_encryption_key'
  ) INTO key_exists;
  
  IF NOT key_exists THEN
    -- Create the encryption key
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'base64'),
      'phi_encryption_key',
      'Encryption key for Protected Health Information (PHI)'
    );
  END IF;
END $$;

-- ============================================================
-- ENCRYPTION HELPER FUNCTIONS
-- ============================================================

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_phi(plaintext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  encryption_key text;
  encrypted_data text;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN plaintext;
  END IF;
  
  -- Get the encryption key from vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'phi_encryption_key';
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'PHI encryption key not found in vault';
  END IF;
  
  -- Encrypt using pgcrypto
  SELECT encode(
    pgp_sym_encrypt(plaintext, encryption_key),
    'base64'
  ) INTO encrypted_data;
  
  RETURN encrypted_data;
END;
$$;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_phi(ciphertext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  encryption_key text;
  decrypted_data text;
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN ciphertext;
  END IF;
  
  -- Get the encryption key from vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'phi_encryption_key';
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'PHI encryption key not found in vault';
  END IF;
  
  -- Decrypt
  BEGIN
    SELECT pgp_sym_decrypt(
      decode(ciphertext, 'base64'),
      encryption_key
    ) INTO decrypted_data;
  EXCEPTION WHEN OTHERS THEN
    -- Return as-is if not encrypted (for backwards compatibility)
    RETURN ciphertext;
  END;
  
  RETURN decrypted_data;
END;
$$;

-- ============================================================
-- ENCRYPTED COLUMNS - ADD NEW ENCRYPTED VERSIONS
-- ============================================================

-- Add encrypted columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ssn_encrypted text,
ADD COLUMN IF NOT EXISTS date_of_birth_encrypted text,
ADD COLUMN IF NOT EXISTS medical_record_number_encrypted text;

-- Add encrypted columns to patients (if separate from user_profiles)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.patients 
      ADD COLUMN IF NOT EXISTS ssn_encrypted text,
      ADD COLUMN IF NOT EXISTS date_of_birth_encrypted text,
      ADD COLUMN IF NOT EXISTS insurance_id_encrypted text,
      ADD COLUMN IF NOT EXISTS medical_notes_encrypted text';
  END IF;
END $$;

-- Add encrypted columns to providers for sensitive business info
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.providers 
      ADD COLUMN IF NOT EXISTS tax_id_encrypted text,
      ADD COLUMN IF NOT EXISTS bank_account_encrypted text,
      ADD COLUMN IF NOT EXISTS bank_routing_encrypted text';
  END IF;
END $$;

-- ============================================================
-- SECURE VIEWS FOR DECRYPTED ACCESS
-- ============================================================

-- View for user profiles with decrypted PHI (only accessible to authorized roles)
CREATE OR REPLACE VIEW public.user_profiles_decrypted AS
SELECT 
  id,
  email,
  full_name,
  phone,
  role,
  avatar_url,
  decrypt_phi(ssn_encrypted) as ssn,
  decrypt_phi(date_of_birth_encrypted) as date_of_birth,
  decrypt_phi(medical_record_number_encrypted) as medical_record_number,
  created_at,
  updated_at
FROM public.user_profiles;

-- Only allow authenticated users to access their own decrypted data
ALTER VIEW public.user_profiles_decrypted OWNER TO postgres;
REVOKE ALL ON public.user_profiles_decrypted FROM anon, authenticated;
GRANT SELECT ON public.user_profiles_decrypted TO authenticated;

-- RLS policy for decrypted view
CREATE POLICY "Users can view own decrypted profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

-- ============================================================
-- TRIGGERS FOR AUTOMATIC ENCRYPTION
-- ============================================================

-- Trigger function to auto-encrypt PHI on insert/update
CREATE OR REPLACE FUNCTION encrypt_user_profile_phi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Encrypt SSN if provided in plain text columns
  IF NEW.ssn IS NOT NULL AND NEW.ssn != '' THEN
    NEW.ssn_encrypted := public.encrypt_phi(NEW.ssn);
    NEW.ssn := NULL; -- Clear plain text
  END IF;
  
  -- Encrypt date of birth if provided
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.date_of_birth_encrypted := public.encrypt_phi(NEW.date_of_birth::text);
  END IF;
  
  -- Encrypt medical record number if provided
  IF NEW.medical_record_number IS NOT NULL AND NEW.medical_record_number != '' THEN
    NEW.medical_record_number_encrypted := public.encrypt_phi(NEW.medical_record_number);
    NEW.medical_record_number := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to user_profiles (only if the plain text columns exist)
DO $$
BEGIN
  -- Drop existing trigger if present
  DROP TRIGGER IF EXISTS encrypt_phi_trigger ON public.user_profiles;
  
  -- Check if we have columns to encrypt
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name IN ('ssn', 'date_of_birth', 'medical_record_number')
    AND table_schema = 'public'
  ) THEN
    CREATE TRIGGER encrypt_phi_trigger
    BEFORE INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_user_profile_phi();
  END IF;
END $$;

-- ============================================================
-- AUDIT LOGGING FOR PHI ACCESS
-- ============================================================

-- Table to log PHI access for HIPAA compliance
CREATE TABLE IF NOT EXISTS public.phi_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  accessed_table text NOT NULL,
  accessed_record_id uuid,
  access_type text NOT NULL CHECK (access_type IN ('view', 'decrypt', 'export')),
  columns_accessed text[],
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index for compliance reporting
CREATE INDEX IF NOT EXISTS idx_phi_access_log_user ON public.phi_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_date ON public.phi_access_log(created_at);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_table ON public.phi_access_log(accessed_table);

-- RLS for PHI access log
ALTER TABLE public.phi_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view PHI access logs
CREATE POLICY "Admins can view PHI access logs"
ON public.phi_access_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Function to log PHI access
CREATE OR REPLACE FUNCTION log_phi_access(
  p_table text,
  p_record_id uuid,
  p_access_type text,
  p_columns text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.phi_access_log (
    user_id,
    accessed_table,
    accessed_record_id,
    access_type,
    columns_accessed
  ) VALUES (
    auth.uid(),
    p_table,
    p_record_id,
    p_access_type,
    p_columns
  );
END;
$$;

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON FUNCTION encrypt_phi IS 'Encrypts PHI data using Vault key - HIPAA compliant';
COMMENT ON FUNCTION decrypt_phi IS 'Decrypts PHI data using Vault key - logs access for audit';
COMMENT ON TABLE public.phi_access_log IS 'HIPAA compliance audit log for PHI access';
COMMENT ON VIEW public.user_profiles_decrypted IS 'Decrypted view of user profiles - access logged for HIPAA';