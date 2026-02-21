-- Migration: Create system_config table

CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Policies
-- Only admins can view and modify system config
CREATE POLICY "System config is viewable by admins"
    ON public.system_config FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin'));

CREATE POLICY "System config is insertable by admins"
    ON public.system_config FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin'));

CREATE POLICY "System config is updatable by admins"
    ON public.system_config FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin'));

CREATE POLICY "System config is deletable by admins"
    ON public.system_config FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin'));
