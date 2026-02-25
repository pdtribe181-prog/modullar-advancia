# Database Schema Reference

> **Modullar Advancia — Healthcare Payment Platform**
> PostgreSQL (Supabase) · ~90 tables · Row-Level Security enabled

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Summary](#entity-relationship-summary)
3. [Enum Types](#enum-types)
4. [Core / Identity](#core--identity)
5. [Appointments & Clinical](#appointments--clinical)
6. [Payments & Billing](#payments--billing)
7. [Services & Insurance](#services--insurance)
8. [Disputes & Chargebacks](#disputes--chargebacks)
9. [Notifications & Communication](#notifications--communication)
10. [Settings & Preferences](#settings--preferences)
11. [Audit & Compliance](#audit--compliance)
12. [Provider Onboarding](#provider-onboarding)
13. [Webhooks & API](#webhooks--api)
14. [Analytics & Monitoring](#analytics--monitoring)
15. [Web3 / Wallet Integration](#web3--wallet-integration)
16. [MedBed Features](#medbed-features)
17. [Storage Buckets](#storage-buckets)

---

## Overview

| Category | Table Count | Description |
|---|---|---|
| Core / Identity | 4 | Users, patients, providers, roles |
| Appointments & Clinical | 2 | Scheduling, medical records |
| Payments & Billing | 9 | Transactions, invoices, recurring billing, payment plans, crypto |
| Services & Insurance | 4 | Service catalog, insurance claims |
| Disputes & Chargebacks | 6 | Disputes, chargebacks, evidence, timeline |
| Notifications & Communication | 4 | Notifications, email history, templates |
| Settings & Preferences | 7 | Email, payment, brand, org settings, team invitations |
| Audit & Compliance | 8 | Access logs, compliance status, violations, workflows |
| Provider Onboarding | 15 | Onboarding steps, documents, verification, bank setup |
| Webhooks & API | 16 | Webhooks, API keys, delivery logs, dev portal |
| Analytics & Monitoring | 12 | Reports, insights, alerts, performance, backups |
| Web3 / Wallet | 4 | Linked wallets, wallet transactions, verification |
| MedBed | 2 | MedBed/Chamber catalog and bookings |
| **Total** | **~93** | |

**Extensions:** `pgcrypto`, `uuid-ossp`

---

## Entity Relationship Summary

```
auth.users (Supabase Auth)
  └─── user_profiles (1:1, id = auth.users.id)
         ├─── patients (1:1 via user_id)
         │      ├─── appointments (M via patient_id)
         │      ├─── transactions (M via patient_id)
         │      ├─── invoices (M via patient_id)
         │      ├─── disputes (M via patient_id)
         │      ├─── payment_plans (M via patient_id)
         │      ├─── insurance_claims (M via patient_id)
         │      ├─── crypto_transactions (M via patient_id)
         │      └─── recurring_billing (M via patient_id)
         │
         ├─── providers (1:1 via user_id)
         │      ├─── appointments (M via provider_id)
         │      ├─── transactions (M via provider_id)
         │      ├─── invoices (M via provider_id)
         │      ├─── provider_onboarding (1:1)
         │      ├─── provider_documents (M)
         │      ├─── provider_performance_metrics (M)
         │      ├─── linked_wallets (M)
         │      └─── wallet_transactions (M)
         │
         ├─── api_keys (M via user_id)
         ├─── webhooks (M via user_id)
         ├─── notifications (M via user_id)
         ├─── notification_preferences (1:1)
         └─── email_settings (1:1)

transactions
  ├─── invoices (1:1 via transaction_id)
  ├─── disputes (M via transaction_id)
  └─── payment_history (M via transaction_id)

invoices
  ├─── invoice_items (M via invoice_id)
  ├─── invoice_operations (M via invoice_id)
  └─── invoice_disputes (M via invoice_id)

disputes
  ├─── chargebacks (M via dispute_id)
  ├─── dispute_evidence (M via dispute_id)
  ├─── dispute_timeline (M via dispute_id)
  └─── dispute_notifications (M via dispute_id)

webhooks
  ├─── webhook_events (M via webhook_id)
  ├─── webhook_delivery_logs (M via webhook_id)
  └─── webhook_retry_policies (1:1 via webhook_id)

api_keys
  ├─── api_key_permissions (M via api_key_id)
  ├─── api_key_rotation_history (M via api_key_id)
  └─── api_usage_logs (M via api_key_id)
```

---

## Enum Types

| Enum Name | Values |
|---|---|
| `user_role` | patient, provider, admin, staff |
| `appointment_status` | scheduled, completed, cancelled, no_show, rescheduled |
| `payment_status` | pending, completed, failed, refunded, cancelled |
| `payment_method_type` | credit_card, debit_card, bank_transfer, upi, wallet |
| `method_type` | card, bank_account, wallet |
| `transaction_type` | payment, refund, chargeback, transfer, adjustment |
| `invoice_status` | draft, sent, paid, overdue, cancelled, refunded |
| `invoice_operation_type` | created, updated, sent, paid, cancelled, refunded |
| `dispute_status` | new, under_review, resolved, rejected |
| `dispute_reason` | fraud, duplicate, product_not_received, service_not_provided, other |
| `resolution_outcome` | won, lost, partial, withdrawn |
| `chargeback_status` | pending, won, lost, in_review |
| `recurring_status` | active, paused, cancelled, completed |
| `frequency` | daily, weekly, monthly, yearly |
| `notification_type` | system, transaction, security, compliance, marketing |
| `notification_priority` | low, medium, high, critical |
| `notification_read_status` | unread, read, archived |
| `email_status` | pending, sent, failed, opened, clicked |
| `email_template_type` | invoice, payment, reminder, notification, marketing, system |
| `onboarding_status` | pending, in_progress, completed, rejected |
| `onboarding_step_status` | not_started, in_progress, completed, skipped |
| `document_status` | pending_upload, uploaded, reviewed, approved, rejected, expired |
| `verification_status` | not_started, pending, verified, failed |
| `bank_verification_status` | not_started, pending, verified, failed |
| `api_environment` | sandbox, production |
| `api_key_status` | active, inactive, revoked, expired |
| `webhook_status` | active, inactive, failed |
| `webhook_event_type` | payment.created, payment.completed, payment.failed, invoice.created, invoice.paid, dispute.created, dispute.resolved |
| `delivery_status` | pending, delivered, failed, retrying |
| `retry_strategy` | exponential, linear, fixed |
| `permission_type` | read, write, delete, admin |
| `audit_access_level` | none, read, write, admin |
| `incident_severity` | low, medium, high, critical |
| `incident_status` | open, acknowledged, resolved, closed |
| `incident_type` | security, compliance, operational, other |
| `invitation_status` | pending, accepted, expired, cancelled, declined |
| `crypto_transaction_status` | pending, confirmed, failed, delayed, resolved, canceled, expired |
| `blockchain_network` | ethereum, solana, polygon, base, arbitrum |
| `wallet_verification_status` | pending, verified, failed, expired, revoked |
| `payment_plan_status` | active, completed, paused, cancelled, defaulted |
| `payment_frequency` | weekly, biweekly, monthly, quarterly |
| `claim_status` | draft, submitted, pending, in_review, approved, partially_approved, denied, appealed, paid, closed |

---

## Core / Identity

### `user_profiles`
Central user record, linked 1:1 with Supabase `auth.users`.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Same as auth.users.id |
| email | text (UNIQUE) | User email |
| full_name | text | Display name |
| role | user_role | patient / provider / admin / staff |
| phone | text | Phone number |
| avatar_url | text | Profile picture URL |
| stripe_customer_id | text | Stripe customer ID |
| is_active | boolean | Account active flag |
| two_factor_enabled | boolean | 2FA enabled |
| timezone | text | User timezone |
| locale | text | Language preference |
| last_login_at | timestamptz | Last login timestamp |
| created_at / updated_at | timestamptz | Timestamps |

**FK:** `id` → `auth.users(id)`

---

### `patients`
Extended patient profile with demographics and insurance info.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Patient ID |
| user_id | uuid | FK to user_profiles |
| date_of_birth | date | DOB |
| gender | text | Gender |
| address_line_1, city, state, postal_code, country | text | Address fields |
| emergency_contact_name / phone | text | Emergency contact |
| insurance_provider | text | Insurance company |
| insurance_policy_number | text | Policy number |
| medical_history | jsonb | Past medical history |
| allergies | jsonb | Known allergies |

**FK:** `user_id` → `user_profiles(id)`

---

### `providers`
Healthcare provider profiles with credentials and Stripe Connect info.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Provider ID |
| user_id | uuid | FK to user_profiles |
| specialty | text | Medical specialty |
| license_number | text (UNIQUE) | License number |
| consultation_fee | numeric | Fee per consultation |
| rating | numeric | Average rating |
| total_consultations | integer | Total consultations |
| stripe_account_id | text | Stripe Connect account |
| stripe_onboarding_complete | boolean | Stripe onboarding done |
| stripe_charges_enabled | boolean | Can accept charges |
| stripe_payouts_enabled | boolean | Can receive payouts |
| video_consultation_enabled | boolean | Video consult support |
| languages_spoken | jsonb | Languages array |
| education / certifications | jsonb | Credentials |

**FK:** `user_id` → `user_profiles(id)`

---

### `custom_roles`
User-defined roles beyond the base enum.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Role ID |
| role_name | text (UNIQUE) | Machine name |
| display_name | text | Human-readable name |
| description | text | Role description |
| is_system_role | boolean | System-managed flag |
| created_by | uuid | FK to user_profiles |

---

## Appointments & Clinical

### `appointments`
Patient-provider appointment scheduling.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Appointment ID |
| patient_id | uuid | FK to patients |
| provider_id | uuid | FK to providers |
| appointment_date | date | Date |
| appointment_time | time | Time |
| duration_minutes | integer | Duration (default 30) |
| status | appointment_status | scheduled / completed / cancelled / no_show / rescheduled |
| reason_for_visit | text | Visit reason |
| prescription | jsonb | Prescriptions issued |
| follow_up_required | boolean | Follow-up needed |

**FK:** `patient_id` → `patients(id)`, `provider_id` → `providers(id)`

---

### `medical_records`
Patient medical records and documents.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Record ID |
| patient_id | uuid | FK to patients |
| provider_id | uuid | FK to providers |
| appointment_id | uuid | FK to appointments |
| record_type | text | Type of record |
| title | text | Record title |
| diagnosis | jsonb | Diagnosis data |
| treatment_plan | text | Treatment plan |
| lab_results | jsonb | Lab results |
| file_url / file_type / file_size | text/int | Attached file |

---

## Payments & Billing

### `transactions`
Core payment transaction records.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Transaction ID |
| patient_id | uuid | FK to patients |
| provider_id | uuid | FK to providers |
| appointment_id | uuid | FK to appointments |
| amount | numeric | Payment amount |
| currency | text | Currency code (default INR) |
| payment_method | payment_method_type | Payment method used |
| payment_status | payment_status | pending / completed / failed / refunded / cancelled |
| payment_intent_id | text (UNIQUE) | Stripe payment intent |
| stripe_payment_intent_id | text | Stripe PI ID |
| stripe_charge_id | text | Stripe charge ID |
| stripe_transfer_id | text | Stripe transfer ID |
| refunded_amount | decimal | Amount refunded |
| failure_reason | text | Failure reason |
| receipt_url | text | Payment receipt URL |
| processed_at | timestamptz | Processing timestamp |

---

### `invoices`
Patient invoices with line items.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Invoice ID |
| invoice_number | text (UNIQUE) | Human-readable number |
| patient_id | uuid | FK to patients |
| provider_id | uuid | FK to providers |
| transaction_id | uuid | FK to transactions |
| status | invoice_status | draft / sent / paid / overdue / cancelled / refunded |
| subtotal | numeric | Subtotal |
| tax_amount | numeric | Tax |
| discount_amount | numeric | Discount |
| total_amount | numeric | Final total |
| due_date | date | Payment due date |
| stripe_invoice_id | text | Stripe invoice ID |
| pdf_url | text | PDF download URL |
| created_by | uuid | FK to user_profiles |

---

### `invoice_items`
Line items belonging to an invoice.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Item ID |
| invoice_id | uuid | FK to invoices |
| description | text | Item description |
| quantity | integer | Quantity |
| unit_price | numeric | Unit price |
| amount | numeric | Line total |

---

### `invoice_operations`
Audit trail for invoice lifecycle events.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Operation ID |
| invoice_id | uuid | FK to invoices |
| operation_type | invoice_operation_type | created / updated / sent / paid / cancelled / refunded |
| performed_by | uuid | FK to user_profiles |
| old_values / new_values | jsonb | Before/after state |

---

### `payment_methods`
Stored payment methods (cards, bank accounts, wallets).

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Method ID |
| user_id | uuid | FK to user_profiles |
| stripe_payment_method_id | text (UNIQUE) | Stripe PM ID |
| method_type | method_type | card / bank_account / wallet |
| is_default | boolean | Default method flag |
| card_brand / card_last4 | text | Card info |
| bank_name / account_last4 | text | Bank info |
| verified_at | timestamptz | Verification date |

---

### `payment_history`
Historical log of all payments.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | History ID |
| invoice_id | uuid | FK to invoices |
| transaction_id | uuid | FK to transactions |
| patient_id / provider_id | uuid | FKs to patients / providers |
| amount | numeric | Amount paid |
| payment_method | text | Method used |
| payment_status | text | Status |
| payment_date | timestamptz | When paid |

---

### `recurring_billing`
Subscription/recurring payment schedules.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Billing ID |
| patient_id | uuid | FK to patients |
| provider_id | uuid | FK to providers |
| amount | numeric | Recurring amount |
| frequency | frequency | daily / weekly / monthly / yearly |
| status | recurring_status | active / paused / cancelled / completed |
| next_billing_date | date | Next charge date |
| stripe_subscription_id | text | Stripe subscription |
| auto_generate_invoice | boolean | Auto-create invoices |

---

### `payment_plans`
Installment payment plans for patients.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Plan ID |
| patient_id | uuid | FK to patients |
| invoice_id | uuid | FK to invoices |
| total_amount | numeric | Total owed |
| installment_amount | numeric | Per-installment amount |
| number_of_installments | integer | Total installments |
| installments_paid | integer | Installments completed |
| frequency | payment_frequency | weekly / biweekly / monthly / quarterly |
| status | payment_plan_status | active / completed / paused / cancelled / defaulted |
| auto_charge | boolean | Auto-charge enabled |
| late_fee_amount | numeric | Late fee |
| grace_period_days | integer | Grace period |

---

### `payment_plan_transactions`
Individual installment payments within a plan.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| payment_plan_id | uuid | FK to payment_plans |
| transaction_id | uuid | FK to transactions |
| installment_number | integer | Installment # |
| amount | numeric | Amount |
| due_date | date | Due date |
| paid_date | date | Paid date |
| status | text | pending / paid / late / failed / waived |
| late_fee | numeric | Late fee applied |

---

### `crypto_transactions`
Cryptocurrency payments via Coinbase Commerce.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Transaction ID |
| charge_id | text | Coinbase charge ID |
| charge_code | text (UNIQUE) | Lookup code |
| patient_id | uuid | FK to patients |
| provider_id | uuid | FK to providers |
| appointment_id | uuid | FK to appointments |
| amount_usd | integer | Amount in cents |
| status | crypto_transaction_status | pending / confirmed / failed / delayed / resolved / canceled / expired |
| hosted_url | text | Coinbase checkout URL |
| addresses | jsonb | Crypto wallet addresses (BTC, ETH, etc.) |
| payment_details | jsonb | Post-payment details |
| expires_at | timestamptz | Charge expiration |

---

### `stripe_webhook_events`
Log of incoming Stripe webhook events.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| event_id | text (UNIQUE) | Stripe event ID |
| event_type | text | Event type string |
| payload | jsonb | Full event payload |
| processed_at | timestamptz | When processed |

---

## Services & Insurance

### `services`
Medical service catalog with CPT/HCPCS codes.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Service ID |
| name | text | Service name |
| category | text | Category (Consultation, Laboratory, Imaging, etc.) |
| code | text | CPT/HCPCS code |
| code_type | text | CPT / HCPCS / ICD-10 / custom |
| default_price | numeric | Default price |
| duration_minutes | integer | Duration |
| is_active | boolean | Active flag |
| requires_authorization | boolean | Pre-auth required |

---

### `insurance_claims`
Insurance claim submissions and tracking.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Claim ID |
| patient_id | uuid | FK to patients |
| invoice_id | uuid | FK to invoices |
| provider_id | uuid | FK to providers |
| claim_number | text (UNIQUE) | Auto-generated claim number |
| insurance_provider | text | Insurance company |
| policy_number | text | Policy number |
| claim_amount | numeric | Claimed amount |
| approved_amount | numeric | Approved amount |
| paid_amount | numeric | Paid amount |
| patient_responsibility | numeric | Patient owes |
| status | claim_status | draft → submitted → approved/denied → paid/closed |
| diagnosis_codes | jsonb | ICD codes |
| procedure_codes | jsonb | CPT codes |
| denial_reason / denial_code | text | Denial details |

---

### `claim_history`
Audit trail for insurance claim status changes.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| claim_id | uuid | FK to insurance_claims |
| previous_status | claim_status | Old status |
| new_status | claim_status | New status |
| action | text | Action taken |
| changed_by | uuid | FK to user_profiles |

---

## Disputes & Chargebacks

### `disputes`
Payment disputes raised by patients.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Dispute ID |
| dispute_number | text (UNIQUE) | Dispute reference |
| transaction_id | uuid | FK to transactions |
| invoice_id | uuid | FK to invoices |
| patient_id | uuid | FK to patients |
| provider_id | uuid | FK to providers |
| dispute_reason | dispute_reason | fraud / duplicate / service_not_provided / other |
| status | dispute_status | new / under_review / resolved / rejected |
| amount | numeric | Disputed amount |
| assigned_to | uuid | FK to user_profiles (reviewer) |
| resolution_outcome | resolution_outcome | won / lost / partial / withdrawn |
| stripe_dispute_id | text | Stripe dispute ID |
| evidence_due_by | timestamptz | Evidence deadline |

---

### `chargebacks`
Chargeback records linked to disputes.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Chargeback ID |
| dispute_id | uuid | FK to disputes |
| chargeback_number | text (UNIQUE) | Reference number |
| status | chargeback_status | pending / won / lost / in_review |
| amount | numeric | Chargeback amount |
| reason_code | text | Processor reason code |
| chargeback_fee | numeric | Fee charged |
| processor_reference | text | Processor reference |

---

### `dispute_evidence`
Evidence files uploaded for disputes.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Evidence ID |
| dispute_id | uuid | FK to disputes |
| evidence_type | text | Type of evidence |
| file_name / file_url | text | File reference |
| uploaded_by | uuid | FK to user_profiles |

---

### `dispute_timeline`
Event timeline for dispute activity.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Event ID |
| dispute_id | uuid | FK to disputes |
| event_type | text | Event type |
| event_title | text | Title |
| actor_id | uuid | FK to user_profiles |
| old_status / new_status | text | Status transition |

---

### `dispute_notifications`
Notifications specific to dispute activity.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Notification ID |
| dispute_id | uuid | FK to disputes |
| recipient_id | uuid | FK to user_profiles |
| subject / message | text | Notification content |
| status | text | Delivery status |

---

### `invoice_disputes`
Junction table linking invoices to disputes.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Link ID |
| invoice_id | uuid | FK to invoices |
| dispute_id | uuid | FK to disputes |
| linked_by | uuid | FK to user_profiles |

---

## Notifications & Communication

### `notifications`
In-app notifications for users.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Notification ID |
| user_id | uuid | FK to user_profiles |
| notification_type | notification_type | system / transaction / security / compliance / marketing |
| priority | notification_priority | low / medium / high / critical |
| title / message | text | Content |
| read_status | notification_read_status | unread / read / archived |
| related_transaction_id | uuid | FK to transactions |
| action_url | text | CTA link |
| expires_at | timestamptz | Auto-expiry |

---

### `email_templates`
Configurable email templates.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Template ID |
| name | text | Template name |
| template_type | email_template_type | invoice / payment / reminder / notification / marketing / system |
| subject | text | Email subject line |
| html_body / text_body | text | Email content |
| variables | jsonb | Available merge variables |
| is_system | boolean | System template (non-editable) |
| created_by | uuid | FK to user_profiles |

---

### `email_history`
Log of all sent emails.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| template_id | uuid | FK to email_templates |
| recipient | text | Recipient email |
| subject | text | Subject line |
| status | email_status | pending / sent / failed / opened / clicked |
| sent_at / opened_at / clicked_at | timestamptz | Tracking timestamps |

---

### `notification_preferences`
Per-user notification preferences.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| user_id | uuid (UNIQUE) | FK to user_profiles |
| email_payment_alerts | boolean | Email for payments |
| email_security_alerts | boolean | Email for security |
| inapp_payment_alerts | boolean | In-app for payments |
| digest_frequency | text | realtime / daily / weekly |
| quiet_hours_enabled | boolean | Quiet hours flag |
| quiet_hours_start / end | time | Quiet hours range |

---

## Settings & Preferences

### `email_settings`
Email notification toggles per user.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| user_id | uuid (UNIQUE) | FK to user_profiles |
| transaction_confirmations | boolean | Send on transactions |
| invoice_alerts | boolean | Send on invoices |
| payment_reminders | boolean | Send reminders |
| marketing_emails | boolean | Marketing opt-in |

---

### `brand_customization`
Branding and theme settings per user/org.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| user_id | uuid (UNIQUE) | FK to auth.users |
| logo_url | text | Logo URL |
| primary_color / secondary_color / accent_color | text | Theme colors |
| font_family | text | Font family |
| custom_css | text | Custom CSS overrides |

---

### `organization_settings`
Organization profile information.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| user_id | uuid | FK to auth.users |
| organization_name | text | Org name |
| organization_email / phone / address / website | text | Contact info |
| tax_id | text | Tax ID |
| business_type | text | Business type |

---

### `payment_preferences`
Default payment configuration per user.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| user_id | uuid (UNIQUE) | FK to auth.users |
| default_currency | text | Default currency (USD) |
| settlement_schedule | text | Payout schedule |
| auto_reconciliation | boolean | Auto-reconcile |
| invoice_auto_send | boolean | Auto-send invoices |
| late_payment_reminders | boolean | Reminder enabled |

---

### `settings_activity_log`
Audit trail for settings changes.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| user_id | uuid | FK to auth.users |
| action | text | Action taken |
| setting_type | text | Setting category |
| old_value / new_value | jsonb | Before/after values |
| ip_address | text | Client IP |

---

### `team_invitations`
Team member invitations.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Invitation ID |
| email | text | Invited email |
| invited_by | uuid | FK to user_profiles |
| role | user_role | Assigned role |
| status | invitation_status | pending / accepted / expired / cancelled / declined |
| invitation_token | text (UNIQUE) | Unique token |
| expires_at | timestamptz | Expiration |

---

## Audit & Compliance

### `access_audit_logs`
Detailed access audit trail for every API/UI action.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Log ID |
| user_id | uuid | FK to user_profiles |
| action | text | Action performed |
| resource_type | text | Resource type |
| resource_id | uuid | Resource ID |
| access_granted | boolean | Access allowed |
| ip_address | text | Client IP |
| request_method / request_path | text | HTTP details |
| response_status | integer | HTTP status code |
| duration_ms | integer | Response time |

---

### `compliance_logs`
Compliance-related action log.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Log ID |
| user_id | uuid | FK to user_profiles |
| action | text | Action |
| resource_type / resource_id | text/uuid | Target resource |
| status | text | success / failure |
| details | jsonb | Extra context |

---

### `compliance_status`
Top-level compliance framework status.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Status ID |
| compliance_type | text (UNIQUE) | SOC2 / HIPAA / PCI_DSS |
| status | text | active / warning / critical / pending / expired |
| last_audit_date / next_audit_date | date | Audit schedule |
| audit_score | numeric | Score |
| compliance_percentage | numeric | Percentage |
| critical_findings | integer | Critical count |

---

### `compliance_violations`
Tracked compliance violations.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Violation ID |
| violation_type | text | data_breach / unauthorized_access / policy_violation / etc. |
| compliance_framework | text | SOC2 / HIPAA / PCI_DSS / GDPR / CCPA |
| severity | text | low / medium / high / critical |
| violation_title / description | text | Details |
| status | text | open → investigating → remediation_in_progress → resolved |
| assigned_to | uuid | FK to auth.users |
| remediation_plan | text | Remediation plan |
| reported_to_authorities | boolean | Reported flag |

---

### `compliance_workflow_rules`
Automated compliance rules engine.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Rule ID |
| rule_name | text (UNIQUE) | Rule name |
| trigger_event | text | Triggering event |
| conditions | jsonb | Rule conditions |
| actions | jsonb | Actions to execute |
| priority | integer | 1–10 priority |
| is_active | boolean | Active flag |

---

### `compliance_workflow_executions`
Execution log for compliance rules.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Execution ID |
| rule_id | uuid | FK to compliance_workflow_rules |
| execution_status | text | pending / running / completed / failed / skipped |
| trigger_data | jsonb | Input data |
| execution_result | jsonb | Output data |
| execution_duration_ms | integer | Duration |

---

### `audit_access_controls`
Granular audit data access permissions.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| user_id | uuid (UNIQUE) | FK to user_profiles |
| custom_role_id | uuid | FK to custom_roles |
| access_level | audit_access_level | none / read / write / admin |
| can_view_compliance_logs | boolean | View compliance |
| can_export_audit_data | boolean | Export permission |
| can_delete_audit_logs | boolean | Delete permission |
| granted_by | uuid | FK to user_profiles |
| expires_at | timestamptz | Expiration |

---

### `audit_log_exports`
Exported audit reports.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Export ID |
| user_id | uuid | FK to auth.users |
| export_type | text | csv / pdf / json |
| date_range_start / end | date | Date range |
| status | text | pending / processing / completed / failed |
| file_url | text | Download URL |
| record_count | integer | Records exported |

---

## Provider Onboarding

### `provider_onboarding`
Main onboarding status tracker per provider.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| provider_id | uuid | FK to providers |
| onboarding_status | onboarding_status | pending / in_progress / completed / rejected |
| documents_submitted / verified | boolean | Document status |
| background_check_status | verification_status | Background check |
| license_verification_status | verification_status | License check |
| reviewer_id | uuid | FK to user_profiles |
| rejection_reason | text | If rejected |

---

### `provider_documents`
Documents uploaded during onboarding.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Document ID |
| provider_id | uuid | FK to providers |
| document_name | text | File name |
| status | document_status | pending_upload → uploaded → reviewed → approved/rejected |
| file_url | text | Storage URL |
| expiry_date | date | Document expiration |
| reviewed_by | uuid | FK to user_profiles |

---

### `provider_notes`
Internal notes about providers.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Note ID |
| provider_id | uuid | FK to providers |
| created_by | uuid | FK to user_profiles |
| note_type | text | Note category |
| content | text | Note content |
| is_internal | boolean | Internal-only flag |

---

### `provider_compliance_records`
Per-provider compliance check records.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Record ID |
| provider_id | uuid | FK to providers |
| compliance_type | text | Compliance type |
| status | text | Status |
| compliance_score | numeric | Score |
| last_check_date / next_check_date | date | Schedule |

---

### `provider_payment_volumes`
Aggregated payment volumes per provider per period.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| provider_id | uuid | FK to providers |
| period_start / period_end | date | Period range |
| total_transactions | integer | Transaction count |
| total_volume | numeric | Monetary volume |
| average_transaction_value | numeric | Average |

---

### `provider_performance_metrics`
Daily performance metrics per provider.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| provider_id | uuid | FK to providers |
| metric_date | date | Date |
| total_revenue | numeric | Revenue |
| success_rate | numeric | Success rate % |
| patient_count | integer | Unique patients |
| rating_average | numeric | Average rating |

---

### `onboarding_workflow_steps`
Step-by-step onboarding progress.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Step ID |
| provider_id | uuid | FK to providers |
| step_number | integer | Order |
| step_name | text | Step name |
| step_status | onboarding_step_status | not_started / in_progress / completed / skipped |

---

### `guided_onboarding_progress`
Overall onboarding progress tracker (1:1 per provider).

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| provider_id | uuid (UNIQUE) | FK to providers |
| current_step | integer | Current step # |
| total_steps | integer | Total steps |
| completion_percentage | integer | % complete |

---

### `onboarding_checklist_items`
Granular checklist items for onboarding.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Item ID |
| provider_id | uuid | FK to providers |
| item_category | text | Category |
| item_title | text | Title |
| is_required | boolean | Required flag |
| is_completed | boolean | Completed flag |
| depends_on_item_id | uuid | FK to self (dependency) |

---

### `onboarding_team_invitations`
Invite team members during provider onboarding.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Invitation ID |
| provider_id | uuid | FK to providers |
| email | text | Invitee email |
| role | text | admin / provider / patient / staff |
| invitation_token | text (UNIQUE) | Token |
| status | text | pending / accepted / expired / cancelled |

---

### `onboarding_email_log`
Emails sent during onboarding process.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| provider_id | uuid | FK to providers |
| email_type | text | Email type |
| recipient_email | text | Recipient |
| status | text | Delivery status |

---

### `go_live_checklist`
Pre-launch readiness checklist per provider.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Item ID |
| provider_id | uuid | FK to providers |
| checklist_item | text | Item description |
| category | text | Category |
| is_required | boolean | Required |
| is_completed | boolean | Done |

---

### `bank_connection_setup`
Bank account / wallet connection during onboarding.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| provider_id | uuid | FK to providers |
| connection_type | text | bank_account / digital_wallet / card |
| connection_status | text | not_started → connected → verified |
| bank_name | text | Bank name |
| account_last4 | text | Last 4 digits |
| wallet_address | text | Wallet address |

---

### `bank_wallet_verification`
Micro-deposit verification for bank accounts.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| provider_id | uuid | FK to providers |
| account_type | text | Account type |
| verification_status | bank_verification_status | not_started / pending / verified / failed |
| micro_deposit_amount1 / 2 | numeric | Micro-deposit amounts |
| verification_attempts | integer | Attempt count |

---

### `compliance_verification_steps`
Individual compliance verification steps per provider.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| provider_id | uuid | FK to providers |
| verification_type | text | Verification type |
| status | text | pending / in_progress / verified / failed / expired |
| verified_by | uuid | FK to auth.users |
| expires_at | timestamptz | Expiration |

---

## Webhooks & API

### `webhooks`
Webhook endpoint configurations.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Webhook ID |
| user_id | uuid | FK to user_profiles |
| name | text | Webhook name |
| url | text | Target URL |
| status | webhook_status | active / inactive / failed |
| secret_key | text | Signing secret |
| subscribed_events | jsonb | Events array |
| timeout_seconds | integer | Timeout (default 30) |

---

### `webhook_endpoints`
Alternative webhook endpoint model with verification.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Endpoint ID |
| user_id | uuid | FK to user_profiles |
| url | text | Target URL |
| secret_key | text | Signing secret |
| is_verified | boolean | Verified flag |
| verification_token | text | Verification token |

---

### `webhook_events`
Triggered webhook events.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Event ID |
| webhook_id | uuid | FK to webhooks |
| event_type | webhook_event_type | Event type |
| payload | jsonb | Event payload |
| triggered_at | timestamptz | Trigger time |

---

### `webhook_delivery_logs`
Delivery attempt logs per webhook event.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Log ID |
| webhook_id | uuid | FK to webhooks |
| webhook_event_id | uuid | FK to webhook_events |
| status | delivery_status | pending / delivered / failed / retrying |
| http_status_code | integer | Response code |
| attempt_number | integer | Attempt # |
| error_message | text | Error if failed |

---

### `webhook_retry_policies`
Retry configuration per webhook.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Policy ID |
| webhook_id | uuid | FK to webhooks |
| max_attempts | integer | Max retries (default 3) |
| retry_strategy | retry_strategy | exponential / linear / fixed |
| initial_delay_seconds | integer | First delay |
| backoff_multiplier | numeric | Backoff factor |

---

### `webhook_settings` / `webhook_test_logs` / `webhook_delivery_attempts`
Additional webhook management tables for per-user settings, test logs, and delivery attempts via webhook_endpoints.

---

### `event_subscriptions`
Event subscriptions per webhook endpoint.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Subscription ID |
| webhook_endpoint_id | uuid | FK to webhook_endpoints |
| event_type | text | Event type |
| is_enabled | boolean | Enabled flag |
| filter_conditions | jsonb | Filters |

---

### `api_keys`
API key management for developer access.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Key ID |
| user_id | uuid | FK to user_profiles |
| name | text | Key name |
| key_hash | text (UNIQUE) | Hashed key |
| key_prefix | text | Displayable prefix |
| environment | api_environment | sandbox / production |
| status | api_key_status | active / inactive / revoked / expired |
| permissions | jsonb | Permission array |
| rate_limit | integer | Rate limit (default 1000) |
| requests_today | integer | Today's count |
| expires_at | timestamptz | Expiration |

---

### `api_key_permissions`
Granular permissions per API key.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| api_key_id | uuid | FK to api_keys |
| permission_name | text | Permission name |
| resource_type | text | Resource scope |
| allowed_actions | text[] | Allowed actions |

---

### `api_key_rotation_history`
API key rotation audit trail.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| api_key_id | uuid | FK to api_keys |
| old_key_prefix / new_key_prefix | text | Before/after prefix |
| rotated_by | uuid | FK to user_profiles |
| reason | text | Rotation reason |

---

### `api_usage_logs`
Per-request API usage logging.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Log ID |
| api_key_id | uuid | FK to api_keys |
| endpoint | text | API endpoint |
| method | text | HTTP method |
| status_code | integer | Response status |
| response_time_ms | integer | Latency |
| ip_address | text | Client IP |

---

### `api_documentation_feedback` / `code_snippet_usage` / `developer_portal_analytics`
Developer portal engagement tracking tables for doc feedback, code snippet usage, and page analytics.

---

## Analytics & Monitoring

### `advanced_analytics_reports`
Custom analytics report definitions.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Report ID |
| report_name | text | Name |
| report_type | text | Type |
| data_sources | text[] | Source tables |
| query_config | jsonb | Query configuration |
| visualization_config | jsonb | Chart settings |
| schedule_frequency | text | realtime / hourly / daily / weekly / monthly / on_demand |
| created_by | uuid | FK to user_profiles |

---

### `analytics_insights`
AI/ML-generated insights.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Insight ID |
| insight_type / category | text | Classification |
| insight_title / description | text | Content |
| confidence_score | numeric | 0–100 confidence |
| impact_level | text | critical / high / medium / low |
| recommended_actions | jsonb | Actions array |
| status | text | new / reviewed / actioned / dismissed |

---

### `anomaly_alerts`
Anomaly detection alerts.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Alert ID |
| anomaly_type | text | transaction_volume / access_pattern / data_access / system_behavior / user_activity |
| severity | text | low / medium / high / critical |
| baseline_value / detected_value | numeric | Expected vs actual |
| deviation_percentage | numeric | Deviation % |
| status | text | new / acknowledged / investigating / resolved / false_positive |

---

### `system_performance_metrics`
System health metric readings.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Metric ID |
| metric_type / name | text | Metric classification |
| metric_value | numeric | Reading |
| metric_unit | text | Unit (ms, %, MB, etc.) |
| threshold_warning / critical | numeric | Alert thresholds |
| status | text | normal / warning / critical |
| component | text | System component |

---

### `performance_alerts`
Alerts generated from performance thresholds.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Alert ID |
| metric_id | uuid | FK to system_performance_metrics |
| severity | text | critical / high / medium / low |
| status | text | active / acknowledged / resolved / muted |

---

### `transaction_flow_metrics`
Time-bucketed transaction volume metrics.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | ID |
| time_bucket | timestamptz | Time window |
| total_transactions | integer | Total count |
| successful / failed / pending | integer | By status |
| total_volume | numeric | Total amount |
| peak_transactions_per_minute | integer | Peak TPS |

---

### `integration_health_checks` / `integration_health_logs`
Integration uptime monitoring. Health checks define integrations to monitor; logs record each check result.

---

### `report_templates`
Predefined report templates.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Template ID |
| name | text | Template name |
| report_type | text | payment_trends / compliance_audit / provider_performance / revenue_analysis / transaction_summary |
| configuration | jsonb | Template config |
| is_system_template | boolean | System template flag |

---

### `saved_reports`
User-generated saved reports.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Report ID |
| user_id | uuid | FK to auth.users |
| template_id | uuid | FK to report_templates |
| report_name | text | Name |
| date_range_start / end | date | Range |
| report_data | jsonb | Generated data |

---

### `data_backup_schedules` / `data_backup_logs`
Backup configuration and execution logs. Schedules define backup jobs (type, frequency, retention); logs record each execution.

---

## Web3 / Wallet Integration

### `linked_wallets`
Crypto wallets linked to provider accounts for payouts.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Wallet ID |
| user_id | uuid | FK to auth.users |
| provider_id | uuid | FK to providers |
| wallet_address | text | On-chain address |
| blockchain_network | blockchain_network | ethereum / solana / polygon / base / arbitrum |
| wallet_label | text | Friendly name |
| verification_status | wallet_verification_status | pending / verified / failed / expired / revoked |
| is_primary_payout | boolean | Primary payout wallet |
| payout_enabled | boolean | Payouts enabled |
| min_payout_amount | numeric | Min payout threshold |
| payout_currency | text | Currency (default USDC) |

**Constraints:** Unique on (wallet_address, blockchain_network); only one primary per provider; EVM address format validation.

---

### `wallet_transactions`
Crypto payout transaction records.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Transaction ID |
| linked_wallet_id | uuid | FK to linked_wallets |
| provider_id | uuid | FK to providers |
| transaction_type | text | payout / refund / adjustment |
| amount | numeric | Crypto amount |
| currency | text | Token (USDC, etc.) |
| fiat_equivalent | numeric | USD equivalent |
| blockchain_network | blockchain_network | Network |
| tx_hash | text | On-chain transaction hash |
| block_number | bigint | Block number |
| gas_fee | numeric | Gas cost |
| status | text | pending / processing / confirmed / failed / cancelled |
| confirmations | integer | Block confirmations |
| invoice_ids | uuid[] | Related invoices |

---

### `wallet_verification_challenges`
Wallet ownership verification via message signing.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Challenge ID |
| user_id | uuid | FK to auth.users |
| wallet_address | text | Address to verify |
| challenge_message | text | Message to sign |
| nonce | text | Replay protection |
| signature | text | Submitted signature |
| status | text | pending / completed / expired / failed |
| expires_at | timestamptz | 15-minute expiry |

---

### `wallet_audit_log`
Audit trail for all wallet operations.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Log ID |
| user_id | uuid | FK to auth.users |
| provider_id | uuid | FK to providers |
| linked_wallet_id | uuid | FK to linked_wallets |
| action | text | wallet_linked / wallet_verified / payout_initiated / etc. |
| success | boolean | Outcome |
| ip_address | inet | Client IP |

---

## MedBed Features

### `med_beds`
MedBed and hyperbaric chamber equipment catalog.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Equipment ID |
| name | text | Equipment name |
| type | text | medbed / chamber |
| description | text | Description |
| hourly_rate | integer | Rate in cents |
| image_url | text | Image URL |
| is_active | boolean | Available for booking |

---

### `med_bed_bookings`
Booking records for MedBed sessions.

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Booking ID |
| user_id | uuid | FK to auth.users |
| med_bed_id | uuid | FK to med_beds |
| start_time | timestamptz | Session start |
| end_time | timestamptz | Session end |
| status | text | pending / confirmed / cancelled / completed |
| total_amount | integer | Amount in cents |
| payment_intent_id | text | Stripe payment intent |

---

## Storage Buckets

| Bucket | Public | Max Size | Allowed Types | Purpose |
|---|---|---|---|---|
| `avatars` | Yes | 5 MB | JPEG, PNG, GIF, WebP | Profile pictures |
| `provider-documents` | No | 50 MB | PDF, JPEG, PNG, DOC/DOCX | Provider onboarding docs |
| `medical-records` | No | 100 MB | PDF, JPEG, PNG, DICOM | HIPAA-sensitive records |
| `invoice-attachments` | No | 10 MB | PDF, JPEG, PNG | Invoice supporting docs |
| `dispute-evidence` | No | 50 MB | PDF, JPEG, PNG, MP4, MP3 | Dispute evidence files |
| `message-attachments` | No | 20 MB | PDF, JPEG, PNG, GIF, MP4 | Chat/message files |

All private buckets enforce RLS policies scoped to the owning user, with admin overrides where applicable.

---

*Generated from migration files 001–028. Last updated: February 2026.*
