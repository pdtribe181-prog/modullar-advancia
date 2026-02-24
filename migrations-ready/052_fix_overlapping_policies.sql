-- Migration: Fix multiple permissive policies for Med Bed tables
-- The issue is that "modifiable by staff" is FOR ALL (which includes SELECT),
-- and "viewable by authenticated users" is FOR SELECT.
-- This creates overlapping SELECT policies for staff members.

-- Fix for med_bed_schedules
DROP POLICY IF EXISTS "Schedules are modifiable by staff" ON public.med_bed_schedules;
-- Split "modifiable" into INSERT/UPDATE/DELETE only, so it doesn't overlap with the general SELECT policy
CREATE POLICY "Schedules are insertable by staff"
ON public.med_bed_schedules FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));

CREATE POLICY "Schedules are updatable by staff"
ON public.med_bed_schedules FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));

CREATE POLICY "Schedules are deletable by staff"
ON public.med_bed_schedules FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));

-- Fix for med_bed_maintenance
DROP POLICY IF EXISTS "Maintenance is modifiable by staff" ON public.med_bed_maintenance;
-- Split "modifiable" into INSERT/UPDATE/DELETE only
CREATE POLICY "Maintenance is insertable by staff"
ON public.med_bed_maintenance FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));

CREATE POLICY "Maintenance is updatable by staff"
ON public.med_bed_maintenance FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));

CREATE POLICY "Maintenance is deletable by staff"
ON public.med_bed_maintenance FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));
