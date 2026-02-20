-- Migration 014: Storage Buckets, Additional Columns, and Missing Features
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. STORAGE BUCKETS
-- ============================================================

-- Profile avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Provider documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-documents',
  'provider-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Medical records bucket (private, HIPAA-sensitive)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-records',
  'medical-records',
  false,
  104857600, -- 100MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/dicom', 'image/dicom-rle']
) ON CONFLICT (id) DO NOTHING;

-- Invoice attachments bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-attachments',
  'invoice-attachments',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Dispute evidence bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidence',
  'dispute-evidence',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg']
) ON CONFLICT (id) DO NOTHING;

-- Chat/Message attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  20971520, -- 20MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. STORAGE POLICIES
-- ============================================================

-- Avatars policies (public read, authenticated write own)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Provider documents policies
CREATE POLICY "Providers can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'provider-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'provider-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all provider documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'provider-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Medical records policies (strict HIPAA compliance)
CREATE POLICY "Patients can view own medical records"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'medical-records'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Providers can view patient records they treat"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'medical-records'
  AND EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.providers p ON p.id = a.provider_id
    WHERE p.user_id = auth.uid()
    AND a.patient_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Patients can upload own medical records"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medical-records'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Invoice attachments policies
CREATE POLICY "Users can view own invoice attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoice-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.patients p ON p.id = i.patient_id
      WHERE p.user_id = auth.uid()
      AND i.id::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Providers can upload invoice attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoice-attachments'
  AND EXISTS (
    SELECT 1 FROM public.providers
    WHERE user_id = auth.uid()
  )
);

-- Dispute evidence policies
CREATE POLICY "Dispute participants can view evidence"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'dispute-evidence'
  AND EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.transactions t ON t.id = d.transaction_id
    JOIN public.patients p ON p.id = t.patient_id
    JOIN public.providers pr ON pr.id = t.provider_id
    WHERE d.id::text = (storage.foldername(name))[1]
    AND (p.user_id = auth.uid() OR pr.user_id = auth.uid())
  )
);

CREATE POLICY "Dispute participants can upload evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dispute-evidence'
  AND EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.transactions t ON t.id = d.transaction_id
    JOIN public.patients p ON p.id = t.patient_id
    JOIN public.providers pr ON pr.id = t.provider_id
    WHERE d.id::text = (storage.foldername(name))[1]
    AND (p.user_id = auth.uid() OR pr.user_id = auth.uid())
  )
);

-- ============================================================
-- 3. ADDITIONAL COLUMNS FOR EXISTING TABLES
-- ============================================================

-- Add avatar_url to user_profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Add timezone to user_profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
END $$;

-- Add locale/language preference to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'locale'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN locale text DEFAULT 'en-US';
  END IF;
END $$;

-- Add last_login_at to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN last_login_at timestamp with time zone;
  END IF;
END $$;

-- Add two_factor_enabled to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN two_factor_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add profile_picture_url to providers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE public.providers ADD COLUMN profile_picture_url text;
  END IF;
END $$;

-- Add video_consultation_enabled to providers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'video_consultation_enabled'
  ) THEN
    ALTER TABLE public.providers ADD COLUMN video_consultation_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add languages_spoken to providers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers' AND column_name = 'languages_spoken'
  ) THEN
    ALTER TABLE public.providers ADD COLUMN languages_spoken jsonb DEFAULT '["English"]'::jsonb;
  END IF;
END $$;

-- Add profile_picture_url to patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN profile_picture_url text;
  END IF;
END $$;

-- Add preferred_language to patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN preferred_language text DEFAULT 'en';
  END IF;
END $$;

-- Add blood_type to patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'blood_type'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN blood_type text;
  END IF;
END $$;

-- Add primary_physician_id to patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'primary_physician_id'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN primary_physician_id uuid REFERENCES public.providers(id);
  END IF;
END $$;

-- Add video_call_link to appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'video_call_link'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN video_call_link text;
  END IF;
END $$;

-- Add reminder_sent to appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'reminder_sent'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN reminder_sent boolean DEFAULT false;
  END IF;
END $$;

-- Add cancellation_reason to appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN cancellation_reason text;
  END IF;
END $$;

-- Add cancelled_by to appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN cancelled_by uuid REFERENCES public.user_profiles(id);
  END IF;
END $$;

-- Add receipt_url to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN receipt_url text;
  END IF;
END $$;

