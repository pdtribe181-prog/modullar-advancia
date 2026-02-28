# Advancia PayLedger — Database Schema

> Auto-generated on 2026-02-26 from 55 migration files.
> Re-generate: `npx tsx scripts/generate-schema-docs.ts`

---

## Table of Contents

| #   | Table                                                             | Columns | Migration                            |
| --- | ----------------------------------------------------------------- | ------- | ------------------------------------ |
| 1   | [access_audit_logs](#access_audit_logs)                           | 16      | 006_audit_compliance.sql             |
| 2   | [advanced_analytics_reports](#advanced_analytics_reports)         | 13      | 009_analytics_monitoring.sql         |
| 3   | [ai_command_logs](#ai_command_logs)                               | 7       | 048_port_missing_features.sql        |
| 4   | [analytics_insights](#analytics_insights)                         | 13      | 009_analytics_monitoring.sql         |
| 5   | [anomaly_alerts](#anomaly_alerts)                                 | 19      | 009_analytics_monitoring.sql         |
| 6   | [api_documentation_feedback](#api_documentation_feedback)         | 7       | 008_webhooks_api.sql                 |
| 7   | [api_key_permissions](#api_key_permissions)                       | 6       | 008_webhooks_api.sql                 |
| 8   | [api_key_rotation_history](#api_key_rotation_history)             | 7       | 008_webhooks_api.sql                 |
| 9   | [api_keys](#api_keys)                                             | 19      | 002_core_tables.sql                  |
| 10  | [api_usage_logs](#api_usage_logs)                                 | 12      | 008_webhooks_api.sql                 |
| 11  | [appointment_waitlist](#appointment_waitlist)                     | 12      | 014_storage_and_missing_features.sql |
| 12  | [appointments](#appointments)                                     | 14      | 003_transactions_invoices.sql        |
| 13  | [audit_access_controls](#audit_access_controls)                   | 17      | 006_audit_compliance.sql             |
| 14  | [audit_log_exports](#audit_log_exports)                           | 13      | 006_audit_compliance.sql             |
| 15  | [bank_connection_setup](#bank_connection_setup)                   | 16      | 007_provider_onboarding.sql          |
| 16  | [bank_wallet_verification](#bank_wallet_verification)             | 18      | 007_provider_onboarding.sql          |
| 17  | [brand_customization](#brand_customization)                       | 9       | 005_notifications_settings.sql       |
| 18  | [chargebacks](#chargebacks)                                       | 16      | 004_disputes_chargebacks.sql         |
| 19  | [claim_history](#claim_history)                                   | 8       | 024_additional_tables.sql            |
| 20  | [code_snippet_usage](#code_snippet_usage)                         | 6       | 008_webhooks_api.sql                 |
| 21  | [compliance_logs](#compliance_logs)                               | 14      | 006_audit_compliance.sql             |
| 22  | [compliance_status](#compliance_status)                           | 15      | 006_audit_compliance.sql             |
| 23  | [compliance_verification_steps](#compliance_verification_steps)   | 13      | 007_provider_onboarding.sql          |
| 24  | [compliance_violations](#compliance_violations)                   | 21      | 006_audit_compliance.sql             |
| 25  | [compliance_workflow_executions](#compliance_workflow_executions) | 8       | 006_audit_compliance.sql             |
| 26  | [compliance_workflow_rules](#compliance_workflow_rules)           | 14      | 006_audit_compliance.sql             |
| 27  | [crypto_transactions](#crypto_transactions)                       | 16      | 019_crypto_payments.sql              |
| 28  | [crypto_withdrawals](#crypto_withdrawals)                         | 9       | 048_port_missing_features.sql        |
| 29  | [custom_roles](#custom_roles)                                     | 9       | 002_core_tables.sql                  |
| 30  | [data_backup_logs](#data_backup_logs)                             | 10      | 009_analytics_monitoring.sql         |
| 31  | [data_backup_schedules](#data_backup_schedules)                   | 13      | 009_analytics_monitoring.sql         |
| 32  | [developer_portal_analytics](#developer_portal_analytics)         | 6       | 008_webhooks_api.sql                 |
| 33  | [dispute_evidence](#dispute_evidence)                             | 11      | 004_disputes_chargebacks.sql         |
| 34  | [dispute_notifications](#dispute_notifications)                   | 13      | 004_disputes_chargebacks.sql         |
| 35  | [dispute_timeline](#dispute_timeline)                             | 12      | 004_disputes_chargebacks.sql         |
| 36  | [disputes](#disputes)                                             | 22      | 004_disputes_chargebacks.sql         |
| 37  | [email_history](#email_history)                                   | 12      | 005_notifications_settings.sql       |
| 38  | [email_settings](#email_settings)                                 | 9       | 005_notifications_settings.sql       |
| 39  | [email_templates](#email_templates)                               | 13      | 002_core_tables.sql                  |
| 40  | [event_subscriptions](#event_subscriptions)                       | 7       | 008_webhooks_api.sql                 |
| 41  | [facilities](#facilities)                                         | 12      | 048_port_missing_features.sql        |
| 42  | [go_live_checklist](#go_live_checklist)                           | 11      | 007_provider_onboarding.sql          |
| 43  | [guided_onboarding_progress](#guided_onboarding_progress)         | 11      | 007_provider_onboarding.sql          |
| 44  | [hipaa_audit_log](#hipaa_audit_log)                               | 10      | 014_storage_and_missing_features.sql |
| 45  | [incident_activity_logs](#incident_activity_logs)                 | 9       | 010_security_permissions.sql         |
| 46  | [incident_responses](#incident_responses)                         | 20      | 010_security_permissions.sql         |
| 47  | [insurance_claims](#insurance_claims)                             | 22      | 014_storage_and_missing_features.sql |
| 48  | [integration_health_checks](#integration_health_checks)           | 14      | 009_analytics_monitoring.sql         |
| 49  | [integration_health_logs](#integration_health_logs)               | 7       | 009_analytics_monitoring.sql         |
| 50  | [invoice_disputes](#invoice_disputes)                             | 6       | 004_disputes_chargebacks.sql         |
| 51  | [invoice_items](#invoice_items)                                   | 7       | 003_transactions_invoices.sql        |
| 52  | [invoice_operations](#invoice_operations)                         | 10      | 003_transactions_invoices.sql        |
| 53  | [invoices](#invoices)                                             | 19      | 003_transactions_invoices.sql        |
| 54  | [lab_results](#lab_results)                                       | 20      | 014_storage_and_missing_features.sql |
| 55  | [linked_wallets](#linked_wallets)                                 | 18      | 021_wallet_integration.sql           |
| 56  | [med_bed_bookings](#med_bed_bookings)                             | 10      | 028_medbed_features.sql              |
| 57  | [med_bed_maintenance](#med_bed_maintenance)                       | 9       | 048_port_missing_features.sql        |
| 58  | [med_bed_schedules](#med_bed_schedules)                           | 7       | 048_port_missing_features.sql        |
| 59  | [med_beds](#med_beds)                                             | 9       | 028_medbed_features.sql              |
| 60  | [medical_records](#medical_records)                               | 15      | 003_transactions_invoices.sql        |
| 61  | [messages](#messages)                                             | 11      | 014_storage_and_missing_features.sql |
| 62  | [notification_preferences](#notification_preferences)             | 18      | 005_notifications_settings.sql       |
| 63  | [notification_queue](#notification_queue)                         | 14      | 023_cron_jobs.sql                    |
| 64  | [notifications](#notifications)                                   | 18      | 005_notifications_settings.sql       |
| 65  | [onboarding_checklist_items](#onboarding_checklist_items)         | 15      | 007_provider_onboarding.sql          |
| 66  | [onboarding_email_log](#onboarding_email_log)                     | 9       | 007_provider_onboarding.sql          |
| 67  | [onboarding_team_invitations](#onboarding_team_invitations)       | 12      | 007_provider_onboarding.sql          |
| 68  | [onboarding_workflow_steps](#onboarding_workflow_steps)           | 10      | 007_provider_onboarding.sql          |
| 69  | [organization_settings](#organization_settings)                   | 11      | 005_notifications_settings.sql       |
| 70  | [patient_consents](#patient_consents)                             | 12      | 014_storage_and_missing_features.sql |
| 71  | [patients](#patients)                                             | 18      | 002_core_tables.sql                  |
| 72  | [payment_history](#payment_history)                               | 13      | 003_transactions_invoices.sql        |
| 73  | [payment_methods](#payment_methods)                               | 21      | 003_transactions_invoices.sql        |
| 74  | [payment_plan_transactions](#payment_plan_transactions)           | 11      | 024_additional_tables.sql            |
| 75  | [payment_plans](#payment_plans)                                   | 23      | 024_additional_tables.sql            |
| 76  | [payment_preferences](#payment_preferences)                       | 11      | 005_notifications_settings.sql       |
| 77  | [performance_alerts](#performance_alerts)                         | 12      | 009_analytics_monitoring.sql         |
| 78  | [phi_access_log](#phi_access_log)                                 | 9       | 022_vault_encryption.sql             |
| 79  | [prescriptions](#prescriptions)                                   | 19      | 014_storage_and_missing_features.sql |
| 80  | [provider_compliance_records](#provider_compliance_records)       | 15      | 007_provider_onboarding.sql          |
| 81  | [provider_documents](#provider_documents)                         | 16      | 007_provider_onboarding.sql          |
| 82  | [provider_notes](#provider_notes)                                 | 8       | 007_provider_onboarding.sql          |
| 83  | [provider_onboarding](#provider_onboarding)                       | 18      | 007_provider_onboarding.sql          |
| 84  | [provider_payment_volumes](#provider_payment_volumes)             | 12      | 007_provider_onboarding.sql          |
| 85  | [provider_performance_metrics](#provider_performance_metrics)     | 13      | 007_provider_onboarding.sql          |
| 86  | [provider_reviews](#provider_reviews)                             | 16      | 014_storage_and_missing_features.sql |
| 87  | [providers](#providers)                                           | 16      | 002_core_tables.sql                  |
| 88  | [recurring_billing](#recurring_billing)                           | 18      | 003_transactions_invoices.sql        |
| 89  | [report_templates](#report_templates)                             | 9       | 009_analytics_monitoring.sql         |
| 90  | [risk_detections](#risk_detections)                               | 16      | 010_security_permissions.sql         |
| 91  | [role_permission_templates](#role_permission_templates)           | 6       | 010_security_permissions.sql         |
| 92  | [sandbox_sessions](#sandbox_sessions)                             | 14      | 008_webhooks_api.sql                 |
| 93  | [saved_reports](#saved_reports)                                   | 11      | 009_analytics_monitoring.sql         |
| 94  | [security_events](#security_events)                               | 9       | 025_security_preferences.sql         |
| 95  | [security_threat_logs](#security_threat_logs)                     | 16      | 010_security_permissions.sql         |
| 96  | [services](#services)                                             | 14      | 024_additional_tables.sql            |
| 97  | [settings_activity_log](#settings_activity_log)                   | 9       | 005_notifications_settings.sql       |
| 98  | [stripe_webhook_events](#stripe_webhook_events)                   | 6       | 015_stripe_integration.sql           |
| 99  | [system_config](#system_config)                                   | 5       | 049_system_config.sql                |
| 100 | [system_performance_metrics](#system_performance_metrics)         | 11      | 009_analytics_monitoring.sql         |
| 101 | [team_invitations](#team_invitations)                             | 12      | 005_notifications_settings.sql       |
| 102 | [transaction_flow_metrics](#transaction_flow_metrics)             | 11      | 009_analytics_monitoring.sql         |
| 103 | [transaction_permissions](#transaction_permissions)               | 17      | 010_security_permissions.sql         |
| 104 | [transactions](#transactions)                                     | 17      | 003_transactions_invoices.sql        |
| 105 | [user_permissions](#user_permissions)                             | 8       | 010_security_permissions.sql         |
| 106 | [user_profiles](#user_profiles)                                   | 10      | 002_core_tables.sql                  |
| 107 | [user_role_assignments](#user_role_assignments)                   | 9       | 010_security_permissions.sql         |
| 108 | [vector_memory](#vector_memory)                                   | 5       | 048_port_missing_features.sql        |
| 109 | [wallet_audit_log](#wallet_audit_log)                             | 11      | 021_wallet_integration.sql           |
| 110 | [wallet_transactions](#wallet_transactions)                       | 23      | 021_wallet_integration.sql           |
| 111 | [wallet_verification_challenges](#wallet_verification_challenges) | 13      | 021_wallet_integration.sql           |
| 112 | [webhook_delivery_attempts](#webhook_delivery_attempts)           | 14      | 008_webhooks_api.sql                 |
| 113 | [webhook_delivery_logs](#webhook_delivery_logs)                   | 14      | 008_webhooks_api.sql                 |
| 114 | [webhook_endpoints](#webhook_endpoints)                           | 12      | 002_core_tables.sql                  |
| 115 | [webhook_events](#webhook_events)                                 | 6       | 008_webhooks_api.sql                 |
| 116 | [webhook_retry_policies](#webhook_retry_policies)                 | 10      | 008_webhooks_api.sql                 |
| 117 | [webhook_settings](#webhook_settings)                             | 9       | 008_webhooks_api.sql                 |
| 118 | [webhook_test_logs](#webhook_test_logs)                           | 13      | 008_webhooks_api.sql                 |
| 119 | [webhooks](#webhooks)                                             | 13      | 002_core_tables.sql                  |

---

## Enums

### api_environment

_Defined in 001_extensions_and_enums.sql_

Values: `sandbox`, `production`

### api_key_status

_Defined in 001_extensions_and_enums.sql_

Values: `active`, `inactive`, `revoked`, `expired`

### appointment_status

_Defined in 001_extensions_and_enums.sql_

Values: `scheduled`, `completed`, `cancelled`, `no_show`, `rescheduled`

### audit_access_level

_Defined in 001_extensions_and_enums.sql_

Values: `none`, `read`, `write`, `admin`

### bank_verification_status

_Defined in 001_extensions_and_enums.sql_

Values: `not_started`, `pending`, `verified`, `failed`

### chargeback_status

_Defined in 001_extensions_and_enums.sql_

Values: `pending`, `won`, `lost`, `in_review`

### delivery_status

_Defined in 001_extensions_and_enums.sql_

Values: `pending`, `delivered`, `failed`, `retrying`

### dispute_reason

_Defined in 001_extensions_and_enums.sql_

Values: `fraud`, `duplicate`, `product_not_received`, `service_not_provided`, `other`

### dispute_status

_Defined in 001_extensions_and_enums.sql_

Values: `new`, `under_review`, `resolved`, `rejected`

### document_status

_Defined in 001_extensions_and_enums.sql_

Values: `pending_upload`, `uploaded`, `reviewed`, `approved`, `rejected`, `expired`

### email_status

_Defined in 001_extensions_and_enums.sql_

Values: `pending`, `sent`, `failed`, `opened`, `clicked`

### email_template_type

_Defined in 001_extensions_and_enums.sql_

Values: `invoice`, `payment`, `reminder`, `notification`, `marketing`, `system`

### frequency

_Defined in 001_extensions_and_enums.sql_

Values: `daily`, `weekly`, `monthly`, `yearly`

### incident_severity

_Defined in 001_extensions_and_enums.sql_

Values: `low`, `medium`, `high`, `critical`

### incident_status

_Defined in 001_extensions_and_enums.sql_

Values: `open`, `acknowledged`, `resolved`, `closed`

### incident_type

_Defined in 001_extensions_and_enums.sql_

Values: `security`, `compliance`, `operational`, `other`

### invitation_status

_Defined in 001_extensions_and_enums.sql_

Values: `pending`, `accepted`, `expired`, `cancelled`, `declined`

### invoice_operation_type

_Defined in 001_extensions_and_enums.sql_

Values: `created`, `updated`, `sent`, `paid`, `cancelled`, `refunded`

### invoice_status

_Defined in 001_extensions_and_enums.sql_

Values: `draft`, `sent`, `paid`, `overdue`, `cancelled`, `refunded`

### method_type

_Defined in 001_extensions_and_enums.sql_

Values: `card`, `bank_account`, `wallet`

### notification_priority

_Defined in 001_extensions_and_enums.sql_

Values: `low`, `medium`, `high`, `critical`

### notification_read_status

_Defined in 001_extensions_and_enums.sql_

Values: `unread`, `read`, `archived`

### notification_type

_Defined in 001_extensions_and_enums.sql_

Values: `system`, `transaction`, `security`, `compliance`, `marketing`

### onboarding_status

_Defined in 001_extensions_and_enums.sql_

Values: `pending`, `in_progress`, `completed`, `rejected`

### onboarding_step_status

_Defined in 001_extensions_and_enums.sql_

Values: `not_started`, `in_progress`, `completed`, `skipped`

### payment_method_type

_Defined in 001_extensions_and_enums.sql_

Values: `credit_card`, `debit_card`, `bank_transfer`, `upi`, `wallet`

### payment_status

_Defined in 001_extensions_and_enums.sql_

Values: `pending`, `completed`, `failed`, `refunded`, `cancelled`

### permission_type

_Defined in 001_extensions_and_enums.sql_

Values: `read`, `write`, `delete`, `admin`

### recurring_status

_Defined in 001_extensions_and_enums.sql_

Values: `active`, `paused`, `cancelled`, `completed`

### resolution_outcome

_Defined in 001_extensions_and_enums.sql_

Values: `won`, `lost`, `partial`, `withdrawn`

### retry_strategy

_Defined in 001_extensions_and_enums.sql_

Values: `exponential`, `linear`, `fixed`

### transaction_type

_Defined in 001_extensions_and_enums.sql_

Values: `payment`, `refund`, `chargeback`, `transfer`, `adjustment`

### user_role

_Defined in 001_extensions_and_enums.sql_

Values: `patient`, `provider`, `admin`, `staff`

### verification_status

_Defined in 001_extensions_and_enums.sql_

Values: `not_started`, `pending`, `verified`, `failed`

### webhook_event_type

_Defined in 001_extensions_and_enums.sql_

Values: `payment.created`, `payment.completed`, `payment.failed`, `invoice.created`, `invoice.paid`, `dispute.created`, `dispute.resolved`

### webhook_status

_Defined in 001_extensions_and_enums.sql_

Values: `active`, `inactive`, `failed`

### crypto_transaction_status

_Defined in 019_crypto_payments.sql_

Values: `pending`, `confirmed`, `failed`, `delayed`, `resolved`, `canceled`, `expired`

### blockchain_network

_Defined in 021_wallet_integration.sql_

Values: `ethereum`, `solana`, `polygon`, `base`, `arbitrum`

### wallet_verification_status

_Defined in 021_wallet_integration.sql_

Values: `pending`, `verified`, `failed`, `expired`, `revoked`

### payment_plan_status

_Defined in 024_additional_tables.sql_

Values: `active`, `completed`, `paused`, `cancelled`, `defaulted`

### payment_frequency

_Defined in 024_additional_tables.sql_

Values: `weekly`, `biweekly`, `monthly`, `quarterly`

### claim_status

_Defined in 024_additional_tables.sql_

Values: `draft`, `submitted`, `pending`, `in_review`, `approved`, `partially_approved`, `denied`, `appealed`, `paid`, `closed`

### payment_plan_status

_Defined in 024b_additional_tables_clean.sql_

Values: `active`, `completed`, `paused`, `cancelled`, `defaulted`

### payment_frequency

_Defined in 024b_additional_tables_clean.sql_

Values: `weekly`, `biweekly`, `monthly`, `quarterly`

### claim_status

_Defined in 024b_additional_tables_clean.sql_

Values: `draft`, `submitted`, `pending`, `in_review`, `approved`, `partially_approved`, `denied`, `appealed`, `paid`, `closed`

### crypto_transaction_status

_Defined in 032_create_missing_tables.sql_

Values: `pending`, `confirmed`, `failed`, `expired`, `refunded`

### blockchain_network

_Defined in 032_create_missing_tables.sql_

Values: `ethereum`, `polygon`, `base`, `arbitrum`, `solana`

### wallet_verification_status

_Defined in 032_create_missing_tables.sql_

Values: `pending`, `verified`, `rejected`, `expired`

### payment_frequency

_Defined in 032_create_missing_tables.sql_

Values: `weekly`, `biweekly`, `monthly`, `quarterly`

### payment_plan_status

_Defined in 032_create_missing_tables.sql_

Values: `active`, `completed`, `defaulted`, `cancelled`, `paused`

### claim_status

_Defined in 032_create_missing_tables.sql_

Values: `draft`, `submitted`, `in_review`, `approved`, `denied`, `appealed`, `paid`, `closed`

### facility_type

_Defined in 048_port_missing_features.sql_

Values: `HOSPITAL`, `CLINIC`, `LABORATORY`, `IMAGING_CENTER`

### withdrawal_status

_Defined in 048_port_missing_features.sql_

Values: `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `FAILED`

### ai_status

_Defined in 048_port_missing_features.sql_

Values: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

---

## Tables

### access_audit_logs

_Defined in 006_audit_compliance.sql_

**Primary Key:** `id`

| Column          | Type                                               | Nullable | Default           | Constraints |
| --------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id              | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id         | uuid                                               | YES      |                   |             |
| action          | text NOT NULL                                      | NO       |                   |             |
| resource_type   | text NOT NULL                                      | NO       |                   |             |
| resource_id     | uuid                                               | YES      |                   |             |
| access_granted  | boolean DEFAULT true                               | YES      | true              |             |
| denial_reason   | text                                               | YES      |                   |             |
| ip_address      | text                                               | YES      |                   |             |
| user_agent      | text                                               | YES      |                   |             |
| session_id      | text                                               | YES      |                   |             |
| request_method  | text                                               | YES      |                   |             |
| request_path    | text                                               | YES      |                   |             |
| response_status | integer                                            | YES      |                   |             |
| duration_ms     | integer                                            | YES      |                   |             |
| metadata        | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at      | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_access_audit_logs_user_id` on (user_id)
- `idx_access_audit_logs_created_at` on (created_at DESC)
- `idx_access_audit_logs_resource_type` on (resource_type)

### advanced_analytics_reports

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column               | Type                                                                                                                                              | Nullable | Default           | Constraints |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- | ----------- |
| id                   | uuid NOT NULL DEFAULT gen_random_uuid()                                                                                                           | NO       | gen_random_uuid() |             |
| report_name          | text NOT NULL                                                                                                                                     | NO       |                   |             |
| report_type          | text NOT NULL                                                                                                                                     | NO       |                   |             |
| description          | text                                                                                                                                              | YES      |                   |             |
| data_sources         | text[]                                                                                                                                            | YES      |                   |             |
| query_config         | jsonb DEFAULT                                                                                                                                     | YES      | '{}'::jsonb       |             |
| visualization_config | jsonb DEFAULT                                                                                                                                     | YES      | '{}'::jsonb       |             |
| schedule_frequency   | text CHECK (schedule_frequency = ANY (ARRAY['realtime'::text, 'hourly'::text, 'daily'::text, 'weekly'::text, 'monthly'::text, 'on_demand'::text]) | YES      |                   |             |
| is_active            | boolean DEFAULT true                                                                                                                              | YES      | true              |             |
| last_generated_at    | timestamp with time zone                                                                                                                          | YES      |                   |             |
| created_by           | uuid                                                                                                                                              | YES      |                   |             |
| created_at           | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                                                                | YES      | CURRENT_TIMESTAMP |             |
| updated_at           | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                                                                | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)

### ai_command_logs

_Defined in 048_port_missing_features.sql_

**Primary Key:** `id`

| Column     | Type                                        | Nullable | Default            | Constraints         |
| ---------- | ------------------------------------------- | -------- | ------------------ | ------------------- |
| id         | UUID PRIMARY KEY DEFAULT uuid_generate_v4() | YES      | uuid_generate_v4() | PRIMARY KEY         |
| user_id    | UUID NOT NULL REFERENCES auth               | NO       |                    | FK → auth.users(id) |
| model      | TEXT NOT NULL                               | NO       |                    |                     |
| input      | JSONB NOT NULL                              | NO       |                    |                     |
| output     | JSONB                                       | YES      |                    |                     |
| status     | ai_status DEFAULT                           | YES      | 'PENDING'          |                     |
| created_at | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |                     |

**Indexes:**

- `idx_ai_command_logs_user_id` on (user_id)

### analytics_insights

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column              | Type                                                                                                | Nullable | Default           | Constraints |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------- | ----------------- | ----------- |
| id                  | uuid NOT NULL DEFAULT gen_random_uuid()                                                             | NO       | gen_random_uuid() |             |
| insight_type        | text NOT NULL                                                                                       | NO       |                   |             |
| insight_category    | text NOT NULL                                                                                       | NO       |                   |             |
| insight_title       | text NOT NULL                                                                                       | NO       |                   |             |
| insight_description | text NOT NULL                                                                                       | NO       |                   |             |
| confidence_score    | numeric CHECK (confidence_score >= 0 AND confidence_score <= 100)                                   | YES      |                   |             |
| impact_level        | text CHECK (impact_level = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text]) | YES      |                   |             |
| recommended_actions | jsonb DEFAULT                                                                                       | YES      | '[]'::jsonb       |             |
| data_points         | jsonb DEFAULT                                                                                       | YES      | '{}'::jsonb       |             |
| status              | text DEFAULT                                                                                        | YES      | 'new'::text       |             |
| reviewed_by         | uuid                                                                                                | YES      |                   |             |
| reviewed_at         | timestamp with time zone                                                                            | YES      |                   |             |
| created_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                  | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id)

### anomaly_alerts

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column                 | Type                                                                                                                                                                     | Nullable | Default            | Constraints |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------ | ----------- |
| id                     | uuid NOT NULL DEFAULT uuid_generate_v4()                                                                                                                                 | NO       | uuid_generate_v4() |             |
| anomaly_type           | text NOT NULL CHECK (anomaly_type = ANY (ARRAY['transaction_volume'::text, 'access_pattern'::text, 'data_access'::text, 'system_behavior'::text, 'user_activity'::text]) | NO       |                    |             |
| severity               | text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])                                                                 | NO       |                    |             |
| alert_title            | text NOT NULL                                                                                                                                                            | NO       |                    |             |
| alert_message          | text NOT NULL                                                                                                                                                            | NO       |                    |             |
| baseline_value         | numeric                                                                                                                                                                  | YES      |                    |             |
| detected_value         | numeric                                                                                                                                                                  | YES      |                    |             |
| deviation_percentage   | numeric                                                                                                                                                                  | YES      |                    |             |
| affected_resource_type | text                                                                                                                                                                     | YES      |                    |             |
| affected_resource_id   | uuid                                                                                                                                                                     | YES      |                    |             |
| detection_timestamp    | timestamp with time zone DEFAULT now()                                                                                                                                   | YES      | now()              |             |
| status                 | text NOT NULL DEFAULT                                                                                                                                                    | NO       | 'new'::text        |             |
| acknowledged_by        | uuid                                                                                                                                                                     | YES      |                    |             |
| acknowledged_at        | timestamp with time zone                                                                                                                                                 | YES      |                    |             |
| resolution_notes       | text                                                                                                                                                                     | YES      |                    |             |
| resolved_at            | timestamp with time zone                                                                                                                                                 | YES      |                    |             |
| metadata               | jsonb DEFAULT                                                                                                                                                            | YES      | '{}'::jsonb        |             |
| created_at             | timestamp with time zone DEFAULT now()                                                                                                                                   | YES      | now()              |             |
| updated_at             | timestamp with time zone DEFAULT now()                                                                                                                                   | YES      | now()              |             |

**Foreign Keys:**

- FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id)

**Indexes:**

- `idx_anomaly_alerts_status` on (status)
- `idx_anomaly_alerts_severity` on (severity)

### api_documentation_feedback

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column        | Type                                               | Nullable | Default           | Constraints |
| ------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id            | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id       | uuid                                               | YES      |                   |             |
| page_section  | text NOT NULL                                      | NO       |                   |             |
| rating        | integer CHECK (rating >= 1 AND rating <= 5)        | YES      |                   |             |
| feedback_text | text                                               | YES      |                   |             |
| is_helpful    | boolean                                            | YES      |                   |             |
| created_at    | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

### api_key_permissions

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column          | Type                                    | Nullable | Default           | Constraints |
| --------------- | --------------------------------------- | -------- | ----------------- | ----------- |
| id              | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| api_key_id      | uuid                                    | YES      |                   |             |
| permission_name | text NOT NULL                           | NO       |                   |             |
| resource_type   | text                                    | YES      |                   |             |
| allowed_actions | text[]                                  | YES      |                   |             |
| created_at      | timestamp with time zone DEFAULT now()  | YES      | now()             |             |

**Foreign Keys:**

- FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id)

**Indexes:**

- `idx_api_key_permissions_api_key_id` on (api_key_id)

### api_key_rotation_history

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column         | Type                                               | Nullable | Default           | Constraints |
| -------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id             | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| api_key_id     | uuid                                               | YES      |                   |             |
| old_key_prefix | text NOT NULL                                      | NO       |                   |             |
| new_key_prefix | text NOT NULL                                      | NO       |                   |             |
| rotated_by     | uuid                                               | YES      |                   |             |
| reason         | text                                               | YES      |                   |             |
| rotated_at     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id)
- FOREIGN KEY (rotated_by) REFERENCES public.user_profiles(id)

### api_keys

_Defined in 002_core_tables.sql_

**Primary Key:** `id`

| Column          | Type                                               | Nullable | Default                    | Constraints |
| --------------- | -------------------------------------------------- | -------- | -------------------------- | ----------- |
| id              | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()          |             |
| user_id         | uuid                                               | YES      |                            |             |
| name            | text NOT NULL                                      | NO       |                            |             |
| key_hash        | text NOT NULL UNIQUE                               | NO       |                            | UNIQUE      |
| key_prefix      | text NOT NULL                                      | NO       |                            |             |
| environment     | api_environment DEFAULT                            | YES      | 'sandbox'::api_environment |             |
| status          | api_key_status DEFAULT                             | YES      | 'active'::api_key_status   |             |
| permissions     | jsonb DEFAULT                                      | YES      | '["read"]'::jsonb          |             |
| rate_limit      | integer DEFAULT 1000                               | YES      | 1000                       |             |
| requests_today  | integer DEFAULT 0                                  | YES      | 0                          |             |
| total_requests  | integer DEFAULT 0                                  | YES      | 0                          |             |
| last_used_at    | timestamp with time zone                           | YES      |                            |             |
| last_used_ip    | text                                               | YES      |                            |             |
| expires_at      | timestamp with time zone                           | YES      |                            |             |
| created_at      | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP          |             |
| updated_at      | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP          |             |
| key             | text                                               | YES      |                            |             |
| description     | text                                               | YES      |                            |             |
| last_rotated_at | timestamp with time zone                           | YES      |                            |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_api_keys_user_id` on (user_id)
- `idx_api_keys_status` on (status)

### api_usage_logs

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column           | Type                                               | Nullable | Default           | Constraints |
| ---------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| api_key_id       | uuid                                               | YES      |                   |             |
| endpoint         | text NOT NULL                                      | NO       |                   |             |
| method           | text NOT NULL                                      | NO       |                   |             |
| status_code      | integer NOT NULL                                   | NO       |                   |             |
| response_time_ms | integer                                            | YES      |                   |             |
| ip_address       | text                                               | YES      |                   |             |
| user_agent       | text                                               | YES      |                   |             |
| request_body     | jsonb                                              | YES      |                   |             |
| response_body    | jsonb                                              | YES      |                   |             |
| error_message    | text                                               | YES      |                   |             |
| created_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id)

**Indexes:**

- `idx_api_usage_logs_api_key_id` on (api_key_id)
- `idx_api_usage_logs_created_at` on (created_at DESC)

### appointment_waitlist

_Defined in 014_storage_and_missing_features.sql_

**Primary Key:** `id`

| Column           | Type                                       | Nullable | Default           | Constraints               |
| ---------------- | ------------------------------------------ | -------- | ----------------- | ------------------------- |
| id               | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY               |
| patient_id       | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.patients(id)  |
| provider_id      | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.providers(id) |
| preferred_dates  | jsonb DEFAULT                              | YES      | '[]'::jsonb       |                           |
| preferred_times  | jsonb DEFAULT                              | YES      | '[]'::jsonb       |                           |
| reason_for_visit | text                                       | YES      |                   |                           |
| urgency          | text DEFAULT                               | YES      | 'normal'          |                           |
| status           | text DEFAULT                               | YES      | 'waiting'         |                           |
| notified_at      | timestamp with time zone                   | YES      |                   |                           |
| expires_at       | timestamp with time zone                   | YES      |                   |                           |
| created_at       | timestamp with time zone DEFAULT now()     | YES      | now()             |                           |
| updated_at       | timestamp with time zone DEFAULT now()     | YES      | now()             |                           |

**Indexes:**

- `idx_appointment_waitlist_patient_id` on (patient_id)
- `idx_appointment_waitlist_provider_id` on (provider_id)
- `idx_appointment_waitlist_status` on (status)

### appointments

_Defined in 003_transactions_invoices.sql_

**Primary Key:** `id`

| Column             | Type                                               | Nullable | Default                         | Constraints |
| ------------------ | -------------------------------------------------- | -------- | ------------------------------- | ----------- |
| id                 | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()               |             |
| patient_id         | uuid                                               | YES      |                                 |             |
| provider_id        | uuid                                               | YES      |                                 |             |
| appointment_date   | date NOT NULL                                      | NO       |                                 |             |
| appointment_time   | time without time zone NOT NULL                    | NO       |                                 |             |
| duration_minutes   | integer DEFAULT 30                                 | YES      | 30                              |             |
| status             | appointment_status DEFAULT                         | YES      | 'scheduled'::appointment_status |             |
| reason_for_visit   | text                                               | YES      |                                 |             |
| notes              | text                                               | YES      |                                 |             |
| prescription       | jsonb DEFAULT                                      | YES      | '[]'::jsonb                     |             |
| follow_up_required | boolean DEFAULT false                              | YES      | false                           |             |
| follow_up_date     | date                                               | YES      |                                 |             |
| created_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP               |             |
| updated_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP               |             |

**Foreign Keys:**

- FOREIGN KEY (patient_id) REFERENCES public.patients(id)
- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_appointments_status_date` on (status, appointment_date)
- `idx_appointments_patient_id` on (patient_id)
- `idx_appointments_provider_id` on (provider_id)
- `idx_appointments_provider_date` on (provider_id, appointment_date)
- `idx_appointments_time` on (appointment_time)
- `idx_appointments_payment_status` on (payment_status)
- `idx_appointments_date` on (appointment_date)
- `idx_appointments_slot_check` on (provider_id, appointment_date, appointment_time, status)
- `idx_appointments_provider_schedule` on (provider_id, status, appointment_date)

### audit_access_controls

_Defined in 006_audit_compliance.sql_

**Primary Key:** `id`

| Column                   | Type                                               | Nullable | Default                    | Constraints |
| ------------------------ | -------------------------------------------------- | -------- | -------------------------- | ----------- |
| id                       | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()          |             |
| user_id                  | uuid UNIQUE                                        | YES      |                            | UNIQUE      |
| custom_role_id           | uuid                                               | YES      |                            |             |
| access_level             | audit_access_level DEFAULT                         | YES      | 'none'::audit_access_level |             |
| can_view_compliance_logs | boolean DEFAULT false                              | YES      | false                      |             |
| can_view_user_actions    | boolean DEFAULT false                              | YES      | false                      |             |
| can_view_system_logs     | boolean DEFAULT false                              | YES      | false                      |             |
| can_export_audit_data    | boolean DEFAULT false                              | YES      | false                      |             |
| can_delete_audit_logs    | boolean DEFAULT false                              | YES      | false                      |             |
| resource_restrictions    | jsonb DEFAULT                                      | YES      | '{}'::jsonb                |             |
| time_range_restrictions  | jsonb DEFAULT                                      | YES      | '{}'::jsonb                |             |
| granted_by               | uuid                                               | YES      |                            |             |
| granted_at               | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP          |             |
| expires_at               | timestamp with time zone                           | YES      |                            |             |
| is_active                | boolean DEFAULT true                               | YES      | true                       |             |
| created_at               | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP          |             |
| updated_at               | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP          |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
- FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id)
- FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id)

### audit_log_exports

_Defined in 006_audit_compliance.sql_

**Primary Key:** `id`

| Column           | Type                                                                                   | Nullable | Default            | Constraints |
| ---------------- | -------------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| id               | uuid NOT NULL DEFAULT uuid_generate_v4()                                               | NO       | uuid_generate_v4() |             |
| user_id          | uuid NOT NULL                                                                          | NO       |                    |             |
| export_type      | text NOT NULL CHECK (export_type = ANY (ARRAY['csv'::text, 'pdf'::text, 'json'::text]) | NO       |                    |             |
| date_range_start | date NOT NULL                                                                          | NO       |                    |             |
| date_range_end   | date NOT NULL                                                                          | NO       |                    |             |
| filters          | jsonb DEFAULT                                                                          | YES      | '{}'::jsonb        |             |
| status           | text NOT NULL DEFAULT                                                                  | NO       | 'pending'::text    |             |
| file_url         | text                                                                                   | YES      |                    |             |
| file_size_bytes  | bigint                                                                                 | YES      |                    |             |
| record_count     | integer                                                                                | YES      |                    |             |
| error_message    | text                                                                                   | YES      |                    |             |
| created_at       | timestamp with time zone DEFAULT now()                                                 | YES      | now()              |             |
| completed_at     | timestamp with time zone                                                               | YES      |                    |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES auth.users(id)

### bank_connection_setup

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column                | Type                                                                                                           | Nullable | Default             | Constraints |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | -------- | ------------------- | ----------- |
| id                    | uuid NOT NULL DEFAULT gen_random_uuid()                                                                        | NO       | gen_random_uuid()   |             |
| provider_id           | uuid NOT NULL                                                                                                  | NO       |                     |             |
| connection_type       | text NOT NULL CHECK (connection_type = ANY (ARRAY['bank_account'::text, 'digital_wallet'::text, 'card'::text]) | NO       |                     |             |
| connection_status     | text NOT NULL DEFAULT                                                                                          | NO       | 'not_started'::text |             |
| account_holder_name   | text                                                                                                           | YES      |                     |             |
| account_last4         | text                                                                                                           | YES      |                     |             |
| bank_name             | text                                                                                                           | YES      |                     |             |
| routing_number        | text                                                                                                           | YES      |                     |             |
| wallet_address        | text                                                                                                           | YES      |                     |             |
| wallet_type           | text                                                                                                           | YES      |                     |             |
| verification_method   | text                                                                                                           | YES      |                     |             |
| verification_attempts | integer DEFAULT 0                                                                                              | YES      | 0                   |             |
| verified_at           | timestamp with time zone                                                                                       | YES      |                     |             |
| metadata              | jsonb DEFAULT                                                                                                  | YES      | '{}'::jsonb         |             |
| created_at            | timestamp with time zone DEFAULT now()                                                                         | YES      | now()               |             |
| updated_at            | timestamp with time zone DEFAULT now()                                                                         | YES      | now()               |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_bank_connection_setup_provider_id` on (provider_id)

### bank_wallet_verification

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column                | Type                                               | Nullable | Default                                 | Constraints |
| --------------------- | -------------------------------------------------- | -------- | --------------------------------------- | ----------- |
| id                    | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()                       |             |
| provider_id           | uuid NOT NULL                                      | NO       |                                         |             |
| account_type          | text NOT NULL                                      | NO       |                                         |             |
| account_holder_name   | text NOT NULL                                      | NO       |                                         |             |
| account_number_last4  | text                                               | YES      |                                         |             |
| routing_number        | text                                               | YES      |                                         |             |
| bank_name             | text                                               | YES      |                                         |             |
| wallet_address        | text                                               | YES      |                                         |             |
| wallet_type           | text                                               | YES      |                                         |             |
| verification_status   | bank_verification_status DEFAULT                   | YES      | 'not_started'::bank_verification_status |             |
| verification_method   | text                                               | YES      |                                         |             |
| micro_deposit_amount1 | numeric                                            | YES      |                                         |             |
| micro_deposit_amount2 | numeric                                            | YES      |                                         |             |
| verification_attempts | integer DEFAULT 0                                  | YES      | 0                                       |             |
| verified_at           | timestamp with time zone                           | YES      |                                         |             |
| metadata              | jsonb DEFAULT                                      | YES      | '{}'::jsonb                             |             |
| created_at            | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP                       |             |
| updated_at            | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP                       |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_bank_wallet_verification_provider_id` on (provider_id)

### brand_customization

_Defined in 005_notifications_settings.sql_

**Primary Key:** `id`

| Column          | Type                                    | Nullable | Default                   | Constraints |
| --------------- | --------------------------------------- | -------- | ------------------------- | ----------- |
| id              | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid()         |             |
| user_id         | uuid NOT NULL UNIQUE                    | NO       |                           | UNIQUE      |
| logo_url        | text                                    | YES      |                           |             |
| secondary_color | text DEFAULT                            | YES      | '#2563eb'::text           |             |
| accent_color    | text DEFAULT                            | YES      | '#14b8a6'::text           |             |
| font_family     | text DEFAULT                            | YES      | 'Plus Jakarta Sans'::text |             |
| custom_css      | text                                    | YES      |                           |             |
| created_at      | timestamptz DEFAULT now()               | YES      | now()                     |             |
| updated_at      | timestamptz DEFAULT now()               | YES      | now()                     |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES auth.users(id)

### chargebacks

_Defined in 004_disputes_chargebacks.sql_

**Primary Key:** `id`

| Column              | Type                                               | Nullable | Default                      | Constraints |
| ------------------- | -------------------------------------------------- | -------- | ---------------------------- | ----------- |
| id                  | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()            |             |
| dispute_id          | uuid                                               | YES      |                              |             |
| chargeback_number   | text NOT NULL UNIQUE                               | NO       |                              | UNIQUE      |
| status              | chargeback_status DEFAULT                          | YES      | 'pending'::chargeback_status |             |
| amount              | numeric NOT NULL                                   | NO       |                              |             |
| currency            | text DEFAULT                                       | YES      | 'INR'::text                  |             |
| reason_code         | text                                               | YES      |                              |             |
| chargeback_date     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP            |             |
| response_due_date   | timestamp with time zone                           | YES      |                              |             |
| resolved_date       | timestamp with time zone                           | YES      |                              |             |
| processor_reference | text                                               | YES      |                              |             |
| processor_response  | text                                               | YES      |                              |             |
| chargeback_fee      | numeric DEFAULT 0                                  | YES      | 0.00                         |             |
| metadata            | jsonb DEFAULT                                      | YES      | '{}'::jsonb                  |             |
| created_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP            |             |
| updated_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP            |             |

**Foreign Keys:**

- FOREIGN KEY (dispute_id) REFERENCES public.disputes(id)

**Indexes:**

- `idx_chargebacks_dispute_id` on (dispute_id)
- `idx_chargebacks_status` on (status)

### claim_history

_Defined in 024_additional_tables.sql_

**Primary Key:** `id`

| Column          | Type                                       | Nullable | Default           | Constraints                      |
| --------------- | ------------------------------------------ | -------- | ----------------- | -------------------------------- |
| id              | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY                      |
| claim_id        | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.insurance_claims(id) |
| previous_status | claim_status                               | YES      |                   |                                  |
| new_status      | claim_status NOT NULL                      | NO       |                   |                                  |
| action          | text NOT NULL                              | NO       |                   |                                  |
| notes           | text                                       | YES      |                   |                                  |
| changed_by      | uuid REFERENCES public                     | YES      |                   | FK → public.user_profiles(id)    |
| created_at      | timestamptz DEFAULT now()                  | YES      | now()             |                                  |

**Indexes:**

- `idx_claim_history_claim` on (claim_id)
- `idx_claim_history_claim` on (claim_id)
- `idx_claim_history_claim` on (claim_id)

### code_snippet_usage

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column     | Type                                                                                    | Nullable | Default           | Constraints |
| ---------- | --------------------------------------------------------------------------------------- | -------- | ----------------- | ----------- |
| id         | uuid NOT NULL DEFAULT gen_random_uuid()                                                 | NO       | gen_random_uuid() |             |
| user_id    | uuid                                                                                    | YES      |                   |             |
| snippet_id | text NOT NULL                                                                           | NO       |                   |             |
| language   | text NOT NULL                                                                           | NO       |                   |             |
| action     | text NOT NULL CHECK (action = ANY (ARRAY['view'::text, 'copy'::text, 'download'::text]) | NO       |                   |             |
| created_at | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                      | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

### compliance_logs

_Defined in 006_audit_compliance.sql_

**Primary Key:** `id`

| Column          | Type                                               | Nullable | Default           | Constraints |
| --------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id              | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id         | uuid                                               | YES      |                   |             |
| action          | text NOT NULL                                      | NO       |                   |             |
| resource_type   | text NOT NULL                                      | NO       |                   |             |
| resource_id     | uuid                                               | YES      |                   |             |
| ip_address      | text                                               | YES      |                   |             |
| user_agent      | text                                               | YES      |                   |             |
| details         | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at      | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| status          | text DEFAULT                                       | YES      | 'success'::text   |             |
| error_message   | text                                               | YES      |                   |             |
| request_method  | text                                               | YES      |                   |             |
| request_path    | text                                               | YES      |                   |             |
| response_status | integer                                            | YES      |                   |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_compliance_logs_user_id` on (user_id)
- `idx_compliance_logs_created_at` on (created_at DESC)
- `idx_compliance_logs_action` on (action)

### compliance_status

_Defined in 006_audit_compliance.sql_

**Primary Key:** `id`

| Column                | Type                                                                                                                           | Nullable | Default            | Constraints |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------ | ----------- |
| id                    | uuid NOT NULL DEFAULT uuid_generate_v4()                                                                                       | NO       | uuid_generate_v4() |             |
| compliance_type       | text NOT NULL UNIQUE CHECK (compliance_type = ANY (ARRAY['SOC2'::text, 'HIPAA'::text, 'PCI_DSS'::text])                        | NO       |                    | UNIQUE      |
| status                | text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'warning'::text, 'critical'::text, 'pending'::text, 'expired'::text]) | NO       |                    |             |
| last_audit_date       | date                                                                                                                           | YES      |                    |             |
| next_audit_date       | date                                                                                                                           | YES      |                    |             |
| audit_score           | numeric                                                                                                                        | YES      |                    |             |
| findings_count        | integer DEFAULT 0                                                                                                              | YES      | 0                  |             |
| critical_findings     | integer DEFAULT 0                                                                                                              | YES      | 0                  |             |
| compliance_percentage | numeric DEFAULT 100                                                                                                            | YES      | 100.00             |             |
| auditor_name          | text                                                                                                                           | YES      |                    |             |
| certificate_url       | text                                                                                                                           | YES      |                    |             |
| notes                 | text                                                                                                                           | YES      |                    |             |
| metadata              | jsonb DEFAULT                                                                                                                  | YES      | '{}'::jsonb        |             |
| created_at            | timestamp with time zone DEFAULT now()                                                                                         | YES      | now()              |             |
| updated_at            | timestamp with time zone DEFAULT now()                                                                                         | YES      | now()              |             |

### compliance_verification_steps

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column            | Type                                    | Nullable | Default           | Constraints |
| ----------------- | --------------------------------------- | -------- | ----------------- | ----------- |
| id                | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| provider_id       | uuid NOT NULL                           | NO       |                   |             |
| verification_type | text NOT NULL                           | NO       |                   |             |
| verification_name | text NOT NULL                           | NO       |                   |             |
| status            | text NOT NULL DEFAULT                   | NO       | 'pending'::text   |             |
| required          | boolean DEFAULT true                    | YES      | true              |             |
| verification_data | jsonb DEFAULT                           | YES      | '{}'::jsonb       |             |
| verified_at       | timestamp with time zone                | YES      |                   |             |
| verified_by       | uuid                                    | YES      |                   |             |
| expires_at        | timestamp with time zone                | YES      |                   |             |
| notes             | text                                    | YES      |                   |             |
| created_at        | timestamp with time zone DEFAULT now()  | YES      | now()             |             |
| updated_at        | timestamp with time zone DEFAULT now()  | YES      | now()             |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (verified_by) REFERENCES auth.users(id)

**Indexes:**

- `idx_compliance_verification_steps_provider_id` on (provider_id)

### compliance_violations

_Defined in 006_audit_compliance.sql_

**Primary Key:** `id`

| Column                  | Type                                                                                                                                                                                                          | Nullable | Default            | Constraints |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| id                      | uuid NOT NULL DEFAULT uuid_generate_v4()                                                                                                                                                                      | NO       | uuid_generate_v4() |             |
| violation_type          | text NOT NULL CHECK (violation_type = ANY (ARRAY['data_breach'::text, 'unauthorized_access'::text, 'policy_violation'::text, 'audit_failure'::text, 'encryption_failure'::text, 'retention_violation'::text]) | NO       |                    |             |
| compliance_framework    | text NOT NULL CHECK (compliance_framework = ANY (ARRAY['SOC2'::text, 'HIPAA'::text, 'PCI_DSS'::text, 'GDPR'::text, 'CCPA'::text])                                                                             | NO       |                    |             |
| severity                | text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])                                                                                                      | NO       |                    |             |
| violation_title         | text NOT NULL                                                                                                                                                                                                 | NO       |                    |             |
| violation_description   | text NOT NULL                                                                                                                                                                                                 | NO       |                    |             |
| affected_user_id        | uuid                                                                                                                                                                                                          | YES      |                    |             |
| affected_resource_type  | text                                                                                                                                                                                                          | YES      |                    |             |
| affected_resource_id    | uuid                                                                                                                                                                                                          | YES      |                    |             |
| violation_timestamp     | timestamp with time zone DEFAULT now()                                                                                                                                                                        | YES      | now()              |             |
| status                  | text NOT NULL DEFAULT                                                                                                                                                                                         | NO       | 'open'::text       |             |
| assigned_to             | uuid                                                                                                                                                                                                          | YES      |                    |             |
| remediation_plan        | text                                                                                                                                                                                                          | YES      |                    |             |
| remediation_deadline    | date                                                                                                                                                                                                          | YES      |                    |             |
| resolution_notes        | text                                                                                                                                                                                                          | YES      |                    |             |
| resolved_at             | timestamp with time zone                                                                                                                                                                                      | YES      |                    |             |
| reported_to_authorities | boolean DEFAULT false                                                                                                                                                                                         | YES      | false              |             |
| authority_report_date   | date                                                                                                                                                                                                          | YES      |                    |             |
| metadata                | jsonb DEFAULT                                                                                                                                                                                                 | YES      | '{}'::jsonb        |             |
| created_at              | timestamp with time zone DEFAULT now()                                                                                                                                                                        | YES      | now()              |             |
| updated_at              | timestamp with time zone DEFAULT now()                                                                                                                                                                        | YES      | now()              |             |

**Foreign Keys:**

- FOREIGN KEY (affected_user_id) REFERENCES auth.users(id)
- FOREIGN KEY (assigned_to) REFERENCES auth.users(id)

**Indexes:**

- `idx_compliance_violations_status` on (status)
- `idx_compliance_violations_severity` on (severity)

### compliance_workflow_executions

_Defined in 006_audit_compliance.sql_

**Primary Key:** `id`

| Column                | Type                                               | Nullable | Default           | Constraints |
| --------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                    | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| rule_id               | uuid                                               | YES      |                   |             |
| execution_status      | text DEFAULT                                       | YES      | 'pending'::text   |             |
| trigger_data          | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| execution_result      | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| error_message         | text                                               | YES      |                   |             |
| execution_duration_ms | integer                                            | YES      |                   |             |
| executed_at           | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (rule_id) REFERENCES public.compliance_workflow_rules(id)

### compliance_workflow_rules

_Defined in 006_audit_compliance.sql_

**Primary Key:** `id`

| Column           | Type                                                       | Nullable | Default           | Constraints |
| ---------------- | ---------------------------------------------------------- | -------- | ----------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid()                    | NO       | gen_random_uuid() |             |
| rule_name        | text NOT NULL UNIQUE                                       | NO       |                   | UNIQUE      |
| rule_type        | text NOT NULL                                              | NO       |                   |             |
| description      | text                                                       | YES      |                   |             |
| trigger_event    | text NOT NULL                                              | NO       |                   |             |
| conditions       | jsonb DEFAULT                                              | YES      | '{}'::jsonb       |             |
| actions          | jsonb DEFAULT                                              | YES      | '[]'::jsonb       |             |
| priority         | integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10) | YES      | 5                 |             |
| is_active        | boolean DEFAULT true                                       | YES      | true              |             |
| execution_count  | integer DEFAULT 0                                          | YES      | 0                 |             |
| last_executed_at | timestamp with time zone                                   | YES      |                   |             |
| created_by       | uuid                                                       | YES      |                   |             |
| created_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP         | YES      | CURRENT_TIMESTAMP |             |
| updated_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP         | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)

### crypto_transactions

_Defined in 019_crypto_payments.sql_

**Primary Key:** `id`

| Column          | Type                                       | Nullable | Default           | Constraints           |
| --------------- | ------------------------------------------ | -------- | ----------------- | --------------------- |
| id              | UUID PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY           |
| charge_id       | TEXT NOT NULL                              | NO       |                   |                       |
| charge_code     | TEXT UNIQUE NOT NULL                       | NO       |                   | UNIQUE                |
| patient_id      | UUID NOT NULL REFERENCES patients(id)      | NO       |                   | FK → patients(id)     |
| provider_id     | UUID NOT NULL REFERENCES providers(id)     | NO       |                   | FK → providers(id)    |
| appointment_id  | UUID REFERENCES appointments(id)           | YES      |                   | FK → appointments(id) |
| amount_usd      | INTEGER NOT NULL                           | NO       |                   |                       |
| currency        | TEXT NOT NULL DEFAULT                      | NO       | 'USD'             |                       |
| status          | crypto_transaction_status NOT NULL DEFAULT | NO       | 'pending'         |                       |
| hosted_url      | TEXT NOT NULL                              | NO       |                   |                       |
| addresses       | JSONB                                      | YES      |                   |                       |
| payment_details | JSONB                                      | YES      |                   |                       |
| metadata        | JSONB                                      | YES      |                   |                       |
| expires_at      | TIMESTAMPTZ NOT NULL                       | NO       |                   |                       |
| created_at      | TIMESTAMPTZ NOT NULL DEFAULT NOW()         | NO       | NOW()             |                       |
| updated_at      | TIMESTAMPTZ NOT NULL DEFAULT NOW()         | NO       | NOW()             |                       |

**Indexes:**

- `idx_crypto_transactions_patient_id` on (patient_id)
- `idx_crypto_transactions_provider_id` on (provider_id)
- `idx_crypto_transactions_status` on (status)
- `idx_crypto_transactions_charge_code` on (charge_code)
- `idx_crypto_transactions_created_at` on (created_at DESC)
- `idx_crypto_transactions_patient_id` on (patient_id)
- `idx_crypto_transactions_provider_id` on (provider_id)
- `idx_crypto_transactions_status` on (status)
- `idx_crypto_transactions_charge_code` on (charge_code)
- `idx_crypto_transactions_created_at` on (created_at DESC)

### crypto_withdrawals

_Defined in 048_port_missing_features.sql_

**Primary Key:** `id`

| Column              | Type                                        | Nullable | Default            | Constraints         |
| ------------------- | ------------------------------------------- | -------- | ------------------ | ------------------- |
| id                  | UUID PRIMARY KEY DEFAULT uuid_generate_v4() | YES      | uuid_generate_v4() | PRIMARY KEY         |
| user_id             | UUID NOT NULL REFERENCES auth               | NO       |                    | FK → auth.users(id) |
| amount              | DECIMAL(18, 8)                              | NO       |                    |                     |
| currency            | TEXT NOT NULL                               | NO       |                    |                     |
| status              | withdrawal_status DEFAULT                   | YES      | 'PENDING'          |                     |
| destination_address | TEXT NOT NULL                               | NO       |                    |                     |
| tx_hash             | TEXT                                        | YES      |                    |                     |
| created_at          | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |                     |
| updated_at          | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |                     |

**Indexes:**

- `idx_crypto_withdrawals_user_id` on (user_id)
- `idx_crypto_withdrawals_status` on (status)

### custom_roles

_Defined in 002_core_tables.sql_

**Primary Key:** `id`

| Column         | Type                                               | Nullable | Default           | Constraints |
| -------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id             | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| role_name      | text NOT NULL UNIQUE                               | NO       |                   | UNIQUE      |
| display_name   | text NOT NULL                                      | NO       |                   |             |
| description    | text                                               | YES      |                   |             |
| is_system_role | boolean DEFAULT false                              | YES      | false             |             |
| is_active      | boolean DEFAULT true                               | YES      | true              |             |
| created_by     | uuid                                               | YES      |                   |             |
| created_at     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)

### data_backup_logs

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column             | Type                                               | Nullable | Default           | Constraints |
| ------------------ | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                 | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| schedule_id        | uuid                                               | YES      |                   |             |
| backup_status      | text DEFAULT                                       | YES      | 'initiated'::text |             |
| backup_size_mb     | numeric                                            | YES      |                   |             |
| backup_location    | text                                               | YES      |                   |             |
| records_backed_up  | integer                                            | YES      |                   |             |
| error_message      | text                                               | YES      |                   |             |
| backup_duration_ms | integer                                            | YES      |                   |             |
| started_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| completed_at       | timestamp with time zone                           | YES      |                   |             |

**Foreign Keys:**

- FOREIGN KEY (schedule_id) REFERENCES public.data_backup_schedules(id)

**Indexes:**

- `idx_data_backup_logs_schedule_id` on (schedule_id)

### data_backup_schedules

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column             | Type                                                                                                                  | Nullable | Default           | Constraints |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- | ----------- |
| id                 | uuid NOT NULL DEFAULT gen_random_uuid()                                                                               | NO       | gen_random_uuid() |             |
| backup_name        | text NOT NULL                                                                                                         | NO       |                   |             |
| backup_type        | text NOT NULL CHECK (backup_type = ANY (ARRAY['full'::text, 'incremental'::text, 'differential'::text])               | NO       |                   |             |
| schedule_frequency | text NOT NULL CHECK (schedule_frequency = ANY (ARRAY['hourly'::text, 'daily'::text, 'weekly'::text, 'monthly'::text]) | NO       |                   |             |
| schedule_time      | text                                                                                                                  | YES      |                   |             |
| target_tables      | text[]                                                                                                                | YES      |                   |             |
| retention_days     | integer DEFAULT 30                                                                                                    | YES      | 30                |             |
| is_active          | boolean DEFAULT true                                                                                                  | YES      | true              |             |
| last_backup_at     | timestamp with time zone                                                                                              | YES      |                   |             |
| next_backup_at     | timestamp with time zone                                                                                              | YES      |                   |             |
| created_by         | uuid                                                                                                                  | YES      |                   |             |
| created_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                                    | YES      | CURRENT_TIMESTAMP |             |
| updated_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                                    | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)

### developer_portal_analytics

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column             | Type                                               | Nullable | Default           | Constraints |
| ------------------ | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                 | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id            | uuid                                               | YES      |                   |             |
| page_visited       | text NOT NULL                                      | NO       |                   |             |
| time_spent_seconds | integer                                            | YES      |                   |             |
| interactions_count | integer DEFAULT 0                                  | YES      | 0                 |             |
| created_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

### dispute_evidence

_Defined in 004_disputes_chargebacks.sql_

**Primary Key:** `id`

| Column        | Type                                               | Nullable | Default           | Constraints |
| ------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id            | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| dispute_id    | uuid                                               | YES      |                   |             |
| evidence_type | text NOT NULL                                      | NO       |                   |             |
| file_name     | text NOT NULL                                      | NO       |                   |             |
| file_url      | text NOT NULL                                      | NO       |                   |             |
| file_size     | integer                                            | YES      |                   |             |
| mime_type     | text                                               | YES      |                   |             |
| uploaded_by   | uuid                                               | YES      |                   |             |
| description   | text                                               | YES      |                   |             |
| metadata      | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at    | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (dispute_id) REFERENCES public.disputes(id)
- FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_dispute_evidence_dispute_id` on (dispute_id)

### dispute_notifications

_Defined in 004_disputes_chargebacks.sql_

**Primary Key:** `id`

| Column            | Type                                               | Nullable | Default           | Constraints |
| ----------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| dispute_id        | uuid                                               | YES      |                   |             |
| notification_type | text NOT NULL                                      | NO       |                   |             |
| recipient_email   | text NOT NULL                                      | NO       |                   |             |
| recipient_id      | uuid                                               | YES      |                   |             |
| subject           | text NOT NULL                                      | NO       |                   |             |
| message           | text NOT NULL                                      | NO       |                   |             |
| sent_at           | timestamp with time zone                           | YES      |                   |             |
| delivered_at      | timestamp with time zone                           | YES      |                   |             |
| read_at           | timestamp with time zone                           | YES      |                   |             |
| status            | text DEFAULT                                       | YES      | 'pending'::text   |             |
| metadata          | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (dispute_id) REFERENCES public.disputes(id)
- FOREIGN KEY (recipient_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_dispute_notifications_dispute_id` on (dispute_id)
- `idx_dispute_notifications_recipient_id` on (recipient_id)
- `idx_dispute_notifications_status` on (status)

### dispute_timeline

_Defined in 004_disputes_chargebacks.sql_

**Primary Key:** `id`

| Column            | Type                                               | Nullable | Default           | Constraints |
| ----------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| dispute_id        | uuid                                               | YES      |                   |             |
| event_type        | text NOT NULL                                      | NO       |                   |             |
| event_title       | text NOT NULL                                      | NO       |                   |             |
| event_description | text                                               | YES      |                   |             |
| actor_id          | uuid                                               | YES      |                   |             |
| actor_name        | text                                               | YES      |                   |             |
| actor_role        | text                                               | YES      |                   |             |
| old_status        | text                                               | YES      |                   |             |
| new_status        | text                                               | YES      |                   |             |
| metadata          | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (dispute_id) REFERENCES public.disputes(id)
- FOREIGN KEY (actor_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_dispute_timeline_dispute_id` on (dispute_id)

### disputes

_Defined in 004_disputes_chargebacks.sql_

**Primary Key:** `id`

| Column               | Type                                               | Nullable | Default               | Constraints |
| -------------------- | -------------------------------------------------- | -------- | --------------------- | ----------- |
| id                   | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()     |             |
| dispute_number       | text NOT NULL UNIQUE                               | NO       |                       | UNIQUE      |
| transaction_id       | uuid                                               | YES      |                       |             |
| invoice_id           | uuid                                               | YES      |                       |             |
| patient_id           | uuid                                               | YES      |                       |             |
| provider_id          | uuid                                               | YES      |                       |             |
| dispute_reason       | dispute_reason NOT NULL                            | NO       |                       |             |
| status               | dispute_status DEFAULT                             | YES      | 'new'::dispute_status |             |
| amount               | numeric NOT NULL                                   | NO       |                       |             |
| currency             | text DEFAULT                                       | YES      | 'INR'::text           |             |
| dispute_date         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP     |             |
| due_date             | timestamp with time zone                           | YES      |                       |             |
| resolved_date        | timestamp with time zone                           | YES      |                       |             |
| customer_description | text                                               | YES      |                       |             |
| internal_notes       | text                                               | YES      |                       |             |
| evidence_url         | text                                               | YES      |                       |             |
| assigned_to          | uuid                                               | YES      |                       |             |
| resolution_outcome   | resolution_outcome                                 | YES      |                       |             |
| resolution_notes     | text                                               | YES      |                       |             |
| metadata             | jsonb DEFAULT                                      | YES      | '{}'::jsonb           |             |
| created_at           | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP     |             |
| updated_at           | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP     |             |

**Foreign Keys:**

- FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
- FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
- FOREIGN KEY (patient_id) REFERENCES public.patients(id)
- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_disputes_stripe_id` on (stripe_dispute_id)
- `idx_disputes_transaction_id` on (transaction_id)
- `idx_disputes_invoice_id` on (invoice_id)
- `idx_disputes_patient_id` on (patient_id)
- `idx_disputes_provider_id` on (provider_id)
- `idx_disputes_status` on (status)
- `idx_disputes_assigned_to` on (assigned_to)
- `idx_disputes_dispute_date` on (dispute_date DESC)
- `idx_disputes_created_at_desc` on (created_at DESC)

### email_history

_Defined in 005_notifications_settings.sql_

**Primary Key:** `id`

| Column        | Type                                    | Nullable | Default                 | Constraints |
| ------------- | --------------------------------------- | -------- | ----------------------- | ----------- |
| id            | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid()       |             |
| email_id      | text                                    | YES      |                         |             |
| template_id   | uuid                                    | YES      |                         |             |
| recipient     | text NOT NULL                           | NO       |                         |             |
| subject       | text NOT NULL                           | NO       |                         |             |
| status        | email_status DEFAULT                    | YES      | 'pending'::email_status |             |
| error_message | text                                    | YES      |                         |             |
| sent_at       | timestamptz                             | YES      |                         |             |
| opened_at     | timestamptz                             | YES      |                         |             |
| clicked_at    | timestamptz                             | YES      |                         |             |
| metadata      | jsonb DEFAULT                           | YES      | '{}'::jsonb             |             |
| created_at    | timestamptz DEFAULT CURRENT_TIMESTAMP   | YES      | CURRENT_TIMESTAMP       |             |

**Foreign Keys:**

- FOREIGN KEY (template_id) REFERENCES public.email_templates(id)

### email_settings

_Defined in 005_notifications_settings.sql_

**Primary Key:** `id`

| Column                    | Type                                    | Nullable | Default           | Constraints |
| ------------------------- | --------------------------------------- | -------- | ----------------- | ----------- |
| id                        | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| user_id                   | uuid UNIQUE                             | YES      |                   | UNIQUE      |
| transaction_confirmations | boolean DEFAULT true                    | YES      | true              |             |
| invoice_alerts            | boolean DEFAULT true                    | YES      | true              |             |
| payment_reminders         | boolean DEFAULT true                    | YES      | true              |             |
| platform_updates          | boolean DEFAULT true                    | YES      | true              |             |
| marketing_emails          | boolean DEFAULT false                   | YES      | false             |             |
| created_at                | timestamptz DEFAULT CURRENT_TIMESTAMP   | YES      | CURRENT_TIMESTAMP |             |
| updated_at                | timestamptz DEFAULT CURRENT_TIMESTAMP   | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

### email_templates

_Defined in 002_core_tables.sql_

**Primary Key:** `id`

| Column        | Type                                               | Nullable | Default           | Constraints |
| ------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id            | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| name          | text NOT NULL                                      | NO       |                   |             |
| template_type | email_template_type NOT NULL                       | NO       |                   |             |
| subject       | text NOT NULL                                      | NO       |                   |             |
| html_body     | text NOT NULL                                      | NO       |                   |             |
| text_body     | text                                               | YES      |                   |             |
| variables     | jsonb DEFAULT                                      | YES      | '[]'::jsonb       |             |
| description   | text                                               | YES      |                   |             |
| is_active     | boolean DEFAULT true                               | YES      | true              |             |
| is_system     | boolean DEFAULT false                              | YES      | false             |             |
| created_by    | uuid                                               | YES      |                   |             |
| created_at    | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at    | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)

### event_subscriptions

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column              | Type                                               | Nullable | Default           | Constraints |
| ------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                  | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| webhook_endpoint_id | uuid                                               | YES      |                   |             |
| event_type          | text NOT NULL                                      | NO       |                   |             |
| is_enabled          | boolean DEFAULT true                               | YES      | true              |             |
| filter_conditions   | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (webhook_endpoint_id) REFERENCES public.webhook_endpoints(id)

### facilities

_Defined in 048_port_missing_features.sql_

**Primary Key:** `id`

| Column     | Type                                        | Nullable | Default            | Constraints |
| ---------- | ------------------------------------------- | -------- | ------------------ | ----------- |
| id         | UUID PRIMARY KEY DEFAULT uuid_generate_v4() | YES      | uuid_generate_v4() | PRIMARY KEY |
| name       | TEXT NOT NULL                               | NO       |                    |             |
| address    | TEXT NOT NULL                               | NO       |                    |             |
| city       | TEXT NOT NULL                               | NO       |                    |             |
| state      | TEXT NOT NULL                               | NO       |                    |             |
| zip_code   | TEXT NOT NULL                               | NO       |                    |             |
| phone      | TEXT NOT NULL                               | NO       |                    |             |
| email      | TEXT NOT NULL                               | NO       |                    |             |
| type       | facility_type NOT NULL                      | NO       |                    |             |
| is_active  | BOOLEAN DEFAULT true                        | YES      | true               |             |
| created_at | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |             |
| updated_at | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |             |

**Indexes:**

- `idx_facilities_type` on (type)

### go_live_checklist

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column       | Type                                               | Nullable | Default           | Constraints |
| ------------ | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id           | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| provider_id  | uuid NOT NULL                                      | NO       |                   |             |
| category     | text NOT NULL                                      | NO       |                   |             |
| is_required  | boolean DEFAULT true                               | YES      | true              |             |
| is_completed | boolean DEFAULT false                              | YES      | false             |             |
| completed_at | timestamp with time zone                           | YES      |                   |             |
| completed_by | uuid                                               | YES      |                   |             |
| notes        | text                                               | YES      |                   |             |
| sort_order   | integer DEFAULT 0                                  | YES      | 0                 |             |
| created_at   | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at   | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (completed_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_go_live_checklist_provider_id` on (provider_id)

### guided_onboarding_progress

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column                | Type                                    | Nullable | Default           | Constraints |
| --------------------- | --------------------------------------- | -------- | ----------------- | ----------- |
| id                    | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| provider_id           | uuid NOT NULL UNIQUE                    | NO       |                   | UNIQUE      |
| current_step          | integer NOT NULL DEFAULT 1              | NO       | 1                 |             |
| total_steps           | integer NOT NULL DEFAULT 4              | NO       | 4                 |             |
| completion_percentage | integer NOT NULL DEFAULT 0              | NO       | 0                 |             |
| started_at            | timestamp with time zone DEFAULT now()  | YES      | now()             |             |
| completed_at          | timestamp with time zone                | YES      |                   |             |
| last_activity_at      | timestamp with time zone DEFAULT now()  | YES      | now()             |             |
| metadata              | jsonb DEFAULT                           | YES      | '{}'::jsonb       |             |
| created_at            | timestamp with time zone DEFAULT now()  | YES      | now()             |             |
| updated_at            | timestamp with time zone DEFAULT now()  | YES      | now()             |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

### hipaa_audit_log

_Defined in 014_storage_and_missing_features.sql_

**Primary Key:** `id`

| Column        | Type                                       | Nullable | Default           | Constraints              |
| ------------- | ------------------------------------------ | -------- | ----------------- | ------------------------ |
| id            | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY              |
| user_id       | uuid REFERENCES auth                       | YES      |                   | FK → auth.users(id)      |
| action        | text NOT NULL                              | NO       |                   |                          |
| resource_type | text NOT NULL                              | NO       |                   |                          |
| resource_id   | uuid                                       | YES      |                   |                          |
| patient_id    | uuid REFERENCES public                     | YES      |                   | FK → public.patients(id) |
| details       | jsonb DEFAULT                              | YES      | '{}'::jsonb       |                          |
| ip_address    | inet                                       | YES      |                   |                          |
| user_agent    | text                                       | YES      |                   |                          |
| created_at    | timestamp with time zone DEFAULT now()     | YES      | now()             |                          |

**Indexes:**

- `idx_hipaa_audit_log_user_id` on (user_id)
- `idx_hipaa_audit_log_patient_id` on (patient_id)
- `idx_hipaa_audit_log_created_at` on (created_at DESC)
- `idx_hipaa_audit_log_action` on (action)

### incident_activity_logs

_Defined in 010_security_permissions.sql_

**Primary Key:** `id`

| Column             | Type                                               | Nullable | Default           | Constraints |
| ------------------ | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                 | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| incident_id        | uuid                                               | YES      |                   |             |
| user_id            | uuid                                               | YES      |                   |             |
| action_type        | text NOT NULL                                      | NO       |                   |             |
| action_description | text NOT NULL                                      | NO       |                   |             |
| previous_status    | incident_status                                    | YES      |                   |             |
| new_status         | incident_status                                    | YES      |                   |             |
| metadata           | jsonb                                              | YES      |                   |             |
| created_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (incident_id) REFERENCES public.incident_responses(id)
- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_incident_activity_logs_incident_id` on (incident_id)

### incident_responses

_Defined in 010_security_permissions.sql_

**Primary Key:** `id`

| Column            | Type                                               | Nullable | Default                 | Constraints |
| ----------------- | -------------------------------------------------- | -------- | ----------------------- | ----------- |
| id                | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()       |             |
| incident_type     | incident_type NOT NULL                             | NO       |                         |             |
| severity          | incident_severity NOT NULL                         | NO       |                         |             |
| status            | incident_status DEFAULT                            | YES      | 'open'::incident_status |             |
| title             | text NOT NULL                                      | NO       |                         |             |
| description       | text                                               | YES      |                         |             |
| affected_systems  | text[]                                             | YES      |                         |             |
| assigned_to       | uuid                                               | YES      |                         |             |
| reported_by       | uuid                                               | YES      |                         |             |
| source_alert_id   | uuid                                               | YES      |                         |             |
| source_alert_type | text                                               | YES      |                         |             |
| impact_assessment | text                                               | YES      |                         |             |
| mitigation_steps  | text                                               | YES      |                         |             |
| resolution_notes  | text                                               | YES      |                         |             |
| detected_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP       |             |
| acknowledged_at   | timestamp with time zone                           | YES      |                         |             |
| resolved_at       | timestamp with time zone                           | YES      |                         |             |
| closed_at         | timestamp with time zone                           | YES      |                         |             |
| created_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP       |             |
| updated_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP       |             |

**Foreign Keys:**

- FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id)
- FOREIGN KEY (reported_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_incident_responses_status` on (status)
- `idx_incident_responses_severity` on (severity)
- `idx_incident_responses_assigned_to` on (assigned_to)

### insurance_claims

_Defined in 014_storage_and_missing_features.sql_

**Primary Key:** `id`

| Column                 | Type                                       | Nullable | Default           | Constraints                  |
| ---------------------- | ------------------------------------------ | -------- | ----------------- | ---------------------------- |
| id                     | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY                  |
| patient_id             | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.patients(id)     |
| provider_id            | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.providers(id)    |
| appointment_id         | uuid REFERENCES public                     | YES      |                   | FK → public.appointments(id) |
| transaction_id         | uuid REFERENCES public                     | YES      |                   | FK → public.transactions(id) |
| claim_number           | text UNIQUE                                | YES      |                   | UNIQUE                       |
| insurance_provider     | text NOT NULL                              | NO       |                   |                              |
| policy_number          | text NOT NULL                              | NO       |                   |                              |
| claim_amount           | numeric(12,2)                              | NO       |                   |                              |
| approved_amount        | numeric(12,2)                              | YES      |                   |                              |
| patient_responsibility | numeric(12,2)                              | YES      |                   |                              |
| status                 | text DEFAULT                               | YES      | 'submitted'       |                              |
| submitted_at           | timestamp with time zone DEFAULT now()     | YES      | now()             |                              |
| processed_at           | timestamp with time zone                   | YES      |                   |                              |
| denial_reason          | text                                       | YES      |                   |                              |
| appeal_deadline        | timestamp with time zone                   | YES      |                   |                              |
| diagnosis_codes        | jsonb DEFAULT                              | YES      | '[]'::jsonb       |                              |
| procedure_codes        | jsonb DEFAULT                              | YES      | '[]'::jsonb       |                              |
| supporting_documents   | jsonb DEFAULT                              | YES      | '[]'::jsonb       |                              |
| notes                  | text                                       | YES      |                   |                              |
| created_at             | timestamp with time zone DEFAULT now()     | YES      | now()             |                              |
| updated_at             | timestamp with time zone DEFAULT now()     | YES      | now()             |                              |

**Indexes:**

- `idx_insurance_claims_patient_id` on (patient_id)
- `idx_insurance_claims_provider_id` on (provider_id)
- `idx_insurance_claims_status` on (status)
- `idx_insurance_claims_claim_number` on (claim_number)
- `idx_claims_patient` on (patient_id)
- `idx_claims_provider` on (provider_id)
- `idx_claims_status` on (status)
- `idx_claims_number` on (claim_number)
- `idx_claims_insurance` on (insurance_provider, policy_number)
- `idx_claims_service_date` on (service_date)
- `idx_claims_patient` on (patient_id)
- `idx_claims_provider` on (provider_id)
- `idx_claims_status` on (status)
- `idx_claims_number` on (claim_number)
- `idx_claims_insurance` on (insurance_provider, policy_number)
- `idx_claims_service_date` on (service_date)

### integration_health_checks

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column               | Type                                               | Nullable | Default           | Constraints |
| -------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                   | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| integration_name     | text NOT NULL                                      | NO       |                   |             |
| integration_type     | text NOT NULL                                      | NO       |                   |             |
| endpoint_url         | text                                               | YES      |                   |             |
| last_check_at        | timestamp with time zone                           | YES      |                   |             |
| next_check_at        | timestamp with time zone                           | YES      |                   |             |
| status               | text DEFAULT                                       | YES      | 'unknown'::text   |             |
| response_time_ms     | integer                                            | YES      |                   |             |
| success_rate         | numeric                                            | YES      |                   |             |
| consecutive_failures | integer DEFAULT 0                                  | YES      | 0                 |             |
| is_active            | boolean DEFAULT true                               | YES      | true              |             |
| metadata             | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at           | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at           | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

### integration_health_logs

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column           | Type                                    | Nullable | Default           | Constraints |
| ---------------- | --------------------------------------- | -------- | ----------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| integration_id   | uuid                                    | YES      |                   |             |
| response_time_ms | integer                                 | YES      |                   |             |
| status_code      | integer                                 | YES      |                   |             |
| error_message    | text                                    | YES      |                   |             |
| request_details  | jsonb DEFAULT                           | YES      | '{}'::jsonb       |             |
| response_details | jsonb DEFAULT                           | YES      | '{}'::jsonb       |             |

**Foreign Keys:**

- FOREIGN KEY (integration_id) REFERENCES public.integration_health_checks(id)

**Indexes:**

- `idx_integration_health_logs_integration_id` on (integration_id)
- `idx_integration_health_logs_checked_at` on (checked_at DESC)

### invoice_disputes

_Defined in 004_disputes_chargebacks.sql_

**Primary Key:** `id`

| Column     | Type                                               | Nullable | Default           | Constraints |
| ---------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id         | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| invoice_id | uuid                                               | YES      |                   |             |
| dispute_id | uuid                                               | YES      |                   |             |
| linked_at  | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| linked_by  | uuid                                               | YES      |                   |             |
| notes      | text                                               | YES      |                   |             |

**Foreign Keys:**

- FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
- FOREIGN KEY (dispute_id) REFERENCES public.disputes(id)
- FOREIGN KEY (linked_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_invoice_disputes_invoice_id` on (invoice_id)
- `idx_invoice_disputes_dispute_id` on (dispute_id)

### invoice_items

_Defined in 003_transactions_invoices.sql_

**Primary Key:** `id`

| Column      | Type                                               | Nullable | Default           | Constraints |
| ----------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id          | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| invoice_id  | uuid                                               | YES      |                   |             |
| description | text NOT NULL                                      | NO       |                   |             |
| quantity    | integer NOT NULL DEFAULT 1                         | NO       | 1                 |             |
| unit_price  | numeric NOT NULL                                   | NO       |                   |             |
| amount      | numeric NOT NULL                                   | NO       |                   |             |
| created_at  | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)

**Indexes:**

- `idx_invoice_items_invoice_id` on (invoice_id)

### invoice_operations

_Defined in 003_transactions_invoices.sql_

**Primary Key:** `id`

| Column                | Type                                               | Nullable | Default           | Constraints |
| --------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                    | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| invoice_id            | uuid                                               | YES      |                   |             |
| operation_type        | invoice_operation_type NOT NULL                    | NO       |                   |             |
| operation_description | text                                               | YES      |                   |             |
| performed_by          | uuid                                               | YES      |                   |             |
| performed_by_name     | text                                               | YES      |                   |             |
| old_values            | jsonb                                              | YES      |                   |             |
| new_values            | jsonb                                              | YES      |                   |             |
| metadata              | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at            | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
- FOREIGN KEY (performed_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_invoice_operations_invoice_id` on (invoice_id)

### invoices

_Defined in 003_transactions_invoices.sql_

**Primary Key:** `id`

| Column               | Type                                               | Nullable | Default                 | Constraints |
| -------------------- | -------------------------------------------------- | -------- | ----------------------- | ----------- |
| id                   | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()       |             |
| invoice_number       | text NOT NULL UNIQUE                               | NO       |                         | UNIQUE      |
| patient_id           | uuid                                               | YES      |                         |             |
| provider_id          | uuid                                               | YES      |                         |             |
| transaction_id       | uuid                                               | YES      |                         |             |
| issue_date           | date NOT NULL DEFAULT CURRENT_DATE                 | NO       | CURRENT_DATE            |             |
| due_date             | date NOT NULL                                      | NO       |                         |             |
| status               | invoice_status DEFAULT                             | YES      | 'draft'::invoice_status |             |
| subtotal             | numeric NOT NULL DEFAULT 0                         | NO       | 0.00                    |             |
| tax_amount           | numeric DEFAULT 0                                  | YES      | 0.00                    |             |
| discount_amount      | numeric DEFAULT 0                                  | YES      | 0.00                    |             |
| total_amount         | numeric NOT NULL DEFAULT 0                         | NO       | 0.00                    |             |
| currency             | text DEFAULT                                       | YES      | 'INR'::text             |             |
| notes                | text                                               | YES      |                         |             |
| terms                | text                                               | YES      |                         |             |
| payment_instructions | text                                               | YES      |                         |             |
| created_by           | uuid                                               | YES      |                         |             |
| created_at           | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP       |             |
| updated_at           | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP       |             |

**Foreign Keys:**

- FOREIGN KEY (patient_id) REFERENCES public.patients(id)
- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
- FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_invoices_stripe_id` on (stripe_invoice_id)
- `idx_invoices_status_due_date` on (status, due_date)
- `idx_invoices_patient_id` on (patient_id)
- `idx_invoices_provider_id` on (provider_id)
- `idx_invoices_transaction_id` on (transaction_id)
- `idx_invoices_created_by` on (created_by)
- `idx_invoices_created_at_desc` on (created_at DESC)
- `idx_invoices_patient_created` on (patient_id, created_at DESC)
- `idx_invoices_provider_created` on (provider_id, created_at DESC)

### lab_results

_Defined in 014_storage_and_missing_features.sql_

**Primary Key:** `id`

| Column                | Type                                       | Nullable | Default           | Constraints                  |
| --------------------- | ------------------------------------------ | -------- | ----------------- | ---------------------------- |
| id                    | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY                  |
| patient_id            | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.patients(id)     |
| provider_id           | uuid REFERENCES public                     | YES      |                   | FK → public.providers(id)    |
| appointment_id        | uuid REFERENCES public                     | YES      |                   | FK → public.appointments(id) |
| test_name             | text NOT NULL                              | NO       |                   |                              |
| test_type             | text NOT NULL                              | NO       |                   |                              |
| result_value          | text                                       | YES      |                   |                              |
| result_unit           | text                                       | YES      |                   |                              |
| reference_range       | text                                       | YES      |                   |                              |
| is_abnormal           | boolean DEFAULT false                      | YES      | false             |                              |
| notes                 | text                                       | YES      |                   |                              |
| lab_name              | text                                       | YES      |                   |                              |
| specimen_collected_at | timestamp with time zone                   | YES      |                   |                              |
| result_received_at    | timestamp with time zone                   | YES      |                   |                              |
| document_url          | text                                       | YES      |                   |                              |
| status                | text DEFAULT                               | YES      | 'pending'         |                              |
| reviewed_by           | uuid REFERENCES public                     | YES      |                   | FK → public.providers(id)    |
| reviewed_at           | timestamp with time zone                   | YES      |                   |                              |
| created_at            | timestamp with time zone DEFAULT now()     | YES      | now()             |                              |
| updated_at            | timestamp with time zone DEFAULT now()     | YES      | now()             |                              |

**Indexes:**

- `idx_lab_results_patient_id` on (patient_id)
- `idx_lab_results_provider_id` on (provider_id)
- `idx_lab_results_status` on (status)

### linked_wallets

_Defined in 021_wallet_integration.sql_

**Primary Key:** `id`

| Column                 | Type                                       | Nullable | Default           | Constraints               |
| ---------------------- | ------------------------------------------ | -------- | ----------------- | ------------------------- |
| id                     | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY               |
| user_id                | uuid NOT NULL REFERENCES auth              | NO       |                   | FK → auth.users(id)       |
| provider_id            | uuid REFERENCES public                     | YES      |                   | FK → public.providers(id) |
| wallet_address         | text NOT NULL                              | NO       |                   |                           |
| blockchain_network     | blockchain_network NOT NULL                | NO       |                   |                           |
| wallet_label           | text                                       | YES      |                   |                           |
| verification_status    | wallet_verification_status DEFAULT         | YES      | 'pending'         |                           |
| verification_message   | text                                       | YES      |                   |                           |
| verification_signature | text                                       | YES      |                   |                           |
| verified_at            | timestamp with time zone                   | YES      |                   |                           |
| is_primary_payout      | boolean DEFAULT false                      | YES      | false             |                           |
| payout_enabled         | boolean DEFAULT false                      | YES      | false             |                           |
| min_payout_amount      | numeric(12,2)                              | YES      | 100.00            |                           |
| payout_currency        | text DEFAULT                               | YES      | 'USDC'            |                           |
| wallet_metadata        | jsonb DEFAULT                              | YES      | '{}'::jsonb       |                           |
| last_activity_at       | timestamp with time zone                   | YES      |                   |                           |
| created_at             | timestamp with time zone DEFAULT now()     | YES      | now()             |                           |
| updated_at             | timestamp with time zone DEFAULT now()     | YES      | now()             |                           |

**Indexes:**

- `idx_linked_wallets_primary_payout` on (provider_id) (UNIQUE)
- `idx_linked_wallets_user_id` on (user_id)
- `idx_linked_wallets_provider_id` on (provider_id)
- `idx_linked_wallets_address` on (wallet_address)
- `idx_linked_wallets_verification` on (verification_status)
- `idx_linked_wallets_primary_payout` on (provider_id) (UNIQUE)
- `idx_linked_wallets_user_id` on (user_id)
- `idx_linked_wallets_provider_id` on (provider_id)
- `idx_linked_wallets_address` on (wallet_address)
- `idx_linked_wallets_verification` on (verification_status)

### med_bed_bookings

_Defined in 028_medbed_features.sql_

**Primary Key:** `id`

| Column            | Type                                                                              | Nullable | Default            | Constraints         |
| ----------------- | --------------------------------------------------------------------------------- | -------- | ------------------ | ------------------- |
| id                | UUID PRIMARY KEY DEFAULT uuid_generate_v4()                                       | YES      | uuid_generate_v4() | PRIMARY KEY         |
| user_id           | UUID REFERENCES auth                                                              | YES      |                    | FK → auth.users(id) |
| med_bed_id        | UUID REFERENCES med_beds(id)                                                      | YES      |                    | FK → med_beds(id)   |
| start_time        | TIMESTAMPTZ NOT NULL                                                              | NO       |                    |                     |
| end_time          | TIMESTAMPTZ NOT NULL                                                              | NO       |                    |                     |
| status            | TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed') | NO       |                    |                     |
| total_amount      | INTEGER NOT NULL                                                                  | NO       |                    |                     |
| payment_intent_id | TEXT                                                                              | YES      |                    |                     |
| created_at        | TIMESTAMPTZ DEFAULT NOW()                                                         | YES      | NOW()              |                     |
| updated_at        | TIMESTAMPTZ DEFAULT NOW()                                                         | YES      | NOW()              |                     |

**Indexes:**

- `idx_med_bed_bookings_user_id` on (user_id)
- `idx_med_bed_bookings_med_bed_id` on (med_bed_id)
- `idx_med_bed_bookings_status` on (status)
- `idx_med_bed_bookings_start_time` on (start_time)

### med_bed_maintenance

_Defined in 048_port_missing_features.sql_

**Primary Key:** `id`

| Column       | Type                                        | Nullable | Default            | Constraints              |
| ------------ | ------------------------------------------- | -------- | ------------------ | ------------------------ |
| id           | UUID PRIMARY KEY DEFAULT uuid_generate_v4() | YES      | uuid_generate_v4() | PRIMARY KEY              |
| med_bed_id   | UUID NOT NULL REFERENCES public             | NO       |                    | FK → public.med_beds(id) |
| type         | TEXT NOT NULL                               | NO       |                    |                          |
| status       | TEXT NOT NULL                               | NO       |                    |                          |
| scheduled_at | TIMESTAMPTZ NOT NULL                        | NO       |                    |                          |
| completed_at | TIMESTAMPTZ                                 | YES      |                    |                          |
| notes        | TEXT                                        | YES      |                    |                          |
| assigned_to  | UUID REFERENCES auth                        | YES      |                    | FK → auth.users(id)      |
| created_at   | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |                          |

**Indexes:**

- `idx_med_bed_maintenance_med_bed_id` on (med_bed_id)

### med_bed_schedules

_Defined in 048_port_missing_features.sql_

**Primary Key:** `id`

| Column     | Type                                        | Nullable | Default            | Constraints                      |
| ---------- | ------------------------------------------- | -------- | ------------------ | -------------------------------- |
| id         | UUID PRIMARY KEY DEFAULT uuid_generate_v4() | YES      | uuid_generate_v4() | PRIMARY KEY                      |
| med_bed_id | UUID NOT NULL REFERENCES public             | NO       |                    | FK → public.med_beds(id)         |
| booking_id | UUID REFERENCES public                      | YES      |                    | FK → public.med_bed_bookings(id) |
| status     | TEXT NOT NULL                               | NO       |                    |                                  |
| start_time | TIMESTAMPTZ NOT NULL                        | NO       |                    |                                  |
| end_time   | TIMESTAMPTZ NOT NULL                        | NO       |                    |                                  |
| created_at | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |                                  |

**Indexes:**

- `idx_med_bed_schedules_med_bed_id` on (med_bed_id)

### med_beds

_Defined in 028_medbed_features.sql_

**Primary Key:** `id`

| Column      | Type                                               | Nullable | Default            | Constraints |
| ----------- | -------------------------------------------------- | -------- | ------------------ | ----------- |
| id          | UUID PRIMARY KEY DEFAULT uuid_generate_v4()        | YES      | uuid_generate_v4() | PRIMARY KEY |
| name        | TEXT NOT NULL                                      | NO       |                    |             |
| type        | TEXT NOT NULL CHECK (type IN ('medbed', 'chamber') | NO       |                    |             |
| description | TEXT                                               | YES      |                    |             |
| hourly_rate | INTEGER NOT NULL                                   | NO       |                    |             |
| image_url   | TEXT                                               | YES      |                    |             |
| is_active   | BOOLEAN DEFAULT true                               | YES      | true               |             |
| created_at  | TIMESTAMPTZ DEFAULT NOW()                          | YES      | NOW()              |             |
| updated_at  | TIMESTAMPTZ DEFAULT NOW()                          | YES      | NOW()              |             |

### medical_records

_Defined in 003_transactions_invoices.sql_

**Primary Key:** `id`

| Column         | Type                                               | Nullable | Default           | Constraints |
| -------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id             | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| patient_id     | uuid                                               | YES      |                   |             |
| provider_id    | uuid                                               | YES      |                   |             |
| appointment_id | uuid                                               | YES      |                   |             |
| record_type    | text NOT NULL                                      | NO       |                   |             |
| title          | text NOT NULL                                      | NO       |                   |             |
| description    | text                                               | YES      |                   |             |
| file_url       | text                                               | YES      |                   |             |
| file_type      | text                                               | YES      |                   |             |
| file_size      | integer                                            | YES      |                   |             |
| diagnosis      | jsonb DEFAULT                                      | YES      | '[]'::jsonb       |             |
| treatment_plan | text                                               | YES      |                   |             |
| lab_results    | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (patient_id) REFERENCES public.patients(id)
- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)

**Indexes:**

- `idx_medical_records_patient_id` on (patient_id)
- `idx_medical_records_provider_id` on (provider_id)
- `idx_medical_records_appointment_id` on (appointment_id)

### messages

_Defined in 014_storage_and_missing_features.sql_

**Primary Key:** `id`

| Column          | Type                                       | Nullable | Default           | Constraints                   |
| --------------- | ------------------------------------------ | -------- | ----------------- | ----------------------------- |
| id              | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY                   |
| sender_id       | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.user_profiles(id) |
| recipient_id    | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.user_profiles(id) |
| appointment_id  | uuid REFERENCES public                     | YES      |                   | FK → public.appointments(id)  |
| subject         | text                                       | YES      |                   |                               |
| content         | text NOT NULL                              | NO       |                   |                               |
| read_at         | timestamp with time zone                   | YES      |                   |                               |
| attachment_urls | jsonb DEFAULT                              | YES      | '[]'::jsonb       |                               |
| is_urgent       | boolean DEFAULT false                      | YES      | false             |                               |
| created_at      | timestamp with time zone DEFAULT now()     | YES      | now()             |                               |
| updated_at      | timestamp with time zone DEFAULT now()     | YES      | now()             |                               |

**Indexes:**

- `idx_messages_sender_id` on (sender_id)
- `idx_messages_recipient_id` on (recipient_id)
- `idx_messages_appointment_id` on (appointment_id)
- `idx_messages_created_at` on (created_at DESC)

### notification_preferences

_Defined in 005_notifications_settings.sql_

**Primary Key:** `id`

| Column                         | Type                                    | Nullable | Default           | Constraints |
| ------------------------------ | --------------------------------------- | -------- | ----------------- | ----------- |
| id                             | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| user_id                        | uuid UNIQUE                             | YES      |                   | UNIQUE      |
| email_payment_alerts           | boolean DEFAULT true                    | YES      | true              |             |
| email_compliance_notifications | boolean DEFAULT true                    | YES      | true              |             |
| email_system_updates           | boolean DEFAULT true                    | YES      | true              |             |
| email_transaction_updates      | boolean DEFAULT true                    | YES      | true              |             |
| email_security_alerts          | boolean DEFAULT true                    | YES      | true              |             |
| inapp_payment_alerts           | boolean DEFAULT true                    | YES      | true              |             |
| inapp_compliance_notifications | boolean DEFAULT true                    | YES      | true              |             |
| inapp_system_updates           | boolean DEFAULT true                    | YES      | true              |             |
| inapp_transaction_updates      | boolean DEFAULT true                    | YES      | true              |             |
| inapp_security_alerts          | boolean DEFAULT true                    | YES      | true              |             |
| digest_frequency               | text DEFAULT                            | YES      | 'realtime'::text  |             |
| quiet_hours_enabled            | boolean DEFAULT false                   | YES      | false             |             |
| quiet_hours_start              | time without time zone                  | YES      |                   |             |
| quiet_hours_end                | time without time zone                  | YES      |                   |             |
| created_at                     | timestamptz DEFAULT CURRENT_TIMESTAMP   | YES      | CURRENT_TIMESTAMP |             |
| updated_at                     | timestamptz DEFAULT CURRENT_TIMESTAMP   | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

### notification_queue

_Defined in 023_cron_jobs.sql_

**Primary Key:** `id`

| Column            | Type                                                               | Nullable | Default           | Constraints         |
| ----------------- | ------------------------------------------------------------------ | -------- | ----------------- | ------------------- |
| id                | uuid PRIMARY KEY DEFAULT gen_random_uuid()                         | YES      | gen_random_uuid() | PRIMARY KEY         |
| user_id           | uuid REFERENCES auth                                               | YES      |                   | FK → auth.users(id) |
| notification_type | text NOT NULL                                                      | NO       |                   |                     |
| channel           | text NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app') | NO       |                   |                     |
| recipient         | text NOT NULL                                                      | NO       |                   |                     |
| subject           | text                                                               | YES      |                   |                     |
| message           | text NOT NULL                                                      | NO       |                   |                     |
| metadata          | jsonb DEFAULT                                                      | YES      | '{}'              |                     |
| scheduled_for     | timestamptz NOT NULL                                               | NO       |                   |                     |
| status            | text NOT NULL DEFAULT                                              | NO       | 'pending'         |                     |
| attempts          | int DEFAULT 0                                                      | YES      | 0                 |                     |
| last_error        | text                                                               | YES      |                   |                     |
| sent_at           | timestamptz                                                        | YES      |                   |                     |
| created_at        | timestamptz DEFAULT now()                                          | YES      | now()             |                     |

**Indexes:**

- `idx_notification_queue_status` on (status, scheduled_for)
- `idx_notification_queue_user` on (user_id)
- `idx_notification_queue_status` on (status, scheduled_for)
- `idx_notification_queue_user` on (user_id)

### notifications

_Defined in 005_notifications_settings.sql_

**Primary Key:** `id`

| Column                 | Type                                    | Nullable | Default                            | Constraints |
| ---------------------- | --------------------------------------- | -------- | ---------------------------------- | ----------- |
| id                     | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid()                  |             |
| user_id                | uuid                                    | YES      |                                    |             |
| notification_type      | notification_type NOT NULL              | NO       |                                    |             |
| priority               | notification_priority DEFAULT           | YES      | 'medium'::notification_priority    |             |
| title                  | text NOT NULL                           | NO       |                                    |             |
| message                | text NOT NULL                           | NO       |                                    |             |
| read_status            | notification_read_status DEFAULT        | YES      | 'unread'::notification_read_status |             |
| related_transaction_id | uuid                                    | YES      |                                    |             |
| related_resource_type  | text                                    | YES      |                                    |             |
| related_resource_id    | uuid                                    | YES      |                                    |             |
| action_url             | text                                    | YES      |                                    |             |
| action_label           | text                                    | YES      |                                    |             |
| metadata               | jsonb DEFAULT                           | YES      | '{}'::jsonb                        |             |
| read_at                | timestamptz                             | YES      |                                    |             |
| archived_at            | timestamptz                             | YES      |                                    |             |
| expires_at             | timestamptz                             | YES      |                                    |             |
| created_at             | timestamptz DEFAULT CURRENT_TIMESTAMP   | YES      | CURRENT_TIMESTAMP                  |             |
| updated_at             | timestamptz DEFAULT CURRENT_TIMESTAMP   | YES      | CURRENT_TIMESTAMP                  |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
- FOREIGN KEY (related_transaction_id) REFERENCES public.transactions(id)

**Indexes:**

- `idx_notifications_user_id` on (user_id)
- `idx_notifications_read_status` on (user_id, read_status)
- `idx_notifications_created_at` on (created_at DESC)

### onboarding_checklist_items

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column                | Type                                    | Nullable | Default           | Constraints |
| --------------------- | --------------------------------------- | -------- | ----------------- | ----------- |
| id                    | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| provider_id           | uuid NOT NULL                           | NO       |                   |             |
| item_category         | text NOT NULL                           | NO       |                   |             |
| item_title            | text NOT NULL                           | NO       |                   |             |
| item_description      | text                                    | YES      |                   |             |
| is_required           | boolean DEFAULT true                    | YES      | true              |             |
| is_completed          | boolean DEFAULT false                   | YES      | false             |             |
| completion_percentage | integer DEFAULT 0                       | YES      | 0                 |             |
| sort_order            | integer NOT NULL                        | NO       |                   |             |
| depends_on_item_id    | uuid                                    | YES      |                   |             |
| completed_at          | timestamp with time zone                | YES      |                   |             |
| completed_by          | uuid                                    | YES      |                   |             |
| metadata              | jsonb DEFAULT                           | YES      | '{}'::jsonb       |             |
| created_at            | timestamp with time zone DEFAULT now()  | YES      | now()             |             |
| updated_at            | timestamp with time zone DEFAULT now()  | YES      | now()             |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (depends_on_item_id) REFERENCES public.onboarding_checklist_items(id)
- FOREIGN KEY (completed_by) REFERENCES auth.users(id)

**Indexes:**

- `idx_onboarding_checklist_items_provider_id` on (provider_id)

### onboarding_email_log

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column          | Type                                               | Nullable | Default           | Constraints |
| --------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id              | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| provider_id     | uuid NOT NULL                                      | NO       |                   |             |
| email_type      | text NOT NULL                                      | NO       |                   |             |
| recipient_email | text NOT NULL                                      | NO       |                   |             |
| subject         | text NOT NULL                                      | NO       |                   |             |
| sent_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| email_id        | text                                               | YES      |                   |             |
| status          | text DEFAULT                                       | YES      | 'sent'::text      |             |
| metadata        | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_onboarding_email_log_provider_id` on (provider_id)

### onboarding_team_invitations

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column           | Type                                                                                                     | Nullable | Default           | Constraints |
| ---------------- | -------------------------------------------------------------------------------------------------------- | -------- | ----------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid()                                                                  | NO       | gen_random_uuid() |             |
| provider_id      | uuid NOT NULL                                                                                            | NO       |                   |             |
| email            | text NOT NULL                                                                                            | NO       |                   |             |
| role             | text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'provider'::text, 'patient'::text, 'staff'::text]) | NO       |                   |             |
| invitation_token | text NOT NULL UNIQUE                                                                                     | NO       |                   | UNIQUE      |
| invited_by       | uuid                                                                                                     | YES      |                   |             |
| status           | text NOT NULL DEFAULT                                                                                    | NO       | 'pending'::text   |             |
| expires_at       | timestamp with time zone NOT NULL                                                                        | NO       |                   |             |
| accepted_at      | timestamp with time zone                                                                                 | YES      |                   |             |
| metadata         | jsonb DEFAULT                                                                                            | YES      | '{}'::jsonb       |             |
| created_at       | timestamp with time zone DEFAULT now()                                                                   | YES      | now()             |             |
| updated_at       | timestamp with time zone DEFAULT now()                                                                   | YES      | now()             |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (invited_by) REFERENCES auth.users(id)

**Indexes:**

- `idx_onboarding_team_invitations_provider_id` on (provider_id)

### onboarding_workflow_steps

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column       | Type                                               | Nullable | Default                               | Constraints |
| ------------ | -------------------------------------------------- | -------- | ------------------------------------- | ----------- |
| id           | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()                     |             |
| provider_id  | uuid NOT NULL                                      | NO       |                                       |             |
| step_number  | integer NOT NULL                                   | NO       |                                       |             |
| step_name    | text NOT NULL                                      | NO       |                                       |             |
| step_status  | onboarding_step_status DEFAULT                     | YES      | 'not_started'::onboarding_step_status |             |
| started_at   | timestamp with time zone                           | YES      |                                       |             |
| completed_at | timestamp with time zone                           | YES      |                                       |             |
| data         | jsonb DEFAULT                                      | YES      | '{}'::jsonb                           |             |
| created_at   | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP                     |             |
| updated_at   | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP                     |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_onboarding_workflow_steps_provider_id` on (provider_id)

### organization_settings

_Defined in 005_notifications_settings.sql_

**Primary Key:** `id`

| Column               | Type                                    | Nullable | Default           | Constraints |
| -------------------- | --------------------------------------- | -------- | ----------------- | ----------- |
| id                   | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| user_id              | uuid NOT NULL                           | NO       |                   |             |
| organization_name    | text NOT NULL                           | NO       |                   |             |
| organization_email   | text                                    | YES      |                   |             |
| organization_phone   | text                                    | YES      |                   |             |
| organization_address | text                                    | YES      |                   |             |
| organization_website | text                                    | YES      |                   |             |
| tax_id               | text                                    | YES      |                   |             |
| business_type        | text                                    | YES      |                   |             |
| created_at           | timestamptz DEFAULT now()               | YES      | now()             |             |
| updated_at           | timestamptz DEFAULT now()               | YES      | now()             |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES auth.users(id)

### patient_consents

_Defined in 014_storage_and_missing_features.sql_

**Primary Key:** `id`

| Column               | Type                                       | Nullable | Default           | Constraints              |
| -------------------- | ------------------------------------------ | -------- | ----------------- | ------------------------ |
| id                   | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY              |
| patient_id           | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.patients(id) |
| consent_type         | text NOT NULL                              | NO       |                   |                          |
| granted              | boolean NOT NULL DEFAULT false             | NO       | false             |                          |
| granted_at           | timestamp with time zone                   | YES      |                   |                          |
| revoked_at           | timestamp with time zone                   | YES      |                   |                          |
| expires_at           | timestamp with time zone                   | YES      |                   |                          |
| consent_document_url | text                                       | YES      |                   |                          |
| ip_address           | inet                                       | YES      |                   |                          |
| metadata             | jsonb DEFAULT                              | YES      | '{}'::jsonb       |                          |
| created_at           | timestamp with time zone DEFAULT now()     | YES      | now()             |                          |
| updated_at           | timestamp with time zone DEFAULT now()     | YES      | now()             |                          |

**Indexes:**

- `idx_patient_consents_patient_id` on (patient_id)
- `idx_patient_consents_consent_type` on (consent_type)

### patients

_Defined in 002_core_tables.sql_

**Primary Key:** `id`

| Column                  | Type                                               | Nullable | Default           | Constraints |
| ----------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                      | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id                 | uuid                                               | YES      |                   |             |
| date_of_birth           | date                                               | YES      |                   |             |
| gender                  | text                                               | YES      |                   |             |
| address_line_1          | text                                               | YES      |                   |             |
| address_line_2          | text                                               | YES      |                   |             |
| city                    | text                                               | YES      |                   |             |
| state                   | text                                               | YES      |                   |             |
| postal_code             | text                                               | YES      |                   |             |
| country                 | text DEFAULT                                       | YES      | 'IN'::text        |             |
| emergency_contact_name  | text                                               | YES      |                   |             |
| emergency_contact_phone | text                                               | YES      |                   |             |
| insurance_provider      | text                                               | YES      |                   |             |
| insurance_policy_number | text                                               | YES      |                   |             |
| medical_history         | jsonb DEFAULT                                      | YES      | '[]'::jsonb       |             |
| allergies               | jsonb DEFAULT                                      | YES      | '[]'::jsonb       |             |
| created_at              | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at              | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_patients_user_id` on (user_id)

### payment_history

_Defined in 003_transactions_invoices.sql_

**Primary Key:** `id`

| Column           | Type                                               | Nullable | Default           | Constraints |
| ---------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| invoice_id       | uuid                                               | YES      |                   |             |
| transaction_id   | uuid                                               | YES      |                   |             |
| patient_id       | uuid                                               | YES      |                   |             |
| provider_id      | uuid                                               | YES      |                   |             |
| amount           | numeric NOT NULL                                   | NO       |                   |             |
| currency         | text DEFAULT                                       | YES      | 'INR'::text       |             |
| payment_method   | text                                               | YES      |                   |             |
| payment_status   | text                                               | YES      |                   |             |
| payment_date     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| reference_number | text                                               | YES      |                   |             |
| notes            | text                                               | YES      |                   |             |
| created_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
- FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
- FOREIGN KEY (patient_id) REFERENCES public.patients(id)
- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_payment_history_patient_id` on (patient_id)
- `idx_payment_history_provider_id` on (provider_id)
- `idx_payment_history_invoice_id` on (invoice_id)
- `idx_payment_history_payment_date` on (payment_date DESC)
- `idx_payment_history_payment_status` on (payment_status)

### payment_methods

_Defined in 003_transactions_invoices.sql_

**Primary Key:** `id`

| Column                   | Type                                               | Nullable | Default           | Constraints |
| ------------------------ | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                       | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id                  | uuid                                               | YES      |                   |             |
| stripe_payment_method_id | text UNIQUE                                        | YES      |                   | UNIQUE      |
| method_type              | method_type NOT NULL                               | NO       |                   |             |
| is_default               | boolean DEFAULT false                              | YES      | false             |             |
| card_brand               | text                                               | YES      |                   |             |
| card_last4               | text                                               | YES      |                   |             |
| card_exp_month           | integer                                            | YES      |                   |             |
| card_exp_year            | integer                                            | YES      |                   |             |
| bank_name                | text                                               | YES      |                   |             |
| account_last4            | text                                               | YES      |                   |             |
| account_holder_name      | text                                               | YES      |                   |             |
| billing_name             | text                                               | YES      |                   |             |
| billing_email            | text                                               | YES      |                   |             |
| billing_address          | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| nickname                 | text                                               | YES      |                   |             |
| metadata                 | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| verified_at              | timestamp with time zone                           | YES      |                   |             |
| last_used_at             | timestamp with time zone                           | YES      |                   |             |
| created_at               | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at               | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_payment_methods_user_id` on (user_id)

### payment_plan_transactions

_Defined in 024_additional_tables.sql_

**Primary Key:** `id`

| Column             | Type                                       | Nullable | Default           | Constraints                   |
| ------------------ | ------------------------------------------ | -------- | ----------------- | ----------------------------- |
| id                 | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY                   |
| payment_plan_id    | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.payment_plans(id) |
| transaction_id     | uuid REFERENCES public                     | YES      |                   | FK → public.transactions(id)  |
| installment_number | integer NOT NULL                           | NO       |                   |                               |
| amount             | numeric(10,2)                              | NO       |                   |                               |
| due_date           | date NOT NULL                              | NO       |                   |                               |
| paid_date          | date                                       | YES      |                   |                               |
| status             | text DEFAULT                               | YES      | 'pending'         |                               |
| late_fee           | numeric(10,2)                              | YES      | 0                 |                               |
| notes              | text                                       | YES      |                   |                               |
| created_at         | timestamptz DEFAULT now()                  | YES      | now()             |                               |

**Indexes:**

- `idx_plan_transactions_plan` on (payment_plan_id)
- `idx_plan_transactions_due` on (due_date, status)
- `idx_plan_transactions_plan` on (payment_plan_id)
- `idx_plan_transactions_due` on (due_date, status)
- `idx_plan_transactions_plan` on (payment_plan_id)
- `idx_plan_transactions_due` on (due_date, status)

### payment_plans

_Defined in 024_additional_tables.sql_

**Primary Key:** `id`

| Column                 | Type                                       | Nullable | Default           | Constraints                   |
| ---------------------- | ------------------------------------------ | -------- | ----------------- | ----------------------------- |
| id                     | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY                   |
| patient_id             | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.patients(id)      |
| invoice_id             | uuid REFERENCES public                     | YES      |                   | FK → public.invoices(id)      |
| total_amount           | numeric(10,2)                              | NO       |                   |                               |
| down_payment           | numeric(10,2)                              | YES      | 0                 |                               |
| remaining_balance      | numeric(10,2)                              | NO       |                   |                               |
| installment_amount     | numeric(10,2)                              | NO       |                   |                               |
| number_of_installments | integer NOT NULL                           | NO       |                   |                               |
| installments_paid      | integer DEFAULT 0                          | YES      | 0                 |                               |
| frequency              | payment_frequency DEFAULT                  | YES      | 'monthly'         |                               |
| start_date             | date NOT NULL                              | NO       |                   |                               |
| end_date               | date                                       | YES      |                   |                               |
| next_payment_date      | date                                       | YES      |                   |                               |
| status                 | payment_plan_status DEFAULT                | YES      | 'active'          |                               |
| auto_charge            | boolean DEFAULT false                      | YES      | false             |                               |
| stripe_subscription_id | text                                       | YES      |                   |                               |
| late_fee_amount        | numeric(10,2)                              | YES      | 0                 |                               |
| grace_period_days      | integer DEFAULT 5                          | YES      | 5                 |                               |
| notes                  | text                                       | YES      |                   |                               |
| created_by             | uuid REFERENCES public                     | YES      |                   | FK → public.user_profiles(id) |
| approved_by            | uuid REFERENCES public                     | YES      |                   | FK → public.user_profiles(id) |
| created_at             | timestamptz DEFAULT now()                  | YES      | now()             |                               |
| updated_at             | timestamptz DEFAULT now()                  | YES      | now()             |                               |

**Indexes:**

- `idx_payment_plans_patient` on (patient_id)
- `idx_payment_plans_status` on (status)
- `idx_payment_plans_next_payment` on (next_payment_date)
- `idx_payment_plans_patient` on (patient_id)
- `idx_payment_plans_status` on (status)
- `idx_payment_plans_next_payment` on (next_payment_date)
- `idx_payment_plans_patient` on (patient_id)
- `idx_payment_plans_status` on (status)
- `idx_payment_plans_next_payment` on (next_payment_date)

### payment_preferences

_Defined in 005_notifications_settings.sql_

**Primary Key:** `id`

| Column                     | Type                                    | Nullable | Default           | Constraints |
| -------------------------- | --------------------------------------- | -------- | ----------------- | ----------- |
| id                         | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| user_id                    | uuid NOT NULL UNIQUE                    | NO       |                   | UNIQUE      |
| default_currency           | text DEFAULT                            | YES      | 'USD'::text       |             |
| default_payment_method     | text                                    | YES      |                   |             |
| settlement_schedule        | text DEFAULT                            | YES      | 'Daily'::text     |             |
| auto_reconciliation        | boolean DEFAULT true                    | YES      | true              |             |
| payment_confirmation_email | boolean DEFAULT true                    | YES      | true              |             |
| invoice_auto_send          | boolean DEFAULT false                   | YES      | false             |             |
| late_payment_reminders     | boolean DEFAULT true                    | YES      | true              |             |
| created_at                 | timestamptz DEFAULT now()               | YES      | now()             |             |
| updated_at                 | timestamptz DEFAULT now()               | YES      | now()             |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES auth.users(id)

### performance_alerts

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column          | Type                                                                                                     | Nullable | Default           | Constraints |
| --------------- | -------------------------------------------------------------------------------------------------------- | -------- | ----------------- | ----------- |
| id              | uuid NOT NULL DEFAULT gen_random_uuid()                                                                  | NO       | gen_random_uuid() |             |
| alert_type      | text NOT NULL                                                                                            | NO       |                   |             |
| severity        | text NOT NULL CHECK (severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text]) | NO       |                   |             |
| alert_message   | text NOT NULL                                                                                            | NO       |                   |             |
| metric_id       | uuid                                                                                                     | YES      |                   |             |
| component       | text                                                                                                     | YES      |                   |             |
| status          | text DEFAULT                                                                                             | YES      | 'active'::text    |             |
| acknowledged_by | uuid                                                                                                     | YES      |                   |             |
| acknowledged_at | timestamp with time zone                                                                                 | YES      |                   |             |
| resolved_at     | timestamp with time zone                                                                                 | YES      |                   |             |
| metadata        | jsonb DEFAULT                                                                                            | YES      | '{}'::jsonb       |             |
| created_at      | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                       | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (metric_id) REFERENCES public.system_performance_metrics(id)
- FOREIGN KEY (acknowledged_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_performance_alerts_status` on (status)
- `idx_performance_alerts_metric_id` on (metric_id)

### phi_access_log

_Defined in 022_vault_encryption.sql_

**Primary Key:** `id`

| Column             | Type                                                              | Nullable | Default           | Constraints         |
| ------------------ | ----------------------------------------------------------------- | -------- | ----------------- | ------------------- |
| id                 | uuid PRIMARY KEY DEFAULT gen_random_uuid()                        | YES      | gen_random_uuid() | PRIMARY KEY         |
| user_id            | uuid REFERENCES auth                                              | YES      |                   | FK → auth.users(id) |
| accessed_table     | text NOT NULL                                                     | NO       |                   |                     |
| accessed_record_id | uuid                                                              | YES      |                   |                     |
| access_type        | text NOT NULL CHECK (access_type IN ('view', 'decrypt', 'export') | NO       |                   |                     |
| columns_accessed   | text[]                                                            | YES      |                   |                     |
| ip_address         | inet                                                              | YES      |                   |                     |
| user_agent         | text                                                              | YES      |                   |                     |
| created_at         | timestamptz DEFAULT now()                                         | YES      | now()             |                     |

**Indexes:**

- `idx_phi_access_log_user` on (user_id)
- `idx_phi_access_log_date` on (created_at)
- `idx_phi_access_log_table` on (accessed_table)
- `idx_phi_access_log_user` on (user_id)
- `idx_phi_access_log_date` on (created_at)
- `idx_phi_access_log_table` on (accessed_table)

### prescriptions

_Defined in 014_storage_and_missing_features.sql_

**Primary Key:** `id`

| Column            | Type                                       | Nullable | Default           | Constraints                  |
| ----------------- | ------------------------------------------ | -------- | ----------------- | ---------------------------- |
| id                | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY                  |
| patient_id        | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.patients(id)     |
| provider_id       | uuid NOT NULL REFERENCES public            | NO       |                   | FK → public.providers(id)    |
| appointment_id    | uuid REFERENCES public                     | YES      |                   | FK → public.appointments(id) |
| medication_name   | text NOT NULL                              | NO       |                   |                              |
| dosage            | text NOT NULL                              | NO       |                   |                              |
| frequency         | text NOT NULL                              | NO       |                   |                              |
| duration          | text                                       | YES      |                   |                              |
| instructions      | text                                       | YES      |                   |                              |
| refills_allowed   | integer DEFAULT 0                          | YES      | 0                 |                              |
| refills_remaining | integer DEFAULT 0                          | YES      | 0                 |                              |
| pharmacy_name     | text                                       | YES      |                   |                              |
| pharmacy_address  | text                                       | YES      |                   |                              |
| pharmacy_phone    | text                                       | YES      |                   |                              |
| status            | text DEFAULT                               | YES      | 'active'          |                              |
| prescribed_at     | timestamp with time zone DEFAULT now()     | YES      | now()             |                              |
| expires_at        | timestamp with time zone                   | YES      |                   |                              |
| created_at        | timestamp with time zone DEFAULT now()     | YES      | now()             |                              |
| updated_at        | timestamp with time zone DEFAULT now()     | YES      | now()             |                              |

**Indexes:**

- `idx_prescriptions_patient_id` on (patient_id)
- `idx_prescriptions_provider_id` on (provider_id)
- `idx_prescriptions_status` on (status)

### provider_compliance_records

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column            | Type                                               | Nullable | Default           | Constraints |
| ----------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| provider_id       | uuid NOT NULL                                      | NO       |                   |             |
| compliance_type   | text NOT NULL                                      | NO       |                   |             |
| status            | text NOT NULL                                      | NO       |                   |             |
| last_check_date   | date                                               | YES      |                   |             |
| next_check_date   | date                                               | YES      |                   |             |
| compliance_score  | numeric                                            | YES      |                   |             |
| findings_count    | integer DEFAULT 0                                  | YES      | 0                 |             |
| critical_findings | integer DEFAULT 0                                  | YES      | 0                 |             |
| auditor_name      | text                                               | YES      |                   |             |
| certificate_url   | text                                               | YES      |                   |             |
| notes             | text                                               | YES      |                   |             |
| metadata          | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_provider_compliance_records_provider_id` on (provider_id)

### provider_documents

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column           | Type                                               | Nullable | Default                           | Constraints |
| ---------------- | -------------------------------------------------- | -------- | --------------------------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()                 |             |
| provider_id      | uuid NOT NULL                                      | NO       |                                   |             |
| document_type    | document_status NOT NULL                           | NO       |                                   |             |
| document_name    | text NOT NULL                                      | NO       |                                   |             |
| file_url         | text                                               | YES      |                                   |             |
| file_size        | integer                                            | YES      |                                   |             |
| mime_type        | text                                               | YES      |                                   |             |
| status           | document_status DEFAULT                            | YES      | 'pending_upload'::document_status |             |
| uploaded_at      | timestamp with time zone                           | YES      |                                   |             |
| reviewed_at      | timestamp with time zone                           | YES      |                                   |             |
| reviewed_by      | uuid                                               | YES      |                                   |             |
| expiry_date      | date                                               | YES      |                                   |             |
| rejection_reason | text                                               | YES      |                                   |             |
| metadata         | jsonb DEFAULT                                      | YES      | '{}'::jsonb                       |             |
| created_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP                 |             |
| updated_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP                 |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_provider_documents_provider_id` on (provider_id)

### provider_notes

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column      | Type                                               | Nullable | Default           | Constraints |
| ----------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id          | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| provider_id | uuid NOT NULL                                      | NO       |                   |             |
| created_by  | uuid NOT NULL                                      | NO       |                   |             |
| note_type   | text DEFAULT                                       | YES      | 'general'::text   |             |
| content     | text NOT NULL                                      | NO       |                   |             |
| is_internal | boolean DEFAULT true                               | YES      | true              |             |
| created_at  | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at  | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_provider_notes_provider_id` on (provider_id)

### provider_onboarding

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column                         | Type                                               | Nullable | Default                            | Constraints |
| ------------------------------ | -------------------------------------------------- | -------- | ---------------------------------- | ----------- |
| id                             | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()                  |             |
| provider_id                    | uuid NOT NULL                                      | NO       |                                    |             |
| onboarding_status              | onboarding_status DEFAULT                          | YES      | 'pending'::onboarding_status       |             |
| documents_submitted            | boolean DEFAULT false                              | YES      | false                              |             |
| documents_verified             | boolean DEFAULT false                              | YES      | false                              |             |
| background_check_status        | verification_status DEFAULT                        | YES      | 'not_started'::verification_status |             |
| license_verification_status    | verification_status DEFAULT                        | YES      | 'not_started'::verification_status |             |
| compliance_verification_status | verification_status DEFAULT                        | YES      | 'not_started'::verification_status |             |
| submitted_at                   | timestamp with time zone                           | YES      |                                    |             |
| reviewed_at                    | timestamp with time zone                           | YES      |                                    |             |
| approved_at                    | timestamp with time zone                           | YES      |                                    |             |
| rejected_at                    | timestamp with time zone                           | YES      |                                    |             |
| rejection_reason               | text                                               | YES      |                                    |             |
| reviewer_id                    | uuid                                               | YES      |                                    |             |
| notes                          | text                                               | YES      |                                    |             |
| metadata                       | jsonb DEFAULT                                      | YES      | '{}'::jsonb                        |             |
| created_at                     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP                  |             |
| updated_at                     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP                  |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (reviewer_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_provider_onboarding_provider_id` on (provider_id)
- `idx_provider_onboarding_status` on (onboarding_status)

### provider_payment_volumes

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column                    | Type                                               | Nullable | Default           | Constraints |
| ------------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                        | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| provider_id               | uuid NOT NULL                                      | NO       |                   |             |
| period_start              | date NOT NULL                                      | NO       |                   |             |
| period_end                | date NOT NULL                                      | NO       |                   |             |
| total_transactions        | integer DEFAULT 0                                  | YES      | 0                 |             |
| successful_transactions   | integer DEFAULT 0                                  | YES      | 0                 |             |
| failed_transactions       | integer DEFAULT 0                                  | YES      | 0                 |             |
| total_volume              | numeric DEFAULT 0                                  | YES      | 0.00              |             |
| average_transaction_value | numeric DEFAULT 0                                  | YES      | 0.00              |             |
| currency                  | text DEFAULT                                       | YES      | 'INR'::text       |             |
| created_at                | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at                | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_provider_payment_volumes_provider_id` on (provider_id)

### provider_performance_metrics

_Defined in 007_provider_onboarding.sql_

**Primary Key:** `id`

| Column                    | Type                                     | Nullable | Default            | Constraints |
| ------------------------- | ---------------------------------------- | -------- | ------------------ | ----------- |
| id                        | uuid NOT NULL DEFAULT uuid_generate_v4() | NO       | uuid_generate_v4() |             |
| provider_id               | uuid NOT NULL                            | NO       |                    |             |
| metric_date               | date NOT NULL                            | NO       |                    |             |
| total_transactions        | integer DEFAULT 0                        | YES      | 0                  |             |
| successful_transactions   | integer DEFAULT 0                        | YES      | 0                  |             |
| failed_transactions       | integer DEFAULT 0                        | YES      | 0                  |             |
| total_revenue             | numeric DEFAULT 0                        | YES      | 0                  |             |
| average_transaction_value | numeric DEFAULT 0                        | YES      | 0                  |             |
| success_rate              | numeric DEFAULT 0                        | YES      | 0                  |             |
| patient_count             | integer DEFAULT 0                        | YES      | 0                  |             |
| rating_average            | numeric DEFAULT 0                        | YES      | 0                  |             |
| created_at                | timestamp with time zone DEFAULT now()   | YES      | now()              |             |
| updated_at                | timestamp with time zone DEFAULT now()   | YES      | now()              |             |

**Foreign Keys:**

- FOREIGN KEY (provider_id) REFERENCES public.providers(id)

**Indexes:**

- `idx_provider_performance_metrics_provider_id` on (provider_id)
- `idx_provider_performance_metrics_date` on (metric_date)

### provider_reviews

_Defined in 014_storage_and_missing_features.sql_

**Primary Key:** `id`

| Column         | Type                                                 | Nullable | Default           | Constraints                  |
| -------------- | ---------------------------------------------------- | -------- | ----------------- | ---------------------------- |
| id             | uuid PRIMARY KEY DEFAULT gen_random_uuid()           | YES      | gen_random_uuid() | PRIMARY KEY                  |
| patient_id     | uuid NOT NULL REFERENCES public                      | NO       |                   | FK → public.patients(id)     |
| provider_id    | uuid NOT NULL REFERENCES public                      | NO       |                   | FK → public.providers(id)    |
| appointment_id | uuid REFERENCES public                               | YES      |                   | FK → public.appointments(id) |
| rating         | integer NOT NULL CHECK (rating >= 1 AND rating <= 5) | NO       |                   |                              |
| title          | text                                                 | YES      |                   |                              |
| review_text    | text                                                 | YES      |                   |                              |
| is_anonymous   | boolean DEFAULT false                                | YES      | false             |                              |
| is_verified    | boolean DEFAULT false                                | YES      | false             |                              |
| response_text  | text                                                 | YES      |                   |                              |
| response_at    | timestamp with time zone                             | YES      |                   |                              |
| is_published   | boolean DEFAULT true                                 | YES      | true              |                              |
| flagged        | boolean DEFAULT false                                | YES      | false             |                              |
| flagged_reason | text                                                 | YES      |                   |                              |
| created_at     | timestamp with time zone DEFAULT now()               | YES      | now()             |                              |
| updated_at     | timestamp with time zone DEFAULT now()               | YES      | now()             |                              |

**Indexes:**

- `idx_provider_reviews_provider_id` on (provider_id)
- `idx_provider_reviews_patient_id` on (patient_id)
- `idx_provider_reviews_rating` on (rating)

### providers

_Defined in 002_core_tables.sql_

**Primary Key:** `id`

| Column              | Type                                               | Nullable | Default           | Constraints |
| ------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                  | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id             | uuid                                               | YES      |                   |             |
| specialty           | text NOT NULL                                      | NO       |                   |             |
| license_number      | text NOT NULL UNIQUE                               | NO       |                   | UNIQUE      |
| years_of_experience | integer                                            | YES      |                   |             |
| education           | jsonb DEFAULT                                      | YES      | '[]'::jsonb       |             |
| certifications      | jsonb DEFAULT                                      | YES      | '[]'::jsonb       |             |
| consultation_fee    | numeric NOT NULL                                   | NO       |                   |             |
| available_days      | jsonb DEFAULT                                      | YES      | '[]'::jsonb       |             |
| available_hours     | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| bio                 | text                                               | YES      |                   |             |
| rating              | numeric DEFAULT 0                                  | YES      | 0.00              |             |
| total_consultations | integer DEFAULT 0                                  | YES      | 0                 |             |
| stripe_account_id   | text                                               | YES      |                   |             |
| created_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_providers_stripe_account` on (stripe_account_id)
- `idx_providers_status` on (status)
- `idx_providers_user_id` on (user_id)
- `idx_providers_stripe_onboarding` on (stripe_onboarding_complete)
- `idx_providers_specialty` on (specialty)
- `idx_providers_specialty_trgm` on (specialty gin_trgm_ops)
- `idx_providers_business_name_trgm` on (business_name gin_trgm_ops)
- `idx_providers_business_name` on (business_name)
- `idx_providers_created_at_desc` on (created_at DESC)

### recurring_billing

_Defined in 003_transactions_invoices.sql_

**Primary Key:** `id`

| Column                | Type                                               | Nullable | Default                    | Constraints |
| --------------------- | -------------------------------------------------- | -------- | -------------------------- | ----------- |
| id                    | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()          |             |
| patient_id            | uuid                                               | YES      |                            |             |
| provider_id           | uuid                                               | YES      |                            |             |
| description           | text NOT NULL                                      | NO       |                            |             |
| amount                | numeric NOT NULL                                   | NO       |                            |             |
| currency              | text DEFAULT                                       | YES      | 'INR'::text                |             |
| frequency             | frequency NOT NULL                                 | NO       |                            |             |
| status                | recurring_status DEFAULT                           | YES      | 'active'::recurring_status |             |
| start_date            | date NOT NULL                                      | NO       |                            |             |
| end_date              | date                                               | YES      |                            |             |
| next_billing_date     | date NOT NULL                                      | NO       |                            |             |
| last_billed_date      | date                                               | YES      |                            |             |
| total_cycles          | integer                                            | YES      |                            |             |
| completed_cycles      | integer DEFAULT 0                                  | YES      | 0                          |             |
| auto_generate_invoice | boolean DEFAULT true                               | YES      | true                       |             |
| created_by            | uuid                                               | YES      |                            |             |
| created_at            | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP          |             |
| updated_at            | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP          |             |

**Foreign Keys:**

- FOREIGN KEY (patient_id) REFERENCES public.patients(id)
- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_recurring_billing_patient` on (patient_id)
- `idx_recurring_billing_provider` on (provider_id)
- `idx_recurring_billing_status` on (status)
- `idx_recurring_billing_next_billing_date` on (next_billing_date)

### report_templates

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column             | Type                                                                                                                                                                                  | Nullable | Default            | Constraints |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ | ----------- |
| id                 | uuid NOT NULL DEFAULT uuid_generate_v4()                                                                                                                                              | NO       | uuid_generate_v4() |             |
| name               | text NOT NULL                                                                                                                                                                         | NO       |                    |             |
| description        | text                                                                                                                                                                                  | YES      |                    |             |
| report_type        | text NOT NULL CHECK (report_type = ANY (ARRAY['payment_trends'::text, 'compliance_audit'::text, 'provider_performance'::text, 'revenue_analysis'::text, 'transaction_summary'::text]) | NO       |                    |             |
| configuration      | jsonb DEFAULT                                                                                                                                                                         | YES      | '{}'::jsonb        |             |
| is_system_template | boolean DEFAULT false                                                                                                                                                                 | YES      | false              |             |
| created_by         | uuid                                                                                                                                                                                  | YES      |                    |             |
| created_at         | timestamp with time zone DEFAULT now()                                                                                                                                                | YES      | now()              |             |
| updated_at         | timestamp with time zone DEFAULT now()                                                                                                                                                | YES      | now()              |             |

**Foreign Keys:**

- FOREIGN KEY (created_by) REFERENCES auth.users(id)

### risk_detections

_Defined in 010_security_permissions.sql_

**Primary Key:** `id`

| Column           | Type                                                                                                                                             | Nullable | Default            | Constraints |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------ | ----------- |
| id               | uuid NOT NULL DEFAULT uuid_generate_v4()                                                                                                         | NO       | uuid_generate_v4() |             |
| risk_type        | text NOT NULL CHECK (risk_type = ANY (ARRAY['security'::text, 'compliance'::text, 'operational'::text, 'financial'::text, 'data_privacy'::text]) | NO       |                    |             |
| severity         | text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])                                         | NO       |                    |             |
| risk_score       | integer NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100)                                                                                   | NO       |                    |             |
| title            | text NOT NULL                                                                                                                                    | NO       |                    |             |
| description      | text NOT NULL                                                                                                                                    | NO       |                    |             |
| affected_systems | text[]                                                                                                                                           | YES      |                    |             |
| detection_source | text NOT NULL                                                                                                                                    | NO       |                    |             |
| detection_method | text                                                                                                                                             | YES      |                    |             |
| status           | text NOT NULL DEFAULT                                                                                                                            | NO       | 'open'::text       |             |
| assigned_to      | uuid                                                                                                                                             | YES      |                    |             |
| resolution_notes | text                                                                                                                                             | YES      |                    |             |
| resolved_at      | timestamp with time zone                                                                                                                         | YES      |                    |             |
| metadata         | jsonb DEFAULT                                                                                                                                    | YES      | '{}'::jsonb        |             |
| created_at       | timestamp with time zone DEFAULT now()                                                                                                           | YES      | now()              |             |
| updated_at       | timestamp with time zone DEFAULT now()                                                                                                           | YES      | now()              |             |

**Foreign Keys:**

- FOREIGN KEY (assigned_to) REFERENCES auth.users(id)

**Indexes:**

- `idx_risk_detections_status` on (status)
- `idx_risk_detections_severity` on (severity)

### role_permission_templates

_Defined in 010_security_permissions.sql_

**Primary Key:** `id`

| Column              | Type                                               | Nullable | Default           | Constraints |
| ------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                  | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| custom_role_id      | uuid                                               | YES      |                   |             |
| transaction_type    | transaction_type NOT NULL                          | NO       |                   |             |
| default_permissions | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| created_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id)

### sandbox_sessions

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column           | Type                                                                                                                  | Nullable | Default           | Constraints |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid()                                                                               | NO       | gen_random_uuid() |             |
| user_id          | uuid                                                                                                                  | YES      |                   |             |
| session_name     | text NOT NULL                                                                                                         | NO       |                   |             |
| endpoint         | text NOT NULL                                                                                                         | NO       |                   |             |
| http_method      | text NOT NULL CHECK (http_method = ANY (ARRAY['GET'::text, 'POST'::text, 'PUT'::text, 'DELETE'::text, 'PATCH'::text]) | NO       |                   |             |
| request_headers  | jsonb DEFAULT                                                                                                         | YES      | '{}'::jsonb       |             |
| request_body     | jsonb DEFAULT                                                                                                         | YES      | '{}'::jsonb       |             |
| response_status  | integer                                                                                                               | YES      |                   |             |
| response_body    | jsonb                                                                                                                 | YES      |                   |             |
| response_time_ms | integer                                                                                                               | YES      |                   |             |
| is_successful    | boolean DEFAULT false                                                                                                 | YES      | false             |             |
| error_message    | text                                                                                                                  | YES      |                   |             |
| created_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                                    | YES      | CURRENT_TIMESTAMP |             |
| updated_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                                    | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

### saved_reports

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column           | Type                                     | Nullable | Default            | Constraints |
| ---------------- | ---------------------------------------- | -------- | ------------------ | ----------- |
| id               | uuid NOT NULL DEFAULT uuid_generate_v4() | NO       | uuid_generate_v4() |             |
| user_id          | uuid NOT NULL                            | NO       |                    |             |
| template_id      | uuid                                     | YES      |                    |             |
| report_name      | text NOT NULL                            | NO       |                    |             |
| report_type      | text NOT NULL                            | NO       |                    |             |
| date_range_start | date NOT NULL                            | NO       |                    |             |
| date_range_end   | date NOT NULL                            | NO       |                    |             |
| filters          | jsonb DEFAULT                            | YES      | '{}'::jsonb        |             |
| report_data      | jsonb                                    | YES      |                    |             |
| generated_at     | timestamp with time zone DEFAULT now()   | YES      | now()              |             |
| created_at       | timestamp with time zone DEFAULT now()   | YES      | now()              |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES auth.users(id)
- FOREIGN KEY (template_id) REFERENCES public.report_templates(id)

**Indexes:**

- `idx_saved_reports_user_id` on (user_id)

### security_events

_Defined in 025_security_preferences.sql_

**Primary Key:** `id`

| Column             | Type                                       | Nullable | Default           | Constraints         |
| ------------------ | ------------------------------------------ | -------- | ----------------- | ------------------- |
| id                 | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY         |
| user_id            | uuid NOT NULL REFERENCES auth              | NO       |                   | FK → auth.users(id) |
| event_type         | text NOT NULL CHECK                        | NO       |                   |                     |
| ip_address         | inet                                       | YES      |                   |                     |
| user_agent         | text                                       | YES      |                   |                     |
| device_fingerprint | text                                       | YES      |                   |                     |
| location           | jsonb                                      | YES      |                   |                     |
| metadata           | jsonb DEFAULT                              | YES      | '{}'              |                     |
| created_at         | timestamptz DEFAULT now()                  | YES      | now()             |                     |

**Indexes:**

- `idx_security_events_user_id` on (user_id)
- `idx_security_events_type` on (event_type)
- `idx_security_events_created` on (created_at DESC)
- `idx_security_events_user_id` on (user_id)
- `idx_security_events_type` on (event_type)
- `idx_security_events_created` on (created_at DESC)

### security_threat_logs

_Defined in 010_security_permissions.sql_

**Primary Key:** `id`

| Column             | Type                                                                                                     | Nullable | Default           | Constraints |
| ------------------ | -------------------------------------------------------------------------------------------------------- | -------- | ----------------- | ----------- |
| id                 | uuid NOT NULL DEFAULT gen_random_uuid()                                                                  | NO       | gen_random_uuid() |             |
| threat_type        | text NOT NULL                                                                                            | NO       |                   |             |
| severity           | text NOT NULL CHECK (severity = ANY (ARRAY['critical'::text, 'high'::text, 'medium'::text, 'low'::text]) | NO       |                   |             |
| source_ip          | text                                                                                                     | YES      |                   |             |
| user_id            | uuid                                                                                                     | YES      |                   |             |
| resource_type      | text                                                                                                     | YES      |                   |             |
| resource_id        | uuid                                                                                                     | YES      |                   |             |
| threat_description | text NOT NULL                                                                                            | NO       |                   |             |
| detection_method   | text NOT NULL                                                                                            | NO       |                   |             |
| status             | text DEFAULT                                                                                             | YES      | 'detected'::text  |             |
| mitigation_action  | text                                                                                                     | YES      |                   |             |
| resolved_by        | uuid                                                                                                     | YES      |                   |             |
| resolved_at        | timestamp with time zone                                                                                 | YES      |                   |             |
| metadata           | jsonb DEFAULT                                                                                            | YES      | '{}'::jsonb       |             |
| created_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                       | YES      | CURRENT_TIMESTAMP |             |
| updated_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP                                                       | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
- FOREIGN KEY (resolved_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_security_threat_logs_user_id` on (user_id)
- `idx_security_threat_logs_status` on (status)
- `idx_security_threat_logs_created_at` on (created_at DESC)

### services

_Defined in 024_additional_tables.sql_

**Primary Key:** `id`

| Column                 | Type                                                          | Nullable | Default           | Constraints |
| ---------------------- | ------------------------------------------------------------- | -------- | ----------------- | ----------- |
| id                     | uuid PRIMARY KEY DEFAULT gen_random_uuid()                    | YES      | gen_random_uuid() | PRIMARY KEY |
| name                   | text NOT NULL                                                 | NO       |                   |             |
| description            | text                                                          | YES      |                   |             |
| category               | text NOT NULL                                                 | NO       |                   |             |
| code                   | text                                                          | YES      |                   |             |
| code_type              | text CHECK (code_type IN ('CPT', 'HCPCS', 'ICD-10', 'custom') | YES      |                   |             |
| default_price          | numeric(10,2)                                                 | NO       |                   |             |
| currency               | text DEFAULT                                                  | YES      | 'USD'             |             |
| duration_minutes       | integer                                                       | YES      |                   |             |
| is_active              | boolean DEFAULT true                                          | YES      | true              |             |
| requires_authorization | boolean DEFAULT false                                         | YES      | false             |             |
| metadata               | jsonb DEFAULT                                                 | YES      | '{}'              |             |
| created_at             | timestamptz DEFAULT now()                                     | YES      | now()             |             |
| updated_at             | timestamptz DEFAULT now()                                     | YES      | now()             |             |

**Indexes:**

- `idx_services_category` on (category)
- `idx_services_code` on (code)
- `idx_services_active` on (is_active)
- `idx_services_category` on (category)
- `idx_services_code` on (code)
- `idx_services_active` on (is_active)
- `idx_services_category` on (category)
- `idx_services_code` on (code)
- `idx_services_active` on (is_active)

### settings_activity_log

_Defined in 005_notifications_settings.sql_

**Primary Key:** `id`

| Column       | Type                                    | Nullable | Default           | Constraints |
| ------------ | --------------------------------------- | -------- | ----------------- | ----------- |
| id           | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| user_id      | uuid NOT NULL                           | NO       |                   |             |
| action       | text NOT NULL                           | NO       |                   |             |
| setting_type | text NOT NULL                           | NO       |                   |             |
| old_value    | jsonb                                   | YES      |                   |             |
| new_value    | jsonb                                   | YES      |                   |             |
| ip_address   | text                                    | YES      |                   |             |
| user_agent   | text                                    | YES      |                   |             |
| created_at   | timestamptz DEFAULT now()               | YES      | now()             |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES auth.users(id)

### stripe_webhook_events

_Defined in 015_stripe_integration.sql_

**Primary Key:** `id`

| Column       | Type                                       | Nullable | Default           | Constraints |
| ------------ | ------------------------------------------ | -------- | ----------------- | ----------- |
| id           | UUID PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY |
| event_id     | TEXT NOT NULL UNIQUE                       | NO       |                   | UNIQUE      |
| event_type   | TEXT NOT NULL                              | NO       |                   |             |
| payload      | JSONB                                      | YES      |                   |             |
| processed_at | TIMESTAMPTZ DEFAULT NOW()                  | YES      | NOW()             |             |
| created_at   | TIMESTAMPTZ DEFAULT NOW()                  | YES      | NOW()             |             |

**Indexes:**

- `idx_stripe_webhook_events_event_type` on (event_type)
- `idx_stripe_webhook_events_event_id` on (event_id)

### system_config

_Defined in 049_system_config.sql_

**Primary Key:** `id`

| Column     | Type                                        | Nullable | Default            | Constraints |
| ---------- | ------------------------------------------- | -------- | ------------------ | ----------- |
| id         | UUID PRIMARY KEY DEFAULT uuid_generate_v4() | YES      | uuid_generate_v4() | PRIMARY KEY |
| key        | TEXT UNIQUE NOT NULL                        | NO       |                    | UNIQUE      |
| value      | JSONB NOT NULL                              | NO       |                    |             |
| created_at | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |             |
| updated_at | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |             |

### system_performance_metrics

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column             | Type                                               | Nullable | Default           | Constraints |
| ------------------ | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                 | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| metric_type        | text NOT NULL                                      | NO       |                   |             |
| metric_name        | text NOT NULL                                      | NO       |                   |             |
| metric_value       | numeric NOT NULL                                   | NO       |                   |             |
| metric_unit        | text                                               | YES      |                   |             |
| threshold_warning  | numeric                                            | YES      |                   |             |
| threshold_critical | numeric                                            | YES      |                   |             |
| status             | text DEFAULT                                       | YES      | 'normal'::text    |             |
| component          | text                                               | YES      |                   |             |
| metadata           | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| recorded_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

### team_invitations

_Defined in 005_notifications_settings.sql_

**Primary Key:** `id`

| Column           | Type                                    | Nullable | Default                      | Constraints |
| ---------------- | --------------------------------------- | -------- | ---------------------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid()            |             |
| email            | text NOT NULL                           | NO       |                              |             |
| invited_by       | uuid                                    | YES      |                              |             |
| role             | user_role DEFAULT                       | YES      | 'patient'::user_role         |             |
| status           | invitation_status DEFAULT               | YES      | 'pending'::invitation_status |             |
| invitation_token | text NOT NULL UNIQUE                    | NO       |                              | UNIQUE      |
| expires_at       | timestamptz NOT NULL                    | NO       |                              |             |
| accepted_at      | timestamptz                             | YES      |                              |             |
| declined_at      | timestamptz                             | YES      |                              |             |
| metadata         | jsonb DEFAULT                           | YES      | '{}'::jsonb                  |             |
| created_at       | timestamptz DEFAULT CURRENT_TIMESTAMP   | YES      | CURRENT_TIMESTAMP            |             |
| updated_at       | timestamptz DEFAULT CURRENT_TIMESTAMP   | YES      | CURRENT_TIMESTAMP            |             |

**Foreign Keys:**

- FOREIGN KEY (invited_by) REFERENCES public.user_profiles(id)

### transaction_flow_metrics

_Defined in 009_analytics_monitoring.sql_

**Primary Key:** `id`

| Column                       | Type                                               | Nullable | Default           | Constraints |
| ---------------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                           | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| time_bucket                  | timestamp with time zone NOT NULL                  | NO       |                   |             |
| total_transactions           | integer DEFAULT 0                                  | YES      | 0                 |             |
| successful_transactions      | integer DEFAULT 0                                  | YES      | 0                 |             |
| failed_transactions          | integer DEFAULT 0                                  | YES      | 0                 |             |
| pending_transactions         | integer DEFAULT 0                                  | YES      | 0                 |             |
| total_volume                 | numeric DEFAULT 0                                  | YES      | 0                 |             |
| average_transaction_time_ms  | integer                                            | YES      |                   |             |
| peak_transactions_per_minute | integer                                            | YES      |                   |             |
| fraud_alerts_triggered       | integer DEFAULT 0                                  | YES      | 0                 |             |
| created_at                   | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Indexes:**

- `idx_transaction_flow_metrics_time_bucket` on (time_bucket DESC)

### transaction_permissions

_Defined in 010_security_permissions.sql_

**Primary Key:** `id`

| Column           | Type                                               | Nullable | Default           | Constraints |
| ---------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id          | uuid                                               | YES      |                   |             |
| custom_role_id   | uuid                                               | YES      |                   |             |
| transaction_type | transaction_type NOT NULL                          | NO       |                   |             |
| can_view         | boolean DEFAULT false                              | YES      | false             |             |
| can_create       | boolean DEFAULT false                              | YES      | false             |             |
| can_edit         | boolean DEFAULT false                              | YES      | false             |             |
| can_delete       | boolean DEFAULT false                              | YES      | false             |             |
| can_approve      | boolean DEFAULT false                              | YES      | false             |             |
| can_export       | boolean DEFAULT false                              | YES      | false             |             |
| restrictions     | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| granted_by       | uuid                                               | YES      |                   |             |
| granted_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| expires_at       | timestamp with time zone                           | YES      |                   |             |
| is_active        | boolean DEFAULT true                               | YES      | true              |             |
| created_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
- FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id)
- FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_transaction_permissions_user_id` on (user_id)

### transactions

_Defined in 003_transactions_invoices.sql_

**Primary Key:** `id`

| Column            | Type                                               | Nullable | Default                   | Constraints |
| ----------------- | -------------------------------------------------- | -------- | ------------------------- | ----------- |
| id                | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()         |             |
| patient_id        | uuid                                               | YES      |                           |             |
| provider_id       | uuid                                               | YES      |                           |             |
| appointment_id    | uuid                                               | YES      |                           |             |
| payment_intent_id | text UNIQUE                                        | YES      |                           | UNIQUE      |
| stripe_charge_id  | text                                               | YES      |                           |             |
| amount            | numeric NOT NULL                                   | NO       |                           |             |
| currency          | text DEFAULT                                       | YES      | 'INR'::text               |             |
| payment_method    | payment_method_type                                | YES      |                           |             |
| payment_status    | payment_status DEFAULT                             | YES      | 'pending'::payment_status |             |
| description       | text                                               | YES      |                           |             |
| billing_name      | text                                               | YES      |                           |             |
| billing_email     | text                                               | YES      |                           |             |
| billing_address   | jsonb DEFAULT                                      | YES      | '{}'::jsonb               |             |
| metadata          | jsonb DEFAULT                                      | YES      | '{}'::jsonb               |             |
| created_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP         |             |
| updated_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP         |             |

**Foreign Keys:**

- FOREIGN KEY (patient_id) REFERENCES public.patients(id)
- FOREIGN KEY (provider_id) REFERENCES public.providers(id)
- FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)

**Indexes:**

- `idx_transactions_stripe_pi` on (stripe_payment_intent_id)
- `idx_transactions_stripe_charge` on (stripe_charge_id)
- `idx_transactions_created_at` on (created_at)
- `idx_transactions_patient_id` on (patient_id)
- `idx_transactions_provider_id` on (provider_id)
- `idx_transactions_appointment_id` on (appointment_id)
- `idx_transactions_payment_status` on (payment_status)
- `idx_transactions_patient_status` on (patient_id, payment_status)
- `idx_transactions_status` on (status)
- `idx_transactions_status_created` on (status, created_at DESC)
- `idx_transactions_provider_created` on (provider_id, created_at DESC)

### user_permissions

_Defined in 010_security_permissions.sql_

**Primary Key:** `id`

| Column     | Type                                               | Nullable | Default           | Constraints |
| ---------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id         | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id    | uuid                                               | YES      |                   |             |
| permission | permission_type NOT NULL                           | NO       |                   |             |
| granted_by | uuid                                               | YES      |                   |             |
| granted_at | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| expires_at | timestamp with time zone                           | YES      |                   |             |
| is_active  | boolean DEFAULT true                               | YES      | true              |             |
| created_at | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
- FOREIGN KEY (granted_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_user_permissions_user_id` on (user_id)

### user_profiles

_Defined in 002_core_tables.sql_

**Primary Key:** `id`

| Column             | Type                                               | Nullable | Default              | Constraints |
| ------------------ | -------------------------------------------------- | -------- | -------------------- | ----------- |
| id                 | uuid NOT NULL                                      | NO       |                      |             |
| email              | text NOT NULL UNIQUE                               | NO       |                      | UNIQUE      |
| full_name          | text NOT NULL                                      | NO       |                      |             |
| role               | user_role DEFAULT                                  | YES      | 'patient'::user_role |             |
| phone              | text                                               | YES      |                      |             |
| avatar_url         | text                                               | YES      |                      |             |
| stripe_customer_id | text                                               | YES      |                      |             |
| is_active          | boolean DEFAULT true                               | YES      | true                 |             |
| created_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP    |             |
| updated_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP    |             |

**Foreign Keys:**

- FOREIGN KEY (id) REFERENCES auth.users(id)

**Indexes:**

- `idx_user_profiles_stripe_customer` on (stripe_customer_id)
- `idx_user_profiles_recovery_phone` on (recovery_phone)
- `idx_user_profiles_status` on (status)
- `idx_user_profiles_last_login` on (last_login)
- `idx_user_profiles_role` on (role)
- `idx_user_profiles_email` on (email)
- `idx_user_profiles_phone` on (phone)
- `idx_user_profiles_status_role_created` on (status, role, created_at DESC)

### user_role_assignments

_Defined in 010_security_permissions.sql_

**Primary Key:** `id`

| Column         | Type                                               | Nullable | Default           | Constraints |
| -------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id             | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id        | uuid                                               | YES      |                   |             |
| custom_role_id | uuid                                               | YES      |                   |             |
| assigned_by    | uuid                                               | YES      |                   |             |
| assigned_at    | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| expires_at     | timestamp with time zone                           | YES      |                   |             |
| is_active      | boolean DEFAULT true                               | YES      | true              |             |
| created_at     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at     | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
- FOREIGN KEY (custom_role_id) REFERENCES public.custom_roles(id)
- FOREIGN KEY (assigned_by) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_user_role_assignments_user_id` on (user_id)

### vector_memory

_Defined in 048_port_missing_features.sql_

**Primary Key:** `id`

| Column     | Type                                        | Nullable | Default            | Constraints         |
| ---------- | ------------------------------------------- | -------- | ------------------ | ------------------- |
| id         | UUID PRIMARY KEY DEFAULT uuid_generate_v4() | YES      | uuid_generate_v4() | PRIMARY KEY         |
| user_id    | UUID NOT NULL REFERENCES auth               | NO       |                    | FK → auth.users(id) |
| embedding  | JSONB NOT NULL                              | NO       |                    |                     |
| context    | TEXT                                        | YES      |                    |                     |
| created_at | TIMESTAMPTZ DEFAULT NOW()                   | YES      | NOW()              |                     |

**Indexes:**

- `idx_vector_memory_user_id` on (user_id)

### wallet_audit_log

_Defined in 021_wallet_integration.sql_

**Primary Key:** `id`

| Column           | Type                                       | Nullable | Default           | Constraints                    |
| ---------------- | ------------------------------------------ | -------- | ----------------- | ------------------------------ |
| id               | uuid PRIMARY KEY DEFAULT gen_random_uuid() | YES      | gen_random_uuid() | PRIMARY KEY                    |
| user_id          | uuid REFERENCES auth                       | YES      |                   | FK → auth.users(id)            |
| provider_id      | uuid REFERENCES public                     | YES      |                   | FK → public.providers(id)      |
| linked_wallet_id | uuid REFERENCES public                     | YES      |                   | FK → public.linked_wallets(id) |
| action           | text NOT NULL                              | NO       |                   |                                |
| action_details   | jsonb DEFAULT                              | YES      | '{}'::jsonb       |                                |
| ip_address       | inet                                       | YES      |                   |                                |
| user_agent       | text                                       | YES      |                   |                                |
| success          | boolean NOT NULL                           | NO       |                   |                                |
| error_message    | text                                       | YES      |                   |                                |
| created_at       | timestamp with time zone DEFAULT now()     | YES      | now()             |                                |

**Indexes:**

- `idx_wallet_audit_user` on (user_id)
- `idx_wallet_audit_provider` on (provider_id)
- `idx_wallet_audit_created` on (created_at DESC)
- `idx_wallet_audit_user` on (user_id)
- `idx_wallet_audit_provider` on (provider_id)
- `idx_wallet_audit_created` on (created_at DESC)

### wallet_transactions

_Defined in 021_wallet_integration.sql_

**Primary Key:** `id`

| Column                 | Type                                                                        | Nullable | Default           | Constraints                    |
| ---------------------- | --------------------------------------------------------------------------- | -------- | ----------------- | ------------------------------ |
| id                     | uuid PRIMARY KEY DEFAULT gen_random_uuid()                                  | YES      | gen_random_uuid() | PRIMARY KEY                    |
| linked_wallet_id       | uuid NOT NULL REFERENCES public                                             | NO       |                   | FK → public.linked_wallets(id) |
| provider_id            | uuid NOT NULL REFERENCES public                                             | NO       |                   | FK → public.providers(id)      |
| transaction_type       | text NOT NULL CHECK (transaction_type IN ('payout', 'refund', 'adjustment') | NO       |                   |                                |
| amount                 | numeric(18,8)                                                               | NO       |                   |                                |
| currency               | text NOT NULL DEFAULT                                                       | NO       | 'USDC'            |                                |
| fiat_equivalent        | numeric(12,2)                                                               | YES      |                   |                                |
| exchange_rate          | numeric(18,8)                                                               | YES      |                   |                                |
| blockchain_network     | blockchain_network NOT NULL                                                 | NO       |                   |                                |
| tx_hash                | text                                                                        | YES      |                   |                                |
| block_number           | bigint                                                                      | YES      |                   |                                |
| gas_fee                | numeric(18,8)                                                               | YES      |                   |                                |
| status                 | text NOT NULL DEFAULT                                                       | NO       | 'pending'         |                                |
| confirmations          | integer DEFAULT 0                                                           | YES      | 0                 |                                |
| required_confirmations | integer DEFAULT 12                                                          | YES      | 12                |                                |
| settlement_id          | uuid                                                                        | YES      |                   |                                |
| invoice_ids            | uuid[]                                                                      | YES      |                   |                                |
| error_message          | text                                                                        | YES      |                   |                                |
| retry_count            | integer DEFAULT 0                                                           | YES      | 0                 |                                |
| initiated_at           | timestamp with time zone DEFAULT now()                                      | YES      | now()             |                                |
| confirmed_at           | timestamp with time zone                                                    | YES      |                   |                                |
| created_at             | timestamp with time zone DEFAULT now()                                      | YES      | now()             |                                |
| updated_at             | timestamp with time zone DEFAULT now()                                      | YES      | now()             |                                |

**Indexes:**

- `idx_wallet_transactions_wallet` on (linked_wallet_id)
- `idx_wallet_transactions_provider` on (provider_id)
- `idx_wallet_transactions_status` on (status)
- `idx_wallet_transactions_tx_hash` on (tx_hash)
- `idx_wallet_transactions_wallet` on (linked_wallet_id)
- `idx_wallet_transactions_provider` on (provider_id)
- `idx_wallet_transactions_status` on (status)
- `idx_wallet_transactions_tx_hash` on (tx_hash)

### wallet_verification_challenges

_Defined in 021_wallet_integration.sql_

**Primary Key:** `id`

| Column             | Type                                             | Nullable | Default                         | Constraints         |
| ------------------ | ------------------------------------------------ | -------- | ------------------------------- | ------------------- |
| id                 | uuid PRIMARY KEY DEFAULT gen_random_uuid()       | YES      | gen_random_uuid()               | PRIMARY KEY         |
| user_id            | uuid NOT NULL REFERENCES auth                    | NO       |                                 | FK → auth.users(id) |
| wallet_address     | text NOT NULL                                    | NO       |                                 |                     |
| blockchain_network | blockchain_network NOT NULL                      | NO       |                                 |                     |
| challenge_message  | text NOT NULL                                    | NO       |                                 |                     |
| nonce              | text NOT NULL                                    | NO       |                                 |                     |
| status             | text NOT NULL DEFAULT                            | NO       | 'pending'                       |                     |
| signature          | text                                             | YES      |                                 |                     |
| expires_at         | timestamp with time zone NOT NULL DEFAULT (now() | NO       | (now() + interval '15 minutes') |                     |
| completed_at       | timestamp with time zone                         | YES      |                                 |                     |
| ip_address         | inet                                             | YES      |                                 |                     |
| user_agent         | text                                             | YES      |                                 |                     |
| created_at         | timestamp with time zone DEFAULT now()           | YES      | now()                           |                     |

**Indexes:**

- `idx_wallet_challenges_address` on (wallet_address)
- `idx_wallet_challenges_expires` on (expires_at)
- `idx_wallet_challenges_address` on (wallet_address)
- `idx_wallet_challenges_expires` on (expires_at)

### webhook_delivery_attempts

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column              | Type                                               | Nullable | Default           | Constraints |
| ------------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                  | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| webhook_endpoint_id | uuid                                               | YES      |                   |             |
| event_type          | text NOT NULL                                      | NO       |                   |             |
| payload             | jsonb NOT NULL                                     | NO       |                   |             |
| status              | text DEFAULT                                       | YES      | 'pending'::text   |             |
| http_status_code    | integer                                            | YES      |                   |             |
| request_headers     | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| response_body       | text                                               | YES      |                   |             |
| error_message       | text                                               | YES      |                   |             |
| attempt_number      | integer DEFAULT 1                                  | YES      | 1                 |             |
| max_attempts        | integer DEFAULT 3                                  | YES      | 3                 |             |
| next_retry_at       | timestamp with time zone                           | YES      |                   |             |
| delivered_at        | timestamp with time zone                           | YES      |                   |             |
| created_at          | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (webhook_endpoint_id) REFERENCES public.webhook_endpoints(id)

**Indexes:**

- `idx_webhook_delivery_attempts_endpoint_id` on (webhook_endpoint_id)
- `idx_webhook_delivery_attempts_status` on (status)

### webhook_delivery_logs

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column           | Type                                               | Nullable | Default                    | Constraints |
| ---------------- | -------------------------------------------------- | -------- | -------------------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()          |             |
| webhook_id       | uuid                                               | YES      |                            |             |
| webhook_event_id | uuid                                               | YES      |                            |             |
| status           | delivery_status DEFAULT                            | YES      | 'pending'::delivery_status |             |
| http_status_code | integer                                            | YES      |                            |             |
| request_headers  | jsonb DEFAULT                                      | YES      | '{}'::jsonb                |             |
| request_body     | jsonb                                              | YES      |                            |             |
| response_headers | jsonb DEFAULT                                      | YES      | '{}'::jsonb                |             |
| response_body    | text                                               | YES      |                            |             |
| error_message    | text                                               | YES      |                            |             |
| attempt_number   | integer DEFAULT 1                                  | YES      | 1                          |             |
| delivered_at     | timestamp with time zone                           | YES      |                            |             |
| next_retry_at    | timestamp with time zone                           | YES      |                            |             |
| created_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP          |             |

**Foreign Keys:**

- FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id)
- FOREIGN KEY (webhook_event_id) REFERENCES public.webhook_events(id)

**Indexes:**

- `idx_webhook_delivery_logs_webhook_id` on (webhook_id)
- `idx_webhook_delivery_logs_status` on (status)

### webhook_endpoints

_Defined in 002_core_tables.sql_

**Primary Key:** `id`

| Column             | Type                                               | Nullable | Default           | Constraints |
| ------------------ | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id                 | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id            | uuid                                               | YES      |                   |             |
| name               | text NOT NULL                                      | NO       |                   |             |
| url                | text NOT NULL                                      | NO       |                   |             |
| description        | text                                               | YES      |                   |             |
| secret_key         | text NOT NULL                                      | NO       |                   |             |
| status             | text DEFAULT                                       | YES      | 'active'::text    |             |
| is_verified        | boolean DEFAULT false                              | YES      | false             |             |
| verification_token | text                                               | YES      |                   |             |
| verified_at        | timestamp with time zone                           | YES      |                   |             |
| created_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| updated_at         | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_webhook_endpoints_user_id` on (user_id)

### webhook_events

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column       | Type                                               | Nullable | Default           | Constraints |
| ------------ | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id           | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| webhook_id   | uuid                                               | YES      |                   |             |
| event_type   | webhook_event_type NOT NULL                        | NO       |                   |             |
| payload      | jsonb NOT NULL                                     | NO       |                   |             |
| triggered_at | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |
| created_at   | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id)

**Indexes:**

- `idx_webhook_events_webhook_id` on (webhook_id)

### webhook_retry_policies

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column                | Type                                               | Nullable | Default                       | Constraints |
| --------------------- | -------------------------------------------------- | -------- | ----------------------------- | ----------- |
| id                    | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()             |             |
| webhook_id            | uuid                                               | YES      |                               |             |
| max_attempts          | integer DEFAULT 3                                  | YES      | 3                             |             |
| retry_strategy        | retry_strategy DEFAULT                             | YES      | 'exponential'::retry_strategy |             |
| initial_delay_seconds | integer DEFAULT 60                                 | YES      | 60                            |             |
| max_delay_seconds     | integer DEFAULT 3600                               | YES      | 3600                          |             |
| backoff_multiplier    | numeric DEFAULT 2                                  | YES      | 2.0                           |             |
| is_enabled            | boolean DEFAULT true                               | YES      | true                          |             |
| created_at            | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP             |             |
| updated_at            | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP             |             |

**Foreign Keys:**

- FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id)

### webhook_settings

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column              | Type                                    | Nullable | Default           | Constraints |
| ------------------- | --------------------------------------- | -------- | ----------------- | ----------- |
| id                  | uuid NOT NULL DEFAULT gen_random_uuid() | NO       | gen_random_uuid() |             |
| user_id             | uuid NOT NULL                           | NO       |                   |             |
| webhook_id          | uuid                                    | YES      |                   |             |
| retry_attempts      | integer DEFAULT 3                       | YES      | 3                 |             |
| retry_delay_seconds | integer DEFAULT 60                      | YES      | 60                |             |
| signature_secret    | text                                    | YES      |                   |             |
| custom_headers      | jsonb DEFAULT                           | YES      | '{}'::jsonb       |             |
| created_at          | timestamp with time zone DEFAULT now()  | YES      | now()             |             |
| updated_at          | timestamp with time zone DEFAULT now()  | YES      | now()             |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES auth.users(id)
- FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id)

### webhook_test_logs

_Defined in 008_webhooks_api.sql_

**Primary Key:** `id`

| Column           | Type                                               | Nullable | Default           | Constraints |
| ---------------- | -------------------------------------------------- | -------- | ----------------- | ----------- |
| id               | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid() |             |
| user_id          | uuid                                               | YES      |                   |             |
| test_name        | text NOT NULL                                      | NO       |                   |             |
| webhook_url      | text NOT NULL                                      | NO       |                   |             |
| event_type       | text NOT NULL                                      | NO       |                   |             |
| payload          | jsonb NOT NULL                                     | NO       |                   |             |
| headers          | jsonb DEFAULT                                      | YES      | '{}'::jsonb       |             |
| response_status  | integer                                            | YES      |                   |             |
| response_body    | text                                               | YES      |                   |             |
| response_time_ms | integer                                            | YES      |                   |             |
| is_successful    | boolean DEFAULT false                              | YES      | false             |             |
| error_message    | text                                               | YES      |                   |             |
| created_at       | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

### webhooks

_Defined in 002_core_tables.sql_

**Primary Key:** `id`

| Column            | Type                                               | Nullable | Default                  | Constraints |
| ----------------- | -------------------------------------------------- | -------- | ------------------------ | ----------- |
| id                | uuid NOT NULL DEFAULT gen_random_uuid()            | NO       | gen_random_uuid()        |             |
| user_id           | uuid                                               | YES      |                          |             |
| name              | text NOT NULL                                      | NO       |                          |             |
| url               | text NOT NULL                                      | NO       |                          |             |
| description       | text                                               | YES      |                          |             |
| status            | webhook_status DEFAULT                             | YES      | 'active'::webhook_status |             |
| secret_key        | text NOT NULL                                      | NO       |                          |             |
| subscribed_events | jsonb DEFAULT                                      | YES      | '[]'::jsonb              |             |
| headers           | jsonb DEFAULT                                      | YES      | '{}'::jsonb              |             |
| timeout_seconds   | integer DEFAULT 30                                 | YES      | 30                       |             |
| is_active         | boolean DEFAULT true                               | YES      | true                     |             |
| created_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP        |             |
| updated_at        | timestamp with time zone DEFAULT CURRENT_TIMESTAMP | YES      | CURRENT_TIMESTAMP        |             |

**Foreign Keys:**

- FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)

**Indexes:**

- `idx_webhooks_user_id` on (user_id)

---

## Summary

- **Tables:** 119
- **Enums:** 54
- **Indexes:** 273
- **Migration files:** 55
