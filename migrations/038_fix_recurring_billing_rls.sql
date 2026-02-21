-- ============================================================
-- Migration 038: Fix Missing RLS Policies for recurring_billing
-- ============================================================
-- This migration adds basic RLS policies to the recurring_billing table
-- to resolve the "Table has RLS enabled, but no policies exist" warning.
-- ============================================================

BEGIN;

-- ============================================================
-- recurring_billing
-- Patients can view their own recurring billing setups.
-- Providers and Admins can manage all recurring billing setups.
-- ============================================================

DROP POLICY IF EXISTS "Patients can view own recurring billing" ON public.recurring_billing;
CREATE POLICY "Patients can view own recurring billing" ON public.recurring_billing
  FOR SELECT
  TO authenticated
  USING (
    patient_id = public.get_patient_id()
    OR public.is_admin()
    OR public.is_provider()
  );

DROP POLICY IF EXISTS "Staff can manage recurring billing" ON public.recurring_billing;
CREATE POLICY "Staff can manage recurring billing" ON public.recurring_billing
  FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.is_provider())
  WITH CHECK (public.is_admin() OR public.is_provider());

COMMIT;
