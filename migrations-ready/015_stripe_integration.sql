-- Migration: Add Stripe Integration Columns
-- Adds necessary Stripe-related columns to support payment processing

-- 1. Add Stripe columns to user_profiles (for customers)
DO $$
BEGIN
    ALTER TABLE public.user_profiles 
    ADD COLUMN stripe_customer_id TEXT UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Add Stripe columns to providers (for Connect accounts)
DO $$
BEGIN
    ALTER TABLE public.providers
    ADD COLUMN stripe_account_id TEXT UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.providers
    ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.providers
    ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.providers
    ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Add Stripe columns to transactions
DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN stripe_payment_intent_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN stripe_charge_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN stripe_transfer_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN stripe_checkout_session_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN receipt_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN failure_reason TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN refunded_amount DECIMAL(10,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN provider_payout_status TEXT DEFAULT 'pending';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN processed_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4. Add Stripe columns to invoices
DO $$
BEGIN
    ALTER TABLE public.invoices ADD COLUMN stripe_invoice_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.invoices ADD COLUMN pdf_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.invoices ADD COLUMN hosted_invoice_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 5. Add Stripe columns to disputes
DO $$
BEGIN
    ALTER TABLE public.disputes ADD COLUMN stripe_dispute_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.disputes ADD COLUMN evidence_due_by TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 6. Create stripe_webhook_events table for logging Stripe webhooks
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for stripe webhook events
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type ON public.stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON public.stripe_webhook_events(event_id);

-- 7. Create recurring_billing table for subscriptions
CREATE TABLE IF NOT EXISTS public.recurring_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    provider_id UUID REFERENCES public.providers(id),
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
    billing_frequency TEXT DEFAULT 'monthly' CHECK (billing_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for recurring_billing
CREATE INDEX IF NOT EXISTS idx_recurring_billing_patient ON public.recurring_billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_recurring_billing_provider ON public.recurring_billing(provider_id);
CREATE INDEX IF NOT EXISTS idx_recurring_billing_status ON public.recurring_billing(status);

-- 8. Enable RLS on new tables
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_billing ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for stripe_webhook_events (system use only)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_webhook_events' AND policyname = 'Service role can manage stripe webhook events') THEN
        CREATE POLICY "Service role can manage stripe webhook events"
            ON public.stripe_webhook_events FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- Allow authenticated users to view stripe webhook events (for debugging)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_webhook_events' AND policyname = 'Admins can view stripe webhook events') THEN
        CREATE POLICY "Admins can view stripe webhook events"
            ON public.stripe_webhook_events FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 10. RLS Policies for recurring_billing
DO $$
BEGIN
    -- Patients can view their own subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recurring_billing' AND policyname = 'Patients can view own subscriptions') THEN
        CREATE POLICY "Patients can view own subscriptions"
            ON public.recurring_billing FOR SELECT
            USING (
                patient_id IN (
                    SELECT id FROM public.patients WHERE user_id = auth.uid()
                )
            );
    END IF;

    -- Providers can view subscriptions for their patients
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recurring_billing' AND policyname = 'Providers can view patient subscriptions') THEN
        CREATE POLICY "Providers can view patient subscriptions"
            ON public.recurring_billing FOR SELECT
            USING (
                provider_id IN (
                    SELECT id FROM public.providers WHERE user_id = auth.uid()
                )
            );
    END IF;

    -- Service role can manage all subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recurring_billing' AND policyname = 'Service role manages subscriptions') THEN
        CREATE POLICY "Service role manages subscriptions"
            ON public.recurring_billing FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- 11. Add indexes for Stripe columns on existing tables
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_pi ON public.transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_charge ON public.transactions(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON public.invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_disputes_stripe_id ON public.disputes(stripe_dispute_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON public.user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_providers_stripe_account ON public.providers(stripe_account_id);

-- 12. Update triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recurring_billing_updated_at ON public.recurring_billing;
CREATE TRIGGER recurring_billing_updated_at
    BEFORE UPDATE ON public.recurring_billing
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Done!
COMMENT ON COLUMN public.user_profiles.stripe_customer_id IS 'Stripe Customer ID for payment processing';
COMMENT ON COLUMN public.providers.stripe_account_id IS 'Stripe Connect Account ID for receiving payments';
COMMENT ON COLUMN public.transactions.stripe_payment_intent_id IS 'Stripe PaymentIntent ID';
COMMENT ON TABLE public.recurring_billing IS 'Manages recurring subscription billing via Stripe';
COMMENT ON TABLE public.webhook_events IS 'Logs all incoming Stripe webhook events';