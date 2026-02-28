-- Migration 053: Performance Indexes for Hot Query Paths
-- Adds missing single-column and composite indexes identified by
-- analysing the most frequent .eq(), .order(), .ilike() patterns
-- in the Express API routes and services.
--
-- Run in Supabase SQL Editor or via migration runner.
-- All CREATE INDEX IF NOT EXISTS so it is safe to re-run.

BEGIN;

-- ============================================================
-- 1. HIGH-PRIORITY SINGLE-COLUMN INDEXES
-- ============================================================

-- transactions.status (distinct from payment_status which IS indexed)
-- Used in admin dashboard revenue queries
CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions (status);

-- user_profiles.email — auth hot path (login, password reset, lookup)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email
  ON user_profiles (email);

-- user_profiles.phone — phone-based auth / MFA verification
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone
  ON user_profiles (phone);

-- providers.stripe_onboarding_complete — filtered in admin listing + booking checks
CREATE INDEX IF NOT EXISTS idx_providers_stripe_onboarding
  ON providers (stripe_onboarding_complete);

-- providers.specialty — exact match (.eq) and partial search (.ilike)
-- A standard btree handles equality; pg_trgm GIN handles ILIKE '%…%'
CREATE INDEX IF NOT EXISTS idx_providers_specialty
  ON providers (specialty);

-- Enable pg_trgm extension if not already present (for ILIKE optimization)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index for fast ILIKE / pattern searches on provider specialty & business_name
CREATE INDEX IF NOT EXISTS idx_providers_specialty_trgm
  ON providers USING gin (specialty gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_providers_business_name_trgm
  ON providers USING gin (business_name gin_trgm_ops);

-- appointments.appointment_time — used in slot-conflict checks
CREATE INDEX IF NOT EXISTS idx_appointments_time
  ON appointments (appointment_time);

-- appointments.payment_status — updated on payment completion
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status
  ON appointments (payment_status);

-- compliance_logs.action — audit log filtering in admin routes
CREATE INDEX IF NOT EXISTS idx_compliance_logs_action
  ON compliance_logs (action);

-- ============================================================
-- 2. ORDER BY INDEXES (descending for common query patterns)
-- ============================================================

-- invoices.created_at DESC — patient/provider invoice listing
CREATE INDEX IF NOT EXISTS idx_invoices_created_at_desc
  ON invoices (created_at DESC);

-- disputes.created_at DESC — admin dispute listing
CREATE INDEX IF NOT EXISTS idx_disputes_created_at_desc
  ON disputes (created_at DESC);

-- providers.business_name ASC — provider directory listing sort
CREATE INDEX IF NOT EXISTS idx_providers_business_name
  ON providers (business_name);

-- providers.created_at DESC — admin provider listing
CREATE INDEX IF NOT EXISTS idx_providers_created_at_desc
  ON providers (created_at DESC);

-- appointments.appointment_date standalone (composite with provider_id exists
-- but standalone is needed for global date range queries)
CREATE INDEX IF NOT EXISTS idx_appointments_date
  ON appointments (appointment_date);

-- ============================================================
-- 3. COMPOSITE INDEXES FOR MULTI-FILTER QUERIES
-- ============================================================

-- Appointment slot-conflict check: provider + date + time + status
CREATE INDEX IF NOT EXISTS idx_appointments_slot_check
  ON appointments (provider_id, appointment_date, appointment_time, status);

-- Provider schedule & revenue: provider + status + date range
CREATE INDEX IF NOT EXISTS idx_appointments_provider_schedule
  ON appointments (provider_id, status, appointment_date);

-- Admin revenue analytics: transaction status + date range
CREATE INDEX IF NOT EXISTS idx_transactions_status_created
  ON transactions (status, created_at DESC);

-- Provider transaction history: provider + recent first
CREATE INDEX IF NOT EXISTS idx_transactions_provider_created
  ON transactions (provider_id, created_at DESC);

-- Patient invoice list: patient + recent first
CREATE INDEX IF NOT EXISTS idx_invoices_patient_created
  ON invoices (patient_id, created_at DESC);

-- Provider invoice list: provider + recent first
CREATE INDEX IF NOT EXISTS idx_invoices_provider_created
  ON invoices (provider_id, created_at DESC);

-- Admin user list: status + role + recent first
CREATE INDEX IF NOT EXISTS idx_user_profiles_status_role_created
  ON user_profiles (status, role, created_at DESC);

COMMIT;
