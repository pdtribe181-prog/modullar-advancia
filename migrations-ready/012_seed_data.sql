-- Seed Data SQL Script
-- Run this in Supabase SQL Editor to populate test data

BEGIN;

-- Create UUIDs for references
DO $$
DECLARE
  admin_id UUID := gen_random_uuid();
  provider1_id UUID := gen_random_uuid();
  provider2_id UUID := gen_random_uuid();
  patient1_id UUID := gen_random_uuid();
  patient2_id UUID := gen_random_uuid();
  provider_row1_id UUID := gen_random_uuid();
  provider_row2_id UUID := gen_random_uuid();
  patient_row1_id UUID := gen_random_uuid();
  patient_row2_id UUID := gen_random_uuid();
  appt1_id UUID := gen_random_uuid();
  appt2_id UUID := gen_random_uuid();
  appt3_id UUID := gen_random_uuid();
  txn1_id UUID := gen_random_uuid();
  txn2_id UUID := gen_random_uuid();
BEGIN

-- Defer constraint checking to end of transaction
SET CONSTRAINTS ALL DEFERRED;

-- Insert user profiles (bypassing FK check temporarily)
INSERT INTO public.user_profiles (id, email, full_name, role, is_active, phone) VALUES
  (admin_id, 'admin@modullar.health', 'System Admin', 'admin', true, NULL),
  (provider1_id, 'dr.smith@modullar.health', 'Dr. Sarah Smith', 'provider', true, '+1-555-0101'),
  (provider2_id, 'dr.johnson@modullar.health', 'Dr. Michael Johnson', 'provider', true, '+1-555-0102'),
  (patient1_id, 'john.doe@example.com', 'John Doe', 'patient', true, '+1-555-0201'),
  (patient2_id, 'jane.smith@example.com', 'Jane Smith', 'patient', true, '+1-555-0202')
ON CONFLICT (id) DO NOTHING;

-- Insert providers
INSERT INTO public.providers (id, user_id, specialty, license_number, years_of_experience, consultation_fee, bio, rating, education, certifications, available_days, available_hours) VALUES
  (provider_row1_id, provider1_id, 'Cardiology', 'MD-2024-001', 15, 150.00,
   'Board-certified cardiologist with 15 years of experience.', 4.8,
   '[{"degree": "MD", "institution": "Harvard Medical School", "year": 2009}]'::jsonb,
   '["ABIM Board Certified", "FACC"]'::jsonb,
   '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
   '{"start": "09:00", "end": "17:00"}'::jsonb),
  (provider_row2_id, provider2_id, 'General Practice', 'MD-2024-002', 10, 100.00,
   'Family medicine physician focused on holistic patient care.', 4.9,
   '[{"degree": "MD", "institution": "Johns Hopkins", "year": 2014}]'::jsonb,
   '["ABFM Board Certified"]'::jsonb,
   '["Monday", "Wednesday", "Friday"]'::jsonb,
   '{"start": "08:00", "end": "16:00"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert patients
INSERT INTO public.patients (id, user_id, date_of_birth, gender, address_line_1, city, state, postal_code, country, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_policy_number, medical_history, allergies) VALUES
  (patient_row1_id, patient1_id, '1985-06-15', 'male', '123 Main Street', 'New York', 'NY', '10001', 'USA',
   'Mary Doe', '+1-555-0301', 'BlueCross BlueShield', 'BCBS-2024-001',
   '["Hypertension", "Type 2 Diabetes"]'::jsonb, '["Penicillin"]'::jsonb),
  (patient_row2_id, patient2_id, '1990-03-22', 'female', '456 Oak Avenue', 'Los Angeles', 'CA', '90001', 'USA',
   'Bob Smith', '+1-555-0302', 'Aetna', 'AET-2024-002',
   '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert appointments
INSERT INTO public.appointments (id, patient_id, provider_id, appointment_date, appointment_time, duration_minutes, status, reason_for_visit, notes) VALUES
  (appt1_id, patient_row1_id, provider_row1_id, '2026-02-20', '10:00:00', 30, 'scheduled', 'Annual cardiac checkup', NULL),
  (appt2_id, patient_row2_id, provider_row2_id, '2026-02-21', '14:00:00', 45, 'scheduled', 'General health consultation', NULL),
  (appt3_id, patient_row1_id, provider_row2_id, '2026-02-10', '09:00:00', 30, 'completed', 'Follow-up appointment', 'Patient recovering well. Continue current medication.')
ON CONFLICT (id) DO NOTHING;

-- Insert transactions
INSERT INTO public.transactions (id, patient_id, provider_id, appointment_id, amount, currency, payment_status, description, billing_name, billing_email) VALUES
  (txn1_id, patient_row1_id, provider_row2_id, appt3_id, 100.00, 'USD', 'succeeded', 'Consultation fee - General Practice', 'John Doe', 'john.doe@example.com'),
  (txn2_id, patient_row1_id, provider_row1_id, appt1_id, 150.00, 'USD', 'pending', 'Consultation fee - Cardiology', 'John Doe', 'john.doe@example.com')
ON CONFLICT (id) DO NOTHING;

-- Insert invoices
INSERT INTO public.invoices (id, invoice_number, patient_id, provider_id, transaction_id, issue_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, currency) VALUES
  (gen_random_uuid(), 'INV-2026-0001', patient_row1_id, provider_row2_id, txn1_id, '2026-02-10', '2026-03-10', 'paid', 100.00, 0, 0, 100.00, 'USD'),
  (gen_random_uuid(), 'INV-2026-0002', patient_row1_id, provider_row1_id, txn2_id, '2026-02-16', '2026-03-16', 'sent', 150.00, 0, 0, 150.00, 'USD')
ON CONFLICT (id) DO NOTHING;

-- Insert notifications
INSERT INTO public.notifications (id, user_id, notification_type, priority, title, message, read_status) VALUES
  (gen_random_uuid(), patient1_id, 'payment_alert', 'medium', 'Payment Received', 'Your payment of $100.00 for consultation has been processed.', 'read'),
  (gen_random_uuid(), patient1_id, 'system_update', 'high', 'Upcoming Appointment', 'Reminder: You have an appointment with Dr. Sarah Smith on Feb 20, 2026 at 10:00 AM.', 'unread'),
  (gen_random_uuid(), provider1_id, 'system_update', 'medium', 'New Appointment', 'You have a new appointment scheduled with John Doe on Feb 20, 2026.', 'unread')
ON CONFLICT (id) DO NOTHING;

RAISE NOTICE 'Seed data inserted successfully!';
RAISE NOTICE 'Test accounts: admin@modullar.health, dr.smith@modullar.health, dr.johnson@modullar.health, john.doe@example.com, jane.smith@example.com';

END $$;

COMMIT;