-- Add refund_reason to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'refund_reason'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN refund_reason text;
  END IF;
END $$;

-- Add pdf_url to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN pdf_url text;
  END IF;
END $$;

-- Add reminder_count to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'reminder_count'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN reminder_count integer DEFAULT 0;
  END IF;
END $$;

-- Add last_reminder_sent_at to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'last_reminder_sent_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN last_reminder_sent_at timestamp with time zone;
  END IF;
END $$;

-- ============================================================
-- 4. ADDITIONAL TABLES
-- ============================================================

-- Audit trail for HIPAA compliance
CREATE TABLE IF NOT EXISTS public.hipaa_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  patient_id uuid REFERENCES public.patients(id),
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on hipaa_audit_log
ALTER TABLE public.hipaa_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for hipaa_audit_log
CREATE POLICY "Admins can view all HIPAA logs"
ON public.hipaa_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "System can insert HIPAA logs"
ON public.hipaa_audit_log FOR INSERT
WITH CHECK (true);

-- Consent management for HIPAA
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  consent_type text NOT NULL, -- 'treatment', 'data_sharing', 'marketing', 'research'
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  expires_at timestamp with time zone,
  consent_document_url text,
  ip_address inet,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

-- Policies for patient_consents
CREATE POLICY "Patients can view own consents"
ON public.patient_consents FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Patients can manage own consents"
ON public.patient_consents FOR ALL
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can view patient consents"
ON public.patient_consents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.providers p ON p.id = a.provider_id
    WHERE p.user_id = auth.uid()
    AND a.patient_id = patient_consents.patient_id
  )
);

-- Messages/Chat system
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.user_profiles(id),
  recipient_id uuid NOT NULL REFERENCES public.user_profiles(id),
  appointment_id uuid REFERENCES public.appointments(id),
  subject text,
  content text NOT NULL,
  read_at timestamp with time zone,
  attachment_urls jsonb DEFAULT '[]'::jsonb,
  is_urgent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
);

