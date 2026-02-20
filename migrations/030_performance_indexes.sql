-- ============================================================
-- Migration 030: Performance Indexes
-- Adds missing indexes on FK columns, status fields, and
-- date columns to improve query performance across the platform.
-- All statements use IF NOT EXISTS for idempotency.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- PRIORITY 1 — CRITICAL: Core Transaction & Payment Tables
-- ────────────────────────────────────────────────────────────

-- TRANSACTIONS: FK columns + payment_status
CREATE INDEX IF NOT EXISTS idx_transactions_patient_id
  ON public.transactions(patient_id);

CREATE INDEX IF NOT EXISTS idx_transactions_provider_id
  ON public.transactions(provider_id);

CREATE INDEX IF NOT EXISTS idx_transactions_appointment_id
  ON public.transactions(appointment_id);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_status
  ON public.transactions(payment_status);

-- Composite: common dashboard query "my recent txns by status"
CREATE INDEX IF NOT EXISTS idx_transactions_patient_status
  ON public.transactions(patient_id, payment_status);

-- INVOICES: FK columns
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id
  ON public.invoices(patient_id);

CREATE INDEX IF NOT EXISTS idx_invoices_provider_id
  ON public.invoices(provider_id);

CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id
  ON public.invoices(transaction_id);

CREATE INDEX IF NOT EXISTS idx_invoices_created_by
  ON public.invoices(created_by);

