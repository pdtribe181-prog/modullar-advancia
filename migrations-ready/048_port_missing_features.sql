-- Migration: Port missing features from old project (advanciapayledger-new)
-- This migration adds tables and relationships that were present in the Prisma schema
-- but missing in the current Supabase schema.

-- 1. Facilities Management
CREATE TYPE facility_type AS ENUM ('HOSPITAL', 'CLINIC', 'LABORATORY', 'IMAGING_CENTER');

CREATE TABLE IF NOT EXISTS public.facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    type facility_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add facility_id to existing tables (nullable to avoid breaking existing data)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;
ALTER TABLE public.med_beds ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;

-- 2. Crypto Withdrawals
CREATE TYPE withdrawal_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS public.crypto_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(18, 8) NOT NULL,
    currency TEXT NOT NULL,
    status withdrawal_status DEFAULT 'PENDING',
    destination_address TEXT NOT NULL,
    tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AI Features
CREATE TYPE ai_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS public.ai_command_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    input JSONB NOT NULL,
    output JSONB,
    status ai_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vector_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding JSONB NOT NULL, -- Stored as JSONB for now, can be migrated to pgvector later if needed
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Med Bed / Chamber Maintenance & Schedules
CREATE TABLE IF NOT EXISTS public.med_bed_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    med_bed_id UUID NOT NULL REFERENCES public.med_beds(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.med_bed_bookings(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.med_bed_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    med_bed_id UUID NOT NULL REFERENCES public.med_beds(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_command_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vector_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.med_bed_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.med_bed_maintenance ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Optimized with (select auth.uid()))

-- Facilities: Anyone authenticated can view, only admins can modify
CREATE POLICY "Facilities are viewable by authenticated users" ON public.facilities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Facilities are insertable by admins" ON public.facilities FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin'));
CREATE POLICY "Facilities are updatable by admins" ON public.facilities FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin'));

-- Crypto Withdrawals: Users can view and insert their own, admins can update
CREATE POLICY "Users can view own crypto withdrawals" ON public.crypto_withdrawals FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "Users can insert own crypto withdrawals" ON public.crypto_withdrawals FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Admins can update crypto withdrawals" ON public.crypto_withdrawals FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role = 'admin'));

-- AI Command Logs: Users can view and insert their own
CREATE POLICY "Users can view own ai command logs" ON public.ai_command_logs FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "Users can insert own ai command logs" ON public.ai_command_logs FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- Vector Memory: Users can view and insert their own
CREATE POLICY "Users can view own vector memory" ON public.vector_memory FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "Users can insert own vector memory" ON public.vector_memory FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update own vector memory" ON public.vector_memory FOR UPDATE USING (user_id = (select auth.uid()));
CREATE POLICY "Users can delete own vector memory" ON public.vector_memory FOR DELETE USING (user_id = (select auth.uid()));

-- Med Bed Schedules: Authenticated users can view, admins/providers can modify
CREATE POLICY "Schedules are viewable by authenticated users" ON public.med_bed_schedules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Schedules are modifiable by staff" ON public.med_bed_schedules FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));

-- Med Bed Maintenance: Authenticated users can view, admins/providers can modify
CREATE POLICY "Maintenance is viewable by authenticated users" ON public.med_bed_maintenance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Maintenance is modifiable by staff" ON public.med_bed_maintenance FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (select auth.uid()) AND role IN ('admin', 'provider', 'staff')));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facilities_type ON public.facilities(type);
CREATE INDEX IF NOT EXISTS idx_crypto_withdrawals_user_id ON public.crypto_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_withdrawals_status ON public.crypto_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_ai_command_logs_user_id ON public.ai_command_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vector_memory_user_id ON public.vector_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_med_bed_schedules_med_bed_id ON public.med_bed_schedules(med_bed_id);
CREATE INDEX IF NOT EXISTS idx_med_bed_maintenance_med_bed_id ON public.med_bed_maintenance(med_bed_id);
