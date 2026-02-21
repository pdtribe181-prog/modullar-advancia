-- Migration: Fix RLS performance for bookings
-- Wrapping auth.uid() in (select auth.uid()) for better query plan caching

-- Med Bed Bookings
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.med_bed_bookings;
CREATE POLICY "Users can view their own bookings"
ON public.med_bed_bookings FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own bookings" ON public.med_bed_bookings;
CREATE POLICY "Users can create their own bookings"
ON public.med_bed_bookings FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));
