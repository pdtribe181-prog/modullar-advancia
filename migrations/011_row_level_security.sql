-- Row Level Security (RLS) Policies
-- Run this in Supabase SQL Editor to enable security

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;

-- USER PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PATIENTS POLICIES
CREATE POLICY "Patients can view own data" ON public.patients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Patients can update own data" ON public.patients
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Providers can view their patients" ON public.patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.providers p ON p.id = a.provider_id
      WHERE a.patient_id = patients.id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all patients" ON public.patients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PROVIDERS POLICIES
CREATE POLICY "Anyone can view providers" ON public.providers
  FOR SELECT USING (true);

CREATE POLICY "Providers can update own profile" ON public.providers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage providers" ON public.providers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- APPOINTMENTS POLICIES
CREATE POLICY "Patients can view own appointments" ON public.appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = appointments.patient_id AND user_id = auth.uid())
  );

CREATE POLICY "Providers can view their appointments" ON public.appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.providers WHERE id = appointments.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Patients can create appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.patients WHERE id = appointments.patient_id AND user_id = auth.uid())
  );

CREATE POLICY "Providers can update their appointments" ON public.appointments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.providers WHERE id = appointments.provider_id AND user_id = auth.uid())
  );

-- TRANSACTIONS POLICIES
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = transactions.patient_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.providers WHERE id = transactions.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INVOICES POLICIES
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = invoices.patient_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.providers WHERE id = invoices.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Providers can create invoices" ON public.invoices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.providers WHERE id = invoices.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all invoices" ON public.invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- DISPUTES POLICIES
CREATE POLICY "Users can view own disputes" ON public.disputes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = disputes.patient_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.providers WHERE id = disputes.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Patients can create disputes" ON public.disputes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.patients WHERE id = disputes.patient_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all disputes" ON public.disputes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- API KEYS POLICIES
CREATE POLICY "Users can view own API keys" ON public.api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own API keys" ON public.api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own API keys" ON public.api_keys
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own API keys" ON public.api_keys
  FOR DELETE USING (user_id = auth.uid());

-- WEBHOOKS POLICIES
CREATE POLICY "Users can view own webhooks" ON public.webhooks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own webhooks" ON public.webhooks
  FOR ALL USING (user_id = auth.uid());

-- MEDICAL RECORDS POLICIES
CREATE POLICY "Patients can view own records" ON public.medical_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = medical_records.patient_id AND user_id = auth.uid())
  );

CREATE POLICY "Providers can view their patient records" ON public.medical_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.providers WHERE id = medical_records.provider_id AND user_id = auth.uid())
  );

CREATE POLICY "Providers can create records" ON public.medical_records
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.providers WHERE id = medical_records.provider_id AND user_id = auth.uid())
  );

-- COMPLIANCE LOGS POLICIES (Admins only)
CREATE POLICY "Admins can view compliance logs" ON public.compliance_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can create compliance logs" ON public.compliance_logs
  FOR INSERT WITH CHECK (true);