-- APPOINTMENTS: FK columns + composite for provider schedule
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id
  ON public.appointments(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_provider_id
  ON public.appointments(provider_id);

CREATE INDEX IF NOT EXISTS idx_appointments_provider_date
  ON public.appointments(provider_id, appointment_date);

-- INVOICE ITEMS & OPERATIONS: FK columns
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON public.invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_operations_invoice_id
  ON public.invoice_operations(invoice_id);

-- PAYMENT METHODS & HISTORY
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id
  ON public.payment_methods(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_patient_id
  ON public.payment_history(patient_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_provider_id
  ON public.payment_history(provider_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_invoice_id
  ON public.payment_history(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date
  ON public.payment_history(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_history_payment_status
  ON public.payment_history(payment_status);

-- MEDICAL RECORDS: FK columns
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id
  ON public.medical_records(patient_id);

CREATE INDEX IF NOT EXISTS idx_medical_records_provider_id
  ON public.medical_records(provider_id);

CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_id
  ON public.medical_records(appointment_id);


-- ────────────────────────────────────────────────────────────
-- PRIORITY 2 — HIGH: Disputes, Chargebacks & Notifications
-- ────────────────────────────────────────────────────────────

-- DISPUTES: FK columns + status + date filtering
CREATE INDEX IF NOT EXISTS idx_disputes_transaction_id
  ON public.disputes(transaction_id);

CREATE INDEX IF NOT EXISTS idx_disputes_invoice_id
  ON public.disputes(invoice_id);

CREATE INDEX IF NOT EXISTS idx_disputes_patient_id
  ON public.disputes(patient_id);

CREATE INDEX IF NOT EXISTS idx_disputes_provider_id
  ON public.disputes(provider_id);

CREATE INDEX IF NOT EXISTS idx_disputes_status
  ON public.disputes(status);

CREATE INDEX IF NOT EXISTS idx_disputes_assigned_to
  ON public.disputes(assigned_to);

CREATE INDEX IF NOT EXISTS idx_disputes_dispute_date
  ON public.disputes(dispute_date DESC);

-- CHARGEBACKS: FK + status
CREATE INDEX IF NOT EXISTS idx_chargebacks_dispute_id
  ON public.chargebacks(dispute_id);

CREATE INDEX IF NOT EXISTS idx_chargebacks_status
  ON public.chargebacks(status);

-- DISPUTE EVIDENCE / TIMELINE / NOTIFICATIONS: FK columns
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id
  ON public.dispute_evidence(dispute_id);

CREATE INDEX IF NOT EXISTS idx_dispute_timeline_dispute_id
  ON public.dispute_timeline(dispute_id);

CREATE INDEX IF NOT EXISTS idx_dispute_notifications_dispute_id
  ON public.dispute_notifications(dispute_id);

CREATE INDEX IF NOT EXISTS idx_dispute_notifications_recipient_id
  ON public.dispute_notifications(recipient_id);

CREATE INDEX IF NOT EXISTS idx_dispute_notifications_status
  ON public.dispute_notifications(status);

-- INVOICE DISPUTES: FK columns
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_invoice_id
  ON public.invoice_disputes(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_disputes_dispute_id
  ON public.invoice_disputes(dispute_id);

-- NOTIFICATIONS: user lookups + unread filter
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_read_status
  ON public.notifications(user_id, read_status);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications(created_at DESC);


-- ────────────────────────────────────────────────────────────
-- PRIORITY 3 — MEDIUM: Core Entity FKs & User/Provider Lookups
-- Critical for RLS policy performance
-- ────────────────────────────────────────────────────────────

-- PATIENTS / PROVIDERS: user_id FK (used in every RLS policy!)
CREATE INDEX IF NOT EXISTS idx_patients_user_id
  ON public.patients(user_id);

CREATE INDEX IF NOT EXISTS idx_providers_user_id
  ON public.providers(user_id);

-- USER PROFILES: role filter (used in RLS + admin queries)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role
  ON public.user_profiles(role);

-- API KEYS: user_id + status (key validation queries)
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
  ON public.api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_status
  ON public.api_keys(status);

-- WEBHOOKS / WEBHOOK ENDPOINTS: user_id FK
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id
  ON public.webhooks(user_id);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_id
  ON public.webhook_endpoints(user_id);

-- RECURRING BILLING: next_billing_date for cron job queries
CREATE INDEX IF NOT EXISTS idx_recurring_billing_next_billing_date
  ON public.recurring_billing(next_billing_date)
  WHERE status = 'active';


-- ────────────────────────────────────────────────────────────
-- PRIORITY 4 — MEDIUM: Provider Onboarding Tables
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_provider_onboarding_provider_id
  ON public.provider_onboarding(provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_onboarding_status
  ON public.provider_onboarding(onboarding_status);

CREATE INDEX IF NOT EXISTS idx_provider_documents_provider_id
  ON public.provider_documents(provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_notes_provider_id
  ON public.provider_notes(provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_compliance_records_provider_id
  ON public.provider_compliance_records(provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_payment_volumes_provider_id
  ON public.provider_payment_volumes(provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_performance_metrics_provider_id
  ON public.provider_performance_metrics(provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_performance_metrics_date
  ON public.provider_performance_metrics(metric_date);

CREATE INDEX IF NOT EXISTS idx_onboarding_workflow_steps_provider_id
  ON public.onboarding_workflow_steps(provider_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_items_provider_id
  ON public.onboarding_checklist_items(provider_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_team_invitations_provider_id
  ON public.onboarding_team_invitations(provider_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_email_log_provider_id
  ON public.onboarding_email_log(provider_id);

CREATE INDEX IF NOT EXISTS idx_go_live_checklist_provider_id
  ON public.go_live_checklist(provider_id);

CREATE INDEX IF NOT EXISTS idx_bank_connection_setup_provider_id
  ON public.bank_connection_setup(provider_id);

CREATE INDEX IF NOT EXISTS idx_bank_wallet_verification_provider_id
  ON public.bank_wallet_verification(provider_id);

CREATE INDEX IF NOT EXISTS idx_compliance_verification_steps_provider_id
  ON public.compliance_verification_steps(provider_id);


-- ────────────────────────────────────────────────────────────
-- PRIORITY 5 — MEDIUM: Audit, Compliance & Security Tables
-- ────────────────────────────────────────────────────────────

-- ACCESS AUDIT LOGS & COMPLIANCE LOGS
CREATE INDEX IF NOT EXISTS idx_access_audit_logs_user_id
  ON public.access_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_access_audit_logs_created_at
  ON public.access_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_audit_logs_resource_type
  ON public.access_audit_logs(resource_type);

CREATE INDEX IF NOT EXISTS idx_compliance_logs_user_id
  ON public.compliance_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_compliance_logs_created_at
  ON public.compliance_logs(created_at DESC);

-- COMPLIANCE VIOLATIONS
CREATE INDEX IF NOT EXISTS idx_compliance_violations_status
  ON public.compliance_violations(status);

CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity
  ON public.compliance_violations(severity);

-- SECURITY THREAT LOGS
CREATE INDEX IF NOT EXISTS idx_security_threat_logs_user_id
  ON public.security_threat_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_security_threat_logs_status
  ON public.security_threat_logs(status);

CREATE INDEX IF NOT EXISTS idx_security_threat_logs_created_at
  ON public.security_threat_logs(created_at DESC);

-- INCIDENT RESPONSES & ACTIVITY LOGS
CREATE INDEX IF NOT EXISTS idx_incident_responses_status
  ON public.incident_responses(status);

CREATE INDEX IF NOT EXISTS idx_incident_responses_severity
  ON public.incident_responses(severity);

CREATE INDEX IF NOT EXISTS idx_incident_responses_assigned_to
  ON public.incident_responses(assigned_to);

CREATE INDEX IF NOT EXISTS idx_incident_activity_logs_incident_id
  ON public.incident_activity_logs(incident_id);

-- RISK DETECTIONS
CREATE INDEX IF NOT EXISTS idx_risk_detections_status
  ON public.risk_detections(status);

CREATE INDEX IF NOT EXISTS idx_risk_detections_severity
  ON public.risk_detections(severity);

-- PERMISSIONS: user_id FKs for authorization checks
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id
  ON public.user_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id
  ON public.user_role_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_transaction_permissions_user_id
  ON public.transaction_permissions(user_id);


-- ────────────────────────────────────────────────────────────
-- PRIORITY 6 — LOW: Webhook/API, Analytics & MedBed Tables
-- ────────────────────────────────────────────────────────────

-- WEBHOOK EVENTS & DELIVERY
CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id
  ON public.webhook_events(webhook_id);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_webhook_id
  ON public.webhook_delivery_logs(webhook_id);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_status
  ON public.webhook_delivery_logs(status);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_endpoint_id
  ON public.webhook_delivery_attempts(webhook_endpoint_id);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_status
  ON public.webhook_delivery_attempts(status);

-- API USAGE LOGS (high volume, time-series queries)
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id
  ON public.api_usage_logs(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at
  ON public.api_usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_key_permissions_api_key_id
  ON public.api_key_permissions(api_key_id);

-- ANALYTICS & MONITORING
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_status
  ON public.anomaly_alerts(status);

CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_severity
  ON public.anomaly_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_status
  ON public.performance_alerts(status);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_metric_id
  ON public.performance_alerts(metric_id);

CREATE INDEX IF NOT EXISTS idx_transaction_flow_metrics_time_bucket
  ON public.transaction_flow_metrics(time_bucket DESC);

CREATE INDEX IF NOT EXISTS idx_integration_health_logs_integration_id
  ON public.integration_health_logs(integration_id);

CREATE INDEX IF NOT EXISTS idx_integration_health_logs_checked_at
  ON public.integration_health_logs(checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_reports_user_id
  ON public.saved_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_data_backup_logs_schedule_id
  ON public.data_backup_logs(schedule_id);

-- MEDBED BOOKINGS
CREATE INDEX IF NOT EXISTS idx_med_bed_bookings_user_id
  ON public.med_bed_bookings(user_id);

CREATE INDEX IF NOT EXISTS idx_med_bed_bookings_med_bed_id
  ON public.med_bed_bookings(med_bed_id);

CREATE INDEX IF NOT EXISTS idx_med_bed_bookings_status
  ON public.med_bed_bookings(status);

CREATE INDEX IF NOT EXISTS idx_med_bed_bookings_start_time
  ON public.med_bed_bookings(start_time);

COMMIT;
