-- Migration 042: Consolidate more permissive policies
-- This migration drops existing overlapping policies and creates consolidated ones for various tables.

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
    tables_to_process TEXT[] := ARRAY[
        'anomaly_alerts',
        'audit_log_exports',
        'claim_history',
        'compliance_status',
        'compliance_violations',
        'crypto_transactions',
        'insurance_claims',
        'lab_results',
        'notification_queue',
        'patient_consents',
        'payment_plan_transactions',
        'payment_plans',
        'prescriptions',
        'provider_performance_metrics',
        'provider_reviews',
        'recurring_billing',
        'report_templates',
        'saved_reports',
        'security_events',
        'services',
        'transactions',
        'wallet_audit_log',
        'wallet_transactions',
        'wallet_verification_challenges',
        'webhooks'
    ];
BEGIN
    -- Drop all existing policies on the target tables
    FOR table_record IN
        SELECT unnest(tables_to_process) AS table_name
    LOOP
        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = table_record.table_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_record.table_name);
        END LOOP;
    END LOOP;
END $$;

-- 1. anomaly_alerts
CREATE POLICY "Admins can manage anomaly alerts" ON public.anomaly_alerts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 2. audit_log_exports
CREATE POLICY "Users can view own exports and admins can manage all" ON public.audit_log_exports
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 3. claim_history
CREATE POLICY "Staff can manage claim history" ON public.claim_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff')
        )
    );

-- 4. compliance_status
CREATE POLICY "Admins can manage compliance status" ON public.compliance_status
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 5. compliance_violations
CREATE POLICY "Admins can manage compliance violations" ON public.compliance_violations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 6. crypto_transactions
CREATE POLICY "Users can view own crypto transactions and admins can manage all" ON public.crypto_transactions
    FOR ALL
    USING (
        patient_id = auth.uid() OR
        provider_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 7. insurance_claims
CREATE POLICY "Users can view and providers can manage insurance claims" ON public.insurance_claims
    FOR ALL
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff')
        )
    );

-- 8. lab_results
CREATE POLICY "Users can view and providers can manage lab results" ON public.lab_results
    FOR ALL
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff')
        )
    );

-- 9. notification_queue
CREATE POLICY "Users can view own queue and admins can manage all" ON public.notification_queue
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 10. patient_consents
CREATE POLICY "Users can view and patients can manage own consents" ON public.patient_consents
    FOR ALL
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff')
        )
    );

-- 11. payment_plan_transactions
CREATE POLICY "Users can view own payment plan transactions and admins can manage all" ON public.payment_plan_transactions
    FOR ALL
    USING (
        payment_plan_id IN (SELECT id FROM public.payment_plans WHERE patient_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 12. payment_plans
CREATE POLICY "Users can view and manage own payment plans" ON public.payment_plans
    FOR ALL
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff')
        )
    );

-- 13. prescriptions
CREATE POLICY "Users can view and providers can manage prescriptions" ON public.prescriptions
    FOR ALL
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff')
        )
    );

-- 14. provider_performance_metrics
CREATE POLICY "Providers can view own metrics and admins can manage all" ON public.provider_performance_metrics
    FOR ALL
    USING (
        provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 15. provider_reviews
CREATE POLICY "Users can view and manage provider reviews" ON public.provider_reviews
    FOR ALL
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff')
        )
    );

-- 16. recurring_billing
CREATE POLICY "Users can view and manage own recurring billing" ON public.recurring_billing
    FOR ALL
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff')
        )
    );

-- 17. report_templates
CREATE POLICY "Users can view and manage own report templates" ON public.report_templates
    FOR ALL
    USING (
        created_by = auth.uid() OR
        is_system_template = true OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 18. saved_reports
CREATE POLICY "Users can view and manage own saved reports" ON public.saved_reports
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 19. security_events
CREATE POLICY "Users can view own security events and admins can manage all" ON public.security_events
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 20. services
CREATE POLICY "Users can view and providers can manage services" ON public.services
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff', 'provider')
        )
    );

-- 21. transactions
CREATE POLICY "Users can view and admins can manage transactions" ON public.transactions
    FOR ALL
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'staff')
        )
    );

-- 22. wallet_audit_log
CREATE POLICY "Users can view own wallet audit log and admins can manage all" ON public.wallet_audit_log
    FOR ALL
    USING (
        user_id = auth.uid() OR
        provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 23. wallet_transactions
CREATE POLICY "Users can view own wallet transactions and admins can manage all" ON public.wallet_transactions
    FOR ALL
    USING (
        provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 24. wallet_verification_challenges
CREATE POLICY "Users can manage own wallet verification challenges" ON public.wallet_verification_challenges
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- 25. webhooks
CREATE POLICY "Users can manage own webhooks" ON public.webhooks
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );
