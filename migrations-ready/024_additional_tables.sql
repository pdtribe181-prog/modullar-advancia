-- Migration 024: Additional Tables (Services, Payment Plans, Insurance Claims)
-- Adds medical service catalog, installment plans, and insurance claim tracking

-- ============================================================
-- SERVICES TABLE (Medical Service Catalog)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  code text, -- CPT/HCPCS/ICD code
  code_type text CHECK (code_type IN ('CPT', 'HCPCS', 'ICD-10', 'custom')),
  default_price numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  duration_minutes integer,
  is_active boolean DEFAULT true,
  requires_authorization boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(code);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);

-- RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active services"
ON public.services FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage services"
ON public.services FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Providers can view all services"
ON public.services FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'provider'
  )
);

-- ============================================================
-- PAYMENT PLANS TABLE (Installment Plans)
-- ============================================================

CREATE TYPE payment_plan_status AS ENUM ('active', 'completed', 'paused', 'cancelled', 'defaulted');
CREATE TYPE payment_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly');

CREATE TABLE IF NOT EXISTS public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  
  -- Plan details
  total_amount numeric(10,2) NOT NULL,
  down_payment numeric(10,2) DEFAULT 0,
  remaining_balance numeric(10,2) NOT NULL,
  installment_amount numeric(10,2) NOT NULL,
  number_of_installments integer NOT NULL,
  installments_paid integer DEFAULT 0,
  
  -- Schedule
  frequency payment_frequency DEFAULT 'monthly',
  start_date date NOT NULL,
  end_date date,
  next_payment_date date,
  
  -- Status
  status payment_plan_status DEFAULT 'active',
  auto_charge boolean DEFAULT false,
  stripe_subscription_id text,
  
  -- Late fees
  late_fee_amount numeric(10,2) DEFAULT 0,
  grace_period_days integer DEFAULT 5,
  
  -- Metadata
  notes text,
  created_by uuid REFERENCES public.user_profiles(id),
  approved_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_plans_patient ON public.payment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON public.payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_payment_plans_next_payment ON public.payment_plans(next_payment_date);

-- RLS
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own payment plans"
ON public.payment_plans FOR SELECT
TO authenticated
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can view patient payment plans"
ON public.payment_plans FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role::text IN ('provider', 'admin')
  )
);

CREATE POLICY "Staff can create payment plans"
ON public.payment_plans FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role::text IN ('provider', 'admin')
  )
);

CREATE POLICY "Staff can update payment plans"
ON public.payment_plans FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role::text IN ('provider', 'admin')
  )
);

-- ============================================================
-- PAYMENT PLAN TRANSACTIONS (Track each installment)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_plan_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id uuid NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id),
  installment_number integer NOT NULL,
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'failed', 'waived')),
  late_fee numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_transactions_plan ON public.payment_plan_transactions(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_transactions_due ON public.payment_plan_transactions(due_date, status);

ALTER TABLE public.payment_plan_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan transactions"
ON public.payment_plan_transactions FOR SELECT
TO authenticated
USING (
  payment_plan_id IN (
    SELECT pp.id FROM public.payment_plans pp
    JOIN public.patients p ON p.id = pp.patient_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can manage plan transactions"
ON public.payment_plan_transactions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role::text IN ('provider', 'admin')
  )
);

-- ============================================================
-- INSURANCE CLAIMS TABLE
-- ============================================================

CREATE TYPE claim_status AS ENUM (
  'draft', 'submitted', 'pending', 'in_review', 
  'approved', 'partially_approved', 'denied', 
  'appealed', 'paid', 'closed'
);

CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.providers(id),
  
  -- Claim identifiers
  claim_number text UNIQUE,
  internal_reference text,
  
  -- Insurance info
  insurance_provider text NOT NULL,
  insurance_plan text,
  policy_number text NOT NULL,
  group_number text,
  subscriber_id text,
  subscriber_name text,
  subscriber_relationship text CHECK (subscriber_relationship IN ('self', 'spouse', 'child', 'other')),
  
  -- Amounts
  claim_amount numeric(10,2) NOT NULL,
  approved_amount numeric(10,2),
  paid_amount numeric(10,2),
  patient_responsibility numeric(10,2),
  deductible_applied numeric(10,2) DEFAULT 0,
  copay_amount numeric(10,2) DEFAULT 0,
  coinsurance_amount numeric(10,2) DEFAULT 0,
  
  -- Dates
  service_date date NOT NULL,
  submission_date date,
  response_date date,
  payment_date date,
  
  -- Status
  status claim_status DEFAULT 'draft',
  denial_reason text,
  denial_code text,
  appeal_deadline date,
  
  -- Diagnosis and procedure codes
  diagnosis_codes jsonb DEFAULT '[]', -- ICD-10 codes
  procedure_codes jsonb DEFAULT '[]', -- CPT codes
  
  -- Documents
  supporting_documents jsonb DEFAULT '[]',
  eob_document_url text, -- Explanation of Benefits
  
  -- Metadata
  notes text,
  created_by uuid REFERENCES public.user_profiles(id),
  last_updated_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_claims_patient ON public.insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_provider ON public.insurance_claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_number ON public.insurance_claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claims_insurance ON public.insurance_claims(insurance_provider, policy_number);
CREATE INDEX IF NOT EXISTS idx_claims_service_date ON public.insurance_claims(service_date);

-- RLS
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own claims"
ON public.insurance_claims FOR SELECT
TO authenticated
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Providers can view related claims"
ON public.insurance_claims FOR SELECT
TO authenticated
USING (
  provider_id IN (
    SELECT id FROM public.providers WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

CREATE POLICY "Staff can create claims"
ON public.insurance_claims FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role::text IN ('provider', 'admin')
  )
);

CREATE POLICY "Staff can update claims"
ON public.insurance_claims FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role::text IN ('provider', 'admin')
  )
);

-- ============================================================
-- CLAIM HISTORY (Audit trail for claims)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.claim_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  previous_status claim_status,
  new_status claim_status NOT NULL,
  action text NOT NULL,
  notes text,
  changed_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_history_claim ON public.claim_history(claim_id);

ALTER TABLE public.claim_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view claim history they have access to"
ON public.claim_history FOR SELECT
TO authenticated
USING (
  claim_id IN (
    SELECT ic.id FROM public.insurance_claims ic
    JOIN public.patients p ON p.id = ic.patient_id
    WHERE p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role::text IN ('provider', 'admin')
  )
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update timestamps
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Auto-generate claim number
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.claim_number IS NULL THEN
    NEW.claim_number := 'CLM-' || to_char(now(), 'YYYYMMDD') || '-' || 
                        upper(substring(NEW.id::text from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_claim_number
  BEFORE INSERT ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION generate_claim_number();

-- Track claim status changes
CREATE OR REPLACE FUNCTION track_claim_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.claim_history (claim_id, previous_status, new_status, action, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, 'status_change', NEW.last_updated_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_claim_status
  AFTER UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION track_claim_status_change();

-- ============================================================
-- SAMPLE DATA (Medical Services)
-- ============================================================

INSERT INTO public.services (name, description, category, code, code_type, default_price, duration_minutes) VALUES
('Initial Consultation', 'First patient consultation and evaluation', 'Consultation', '99201', 'CPT', 150.00, 30),
('Follow-up Visit', 'Standard follow-up appointment', 'Consultation', '99212', 'CPT', 100.00, 15),
('Comprehensive Exam', 'Complete physical examination', 'Consultation', '99215', 'CPT', 250.00, 45),
('Blood Test - CBC', 'Complete blood count', 'Laboratory', '85025', 'CPT', 35.00, 10),
('Blood Test - Metabolic Panel', 'Basic metabolic panel', 'Laboratory', '80048', 'CPT', 50.00, 10),
('Lipid Panel', 'Cholesterol and triglycerides', 'Laboratory', '80061', 'CPT', 45.00, 10),
('Urinalysis', 'Complete urinalysis', 'Laboratory', '81003', 'CPT', 25.00, 5),
('X-Ray - Chest', 'Chest X-ray examination', 'Imaging', '71046', 'CPT', 200.00, 15),
('X-Ray - Extremity', 'X-ray of arm, leg, hand, or foot', 'Imaging', '73030', 'CPT', 150.00, 15),
('ECG/EKG', 'Electrocardiogram', 'Diagnostic', '93000', 'CPT', 75.00, 20),
('Flu Vaccination', 'Influenza vaccine administration', 'Preventive', '90686', 'CPT', 45.00, 10),
('COVID-19 Vaccination', 'COVID-19 vaccine administration', 'Preventive', '91300', 'CPT', 0.00, 15),
('Wound Care - Simple', 'Simple wound cleaning and dressing', 'Procedure', '97597', 'CPT', 85.00, 20),
('Wound Care - Complex', 'Complex wound debridement', 'Procedure', '97598', 'CPT', 175.00, 30),
('Physical Therapy - Evaluation', 'Initial PT evaluation', 'Therapy', '97161', 'CPT', 125.00, 45),
('Physical Therapy - Session', 'Therapeutic exercise session', 'Therapy', '97110', 'CPT', 75.00, 30)
ON CONFLICT DO NOTHING;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE public.services IS 'Medical service catalog with CPT/HCPCS codes and pricing';
COMMENT ON TABLE public.payment_plans IS 'Patient payment installment plans';
COMMENT ON TABLE public.payment_plan_transactions IS 'Individual installment payments for payment plans';
COMMENT ON TABLE public.insurance_claims IS 'Insurance claim submissions and tracking';
COMMENT ON TABLE public.claim_history IS 'Audit trail for insurance claim status changes';