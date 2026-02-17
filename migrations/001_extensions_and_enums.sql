-- Migration 001: Extensions and Enum Types
-- Run this FIRST in your Supabase SQL editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM TYPE DEFINITIONS
CREATE TYPE api_environment AS ENUM ('sandbox', 'production');
CREATE TYPE api_key_status AS ENUM ('active', 'inactive', 'revoked', 'expired');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE audit_access_level AS ENUM ('none', 'read', 'write', 'admin');
CREATE TYPE bank_verification_status AS ENUM ('not_started', 'pending', 'verified', 'failed');
CREATE TYPE chargeback_status AS ENUM ('pending', 'won', 'lost', 'in_review');
CREATE TYPE delivery_status AS ENUM ('pending', 'delivered', 'failed', 'retrying');
CREATE TYPE dispute_reason AS ENUM ('fraud', 'duplicate', 'product_not_received', 'service_not_provided', 'other');
CREATE TYPE dispute_status AS ENUM ('new', 'under_review', 'resolved', 'rejected');
CREATE TYPE document_status AS ENUM ('pending_upload', 'uploaded', 'reviewed', 'approved', 'rejected', 'expired');
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed', 'opened', 'clicked');
CREATE TYPE email_template_type AS ENUM ('invoice', 'payment', 'reminder', 'notification', 'marketing', 'system');
CREATE TYPE frequency AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status AS ENUM ('open', 'acknowledged', 'resolved', 'closed');
CREATE TYPE incident_type AS ENUM ('security', 'compliance', 'operational', 'other');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled', 'declined');
CREATE TYPE invoice_operation_type AS ENUM ('created', 'updated', 'sent', 'paid', 'cancelled', 'refunded');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded');
CREATE TYPE method_type AS ENUM ('card', 'bank_account', 'wallet');
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE notification_read_status AS ENUM ('unread', 'read', 'archived');
CREATE TYPE notification_type AS ENUM ('system', 'transaction', 'security', 'compliance', 'marketing');
CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');
CREATE TYPE onboarding_step_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');
CREATE TYPE payment_method_type AS ENUM ('credit_card', 'debit_card', 'bank_transfer', 'upi', 'wallet');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
CREATE TYPE permission_type AS ENUM ('read', 'write', 'delete', 'admin');
CREATE TYPE recurring_status AS ENUM ('active', 'paused', 'cancelled', 'completed');
CREATE TYPE resolution_outcome AS ENUM ('won', 'lost', 'partial', 'withdrawn');
CREATE TYPE retry_strategy AS ENUM ('exponential', 'linear', 'fixed');
CREATE TYPE transaction_type AS ENUM ('payment', 'refund', 'chargeback', 'transfer', 'adjustment');
CREATE TYPE user_role AS ENUM ('patient', 'provider', 'admin', 'staff');
CREATE TYPE verification_status AS ENUM ('not_started', 'pending', 'verified', 'failed');
CREATE TYPE webhook_event_type AS ENUM ('payment.created', 'payment.completed', 'payment.failed', 'invoice.created', 'invoice.paid', 'dispute.created', 'dispute.resolved');
CREATE TYPE webhook_status AS ENUM ('active', 'inactive', 'failed');
