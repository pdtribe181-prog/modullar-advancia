-- Migration: Fix RLS performance and permissive policies
-- 1. Fix performance by wrapping auth functions in select
-- 2. Restrict policies to specific roles to avoid permissive checks for anon

-- Facilities
DROP POLICY IF EXISTS "Facilities are viewable by authenticated users" ON public.facilities;
CREATE POLICY "Facilities are viewable by authenticated users"
ON public.facilities FOR SELECT
TO authenticated
USING ((select auth.role()) = 'authenticated');

-- Med Bed Schedules
DROP POLICY IF EXISTS "Schedules are viewable by authenticated users" ON public.med_bed_schedules;
CREATE POLICY "Schedules are viewable by authenticated users"
ON public.med_bed_schedules FOR SELECT
TO authenticated
USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Schedules are modifiable by staff" ON public.med_bed_schedules;
CREATE POLICY "Schedules are modifiable by staff"
ON public.med_bed_schedules FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));

-- Med Bed Maintenance
DROP POLICY IF EXISTS "Maintenance is viewable by authenticated users" ON public.med_bed_maintenance;
CREATE POLICY "Maintenance is viewable by authenticated users"
ON public.med_bed_maintenance FOR SELECT
TO authenticated
USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Maintenance is modifiable by staff" ON public.med_bed_maintenance;
CREATE POLICY "Maintenance is modifiable by staff"
ON public.med_bed_maintenance FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));