CREATE POLICY "Recipients can update messages (mark read)"
ON public.messages FOR UPDATE
USING (
  recipient_id = auth.uid()
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.providers(id),
  appointment_id uuid REFERENCES public.appointments(id),
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text,
  instructions text,
  refills_allowed integer DEFAULT 0,
  refills_remaining integer DEFAULT 0,
  pharmacy_name text,
  pharmacy_address text,
  pharmacy_phone text,
  status text DEFAULT 'active', -- active, completed, cancelled
  prescribed_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Policies for prescriptions
CREATE POLICY "Patients can view own prescriptions"
ON public.prescriptions FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can manage prescriptions for their patients"
ON public.prescriptions FOR ALL
USING (
  provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

-- Lab results table
CREATE TABLE IF NOT EXISTS public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid REFERENCES public.providers(id),
  appointment_id uuid REFERENCES public.appointments(id),
  test_name text NOT NULL,
  test_type text NOT NULL,
  result_value text,
  result_unit text,
  reference_range text,
  is_abnormal boolean DEFAULT false,
  notes text,
  lab_name text,
  specimen_collected_at timestamp with time zone,
  result_received_at timestamp with time zone,
  document_url text,
  status text DEFAULT 'pending', -- pending, completed, reviewed
  reviewed_by uuid REFERENCES public.providers(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- Policies for lab_results
CREATE POLICY "Patients can view own lab results"
ON public.lab_results FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can manage lab results"
ON public.lab_results FOR ALL
USING (
  provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
  OR reviewed_by IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

-- Insurance claims table
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.providers(id),
  appointment_id uuid REFERENCES public.appointments(id),
  transaction_id uuid REFERENCES public.transactions(id),
  claim_number text UNIQUE,
  insurance_provider text NOT NULL,
  policy_number text NOT NULL,
  claim_amount numeric(12,2) NOT NULL,
  approved_amount numeric(12,2),
  patient_responsibility numeric(12,2),
  status text DEFAULT 'submitted', -- submitted, under_review, approved, denied, appealed, paid
  submitted_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  denial_reason text,
  appeal_deadline timestamp with time zone,
  diagnosis_codes jsonb DEFAULT '[]'::jsonb,
  procedure_codes jsonb DEFAULT '[]'::jsonb,
  supporting_documents jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

-- Policies for insurance_claims
CREATE POLICY "Patients can view own insurance claims"
ON public.insurance_claims FOR SELECT
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can manage insurance claims"
ON public.insurance_claims FOR ALL
USING (
  provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all insurance claims"
ON public.insurance_claims FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Waitlist for appointments
CREATE TABLE IF NOT EXISTS public.appointment_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.providers(id),
  preferred_dates jsonb DEFAULT '[]'::jsonb,
  preferred_times jsonb DEFAULT '[]'::jsonb,
  reason_for_visit text,
  urgency text DEFAULT 'normal', -- low, normal, high, urgent
  status text DEFAULT 'waiting', -- waiting, notified, booked, cancelled
  notified_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;

-- Policies for appointment_waitlist
CREATE POLICY "Patients can manage own waitlist entries"
ON public.appointment_waitlist FOR ALL
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can view their waitlist"
ON public.appointment_waitlist FOR SELECT
USING (
  provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can update waitlist status"
ON public.appointment_waitlist FOR UPDATE
USING (
  provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

-- Reviews/Ratings for providers
CREATE TABLE IF NOT EXISTS public.provider_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.providers(id),
  appointment_id uuid REFERENCES public.appointments(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  review_text text,
  is_anonymous boolean DEFAULT false,
  is_verified boolean DEFAULT false, -- verified appointment
  response_text text,
  response_at timestamp with time zone,
  is_published boolean DEFAULT true,
  flagged boolean DEFAULT false,
  flagged_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for provider_reviews
CREATE POLICY "Anyone can view published reviews"
ON public.provider_reviews FOR SELECT
USING (is_published = true);

CREATE POLICY "Patients can create reviews for completed appointments"
ON public.provider_reviews FOR INSERT
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = appointment_id
    AND status = 'completed'
  )
);

CREATE POLICY "Patients can update own reviews"
ON public.provider_reviews FOR UPDATE
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can respond to reviews"
ON public.provider_reviews FOR UPDATE
USING (
  provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 5. INDEXES FOR NEW TABLES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_hipaa_audit_log_user_id ON public.hipaa_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_log_patient_id ON public.hipaa_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_log_created_at ON public.hipaa_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_log_action ON public.hipaa_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_patient_consents_patient_id ON public.patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_consent_type ON public.patient_consents(consent_type);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_appointment_id ON public.messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_provider_id ON public.prescriptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON public.lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_provider_id ON public.lab_results(provider_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_status ON public.lab_results(status);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient_id ON public.insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_provider_id ON public.insurance_claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON public.insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_claim_number ON public.insurance_claims(claim_number);

CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_patient_id ON public.appointment_waitlist(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_provider_id ON public.appointment_waitlist(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_status ON public.appointment_waitlist(status);

CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider_id ON public.provider_reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_reviews_patient_id ON public.provider_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_reviews_rating ON public.provider_reviews(rating);

-- ============================================================
-- 6. TRIGGERS FOR NEW TABLES
-- ============================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patient_consents_updated_at
  BEFORE UPDATE ON public.patient_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_lab_results_updated_at
  BEFORE UPDATE ON public.lab_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_appointment_waitlist_updated_at
  BEFORE UPDATE ON public.appointment_waitlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_provider_reviews_updated_at
  BEFORE UPDATE ON public.provider_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

-- ============================================================
-- 7. FUNCTION TO LOG HIPAA ACCESS
-- ============================================================

CREATE OR REPLACE FUNCTION log_hipaa_access(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_patient_id uuid,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.hipaa_audit_log (
    user_id, action, resource_type, resource_id, patient_id, details
  ) VALUES (
    auth.uid(), p_action, p_resource_type, p_resource_id, p_patient_id, p_details
  );
END;
$$;

-- ============================================================
-- 8. UPDATE PROVIDER RATING TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.providers
  SET rating = (
    SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
    FROM public.provider_reviews
    WHERE provider_id = NEW.provider_id
    AND is_published = true
  )
  WHERE id = NEW.provider_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

CREATE TRIGGER trigger_update_provider_rating
  AFTER INSERT OR UPDATE ON public.provider_reviews
  FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

-- ============================================================
-- DONE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 014 completed successfully!';
  RAISE NOTICE 'Added: 6 storage buckets with policies';
  RAISE NOTICE 'Added: 17+ new columns to existing tables';
  RAISE NOTICE 'Added: 8 new tables with RLS and policies';
  RAISE NOTICE 'Added: Indexes and triggers for new tables';
END $$;