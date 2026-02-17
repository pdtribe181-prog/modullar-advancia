-- Migration 004: Disputes and Chargebacks
-- Run this FOURTH

-- Disputes
CREATE TABLE public.disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dispute_number text NOT NULL UNIQUE,
  transaction_id uuid,
  invoice_id uuid,
  patient_id uuid,
  provider_id uuid,
  dispute_reason dispute_reason NOT NULL,
  status dispute_status DEFAULT 'new'::dispute_status,
  amount numeric NOT NULL,
  currency text DEFAULT 'INR'::text,
  dispute_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  due_date timestamp with time zone,
  resolved_date timestamp with time zone,
  customer_description text,
  internal_notes text,
  evidence_url text,
  assigned_to uuid,
  resolution_outcome resolution_outcome,
  resolution_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT disputes_pkey PRIMARY KEY (id),
  CONSTRAINT disputes_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT disputes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT disputes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT disputes_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id),
  CONSTRAINT disputes_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id)
);

-- Chargebacks
CREATE TABLE public.chargebacks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dispute_id uuid,
  chargeback_number text NOT NULL UNIQUE,
  status chargeback_status DEFAULT 'pending'::chargeback_status,
  amount numeric NOT NULL,
  currency text DEFAULT 'INR'::text,
  reason_code text,
  chargeback_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  response_due_date timestamp with time zone,
  resolved_date timestamp with time zone,
  processor_reference text,
  processor_response text,
  chargeback_fee numeric DEFAULT 0.00,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chargebacks_pkey PRIMARY KEY (id),
  CONSTRAINT chargebacks_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id)
);

-- Dispute Evidence
CREATE TABLE public.dispute_evidence (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dispute_id uuid,
  evidence_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dispute_evidence_pkey PRIMARY KEY (id),
  CONSTRAINT dispute_evidence_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id),
  CONSTRAINT dispute_evidence_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id)
);

-- Dispute Timeline
CREATE TABLE public.dispute_timeline (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dispute_id uuid,
  event_type text NOT NULL,
  event_title text NOT NULL,
  event_description text,
  actor_id uuid,
  actor_name text,
  actor_role text,
  old_status text,
  new_status text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dispute_timeline_pkey PRIMARY KEY (id),
  CONSTRAINT dispute_timeline_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id),
  CONSTRAINT dispute_timeline_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.user_profiles(id)
);

-- Dispute Notifications
CREATE TABLE public.dispute_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dispute_id uuid,
  notification_type text NOT NULL,
  recipient_email text NOT NULL,
  recipient_id uuid,
  subject text NOT NULL,
  message text NOT NULL,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  status text DEFAULT 'pending'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dispute_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT dispute_notifications_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id),
  CONSTRAINT dispute_notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.user_profiles(id)
);

-- Invoice Disputes
CREATE TABLE public.invoice_disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid,
  dispute_id uuid,
  linked_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  linked_by uuid,
  notes text,
  CONSTRAINT invoice_disputes_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_disputes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT invoice_disputes_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id),
  CONSTRAINT invoice_disputes_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES public.user_profiles(id)
);
