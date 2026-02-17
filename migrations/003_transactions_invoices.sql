-- Migration 003: Appointments, Transactions, Invoices
-- Run this THIRD

-- Appointments
CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  provider_id uuid,
  appointment_date date NOT NULL,
  appointment_time time without time zone NOT NULL,
  duration_minutes integer DEFAULT 30,
  status appointment_status DEFAULT 'scheduled'::appointment_status,
  reason_for_visit text,
  notes text,
  prescription jsonb DEFAULT '[]'::jsonb,
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT appointments_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Transactions
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  provider_id uuid,
  appointment_id uuid,
  payment_intent_id text UNIQUE,
  stripe_charge_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'INR'::text,
  payment_method payment_method_type,
  payment_status payment_status DEFAULT 'pending'::payment_status,
  description text,
  billing_name text,
  billing_email text,
  billing_address jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT transactions_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT transactions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);

-- Invoices
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  patient_id uuid,
  provider_id uuid,
  transaction_id uuid,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status invoice_status DEFAULT 'draft'::invoice_status,
  subtotal numeric NOT NULL DEFAULT 0.00,
  tax_amount numeric DEFAULT 0.00,
  discount_amount numeric DEFAULT 0.00,
  total_amount numeric NOT NULL DEFAULT 0.00,
  currency text DEFAULT 'INR'::text,
  notes text,
  terms text,
  payment_instructions text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT invoices_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT invoices_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- Invoice Items
CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);

-- Invoice Operations
CREATE TABLE public.invoice_operations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid,
  operation_type invoice_operation_type NOT NULL,
  operation_description text,
  performed_by uuid,
  performed_by_name text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT invoice_operations_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_operations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT invoice_operations_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.user_profiles(id)
);

-- Payment Methods
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  stripe_payment_method_id text UNIQUE,
  method_type method_type NOT NULL,
  is_default boolean DEFAULT false,
  card_brand text,
  card_last4 text,
  card_exp_month integer,
  card_exp_year integer,
  bank_name text,
  account_last4 text,
  account_holder_name text,
  billing_name text,
  billing_email text,
  billing_address jsonb DEFAULT '{}'::jsonb,
  nickname text,
  metadata jsonb DEFAULT '{}'::jsonb,
  verified_at timestamp with time zone,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id),
  CONSTRAINT payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);

-- Payment History
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid,
  transaction_id uuid,
  patient_id uuid,
  provider_id uuid,
  amount numeric NOT NULL,
  currency text DEFAULT 'INR'::text,
  payment_method text,
  payment_status text,
  payment_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  reference_number text,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payment_history_pkey PRIMARY KEY (id),
  CONSTRAINT payment_history_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT payment_history_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT payment_history_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT payment_history_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id)
);

-- Recurring Billing
CREATE TABLE public.recurring_billing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  provider_id uuid,
  description text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'INR'::text,
  frequency frequency NOT NULL,
  status recurring_status DEFAULT 'active'::recurring_status,
  start_date date NOT NULL,
  end_date date,
  next_billing_date date NOT NULL,
  last_billed_date date,
  total_cycles integer,
  completed_cycles integer DEFAULT 0,
  auto_generate_invoice boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT recurring_billing_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_billing_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT recurring_billing_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT recurring_billing_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);

-- Medical Records
CREATE TABLE public.medical_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  provider_id uuid,
  appointment_id uuid,
  record_type text NOT NULL,
  title text NOT NULL,
  description text,
  file_url text,
  file_type text,
  file_size integer,
  diagnosis jsonb DEFAULT '[]'::jsonb,
  treatment_plan text,
  lab_results jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT medical_records_pkey PRIMARY KEY (id),
  CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT medical_records_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT medical_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);
