--- Migration: Create tables for MedBed and Chamber bookings

-- 1. Create med_beds table
CREATE TABLE IF NOT EXISTS med_beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('medbed', 'chamber')),
  description TEXT,
  hourly_rate INTEGER NOT NULL, -- Stored in cents
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create bookings table
CREATE TABLE IF NOT EXISTS med_bed_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  med_bed_id UUID REFERENCES med_beds(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_amount INTEGER NOT NULL, -- Stored in cents
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE med_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE med_bed_bookings ENABLE ROW LEVEL SECURITY;

-- 4. Policies for med_beds (Public read, Admin write)
CREATE POLICY "MedBeds are viewable by everyone"
  ON med_beds FOR SELECT
  USING (true);

-- 5. Policies for bookings (Users manage their own, Admins manage all)
CREATE POLICY "Users can view their own bookings"
  ON med_bed_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON med_bed_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Insert Seed Data
INSERT INTO med_beds (name, type, description, hourly_rate, image_url) VALUES
('Quantum MedBed Unit Alpha', 'medbed', 'Full-body quantum regeneration session using advanced frequency scaling.', 15000, 'https://placehold.co/600x400?text=Quantum+MedBed'),
('Hyperbaric Chamber Delta', 'chamber', 'High-pressure oxygen therapy for rapid cellular recovery and anti-aging.', 12000, 'https://placehold.co/600x400?text=Hyperbaric+Chamber'),
('Holographic MedBed Beta', 'medbed', 'Targeted holographic repair for specific injury sites and chronic conditions.', 20000, 'https://placehold.co/600x400?text=Holographic+MedBed');
