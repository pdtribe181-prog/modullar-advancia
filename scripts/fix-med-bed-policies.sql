-- Fix duplicate permissive SELECT policies on med_bed_maintenance
-- Problem: authenticated_view_maintenance (SELECT, true) + staff_manage_maintenance (ALL, role check)
-- Both are PERMISSIVE for authenticated on SELECT

BEGIN;

-- Drop both overlapping policies
DROP POLICY IF EXISTS authenticated_view_maintenance ON public.med_bed_maintenance;
DROP POLICY IF EXISTS staff_manage_maintenance ON public.med_bed_maintenance;

-- 1. All authenticated users can SELECT (view)
CREATE POLICY "authenticated_select_maintenance"
  ON public.med_bed_maintenance
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Only admin/provider/staff can INSERT
CREATE POLICY "staff_insert_maintenance"
  ON public.med_bed_maintenance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'provider'::user_role, 'staff'::user_role])
    )
  );

-- 3. Only admin/provider/staff can UPDATE
CREATE POLICY "staff_update_maintenance"
  ON public.med_bed_maintenance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'provider'::user_role, 'staff'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'provider'::user_role, 'staff'::user_role])
    )
  );

-- 4. Only admin/provider/staff can DELETE
CREATE POLICY "staff_delete_maintenance"
  ON public.med_bed_maintenance
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'provider'::user_role, 'staff'::user_role])
    )
  );

COMMIT;

-- Verify: should show 4 policies, no duplicate SELECT
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'med_bed_maintenance'
ORDER BY cmd, policyname;
