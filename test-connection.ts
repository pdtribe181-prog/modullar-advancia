// Comprehensive Supabase connection & table accessibility test
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// All tables defined in migrations (110 tables)
const ALL_TABLES = [
  // ── Core / Users ──────────────────────────────────────────
  'user_profiles',
  'patients',
  'providers',
  'custom_roles',
  'user_permissions',
  'user_role_assignments',
  'role_permission_templates',
  'team_invitations',

  // ── Appointments & Medical ────────────────────────────────
  'appointments',
  'appointment_waitlist',
  'medical_records',
  'prescriptions',
  'lab_results',
  'services',
  'provider_notes',
  'provider_reviews',
  'patient_consents',
  'messages',

  // ── Payments & Billing ────────────────────────────────────
  'transactions',
  'transaction_permissions',
  'invoices',
  'invoice_items',
  'invoice_disputes',
  'invoice_operations',
  'payment_methods',
  'payment_plans',
  'payment_plan_transactions',
  'payment_history',
  'payment_preferences',
  'recurring_billing',

  // ── Stripe / Crypto / Wallets ─────────────────────────────
  'stripe_webhook_events',
  'crypto_transactions',
  'linked_wallets',
  'wallet_transactions',
  'wallet_audit_log',
  'wallet_verification_challenges',
  'bank_connection_setup',
  'bank_wallet_verification',

  // ── Disputes & Chargebacks ────────────────────────────────
  'disputes',
  'dispute_evidence',
  'dispute_notifications',
  'dispute_timeline',
  'chargebacks',

  // ── Insurance ─────────────────────────────────────────────
  'insurance_claims',
  'claim_history',

  // ── Compliance & Security ─────────────────────────────────
  'compliance_logs',
  'compliance_status',
  'compliance_violations',
  'compliance_verification_steps',
  'compliance_workflow_rules',
  'compliance_workflow_executions',
  'provider_compliance_records',
  'hipaa_audit_log',
  'phi_access_log',
  'security_events',
  'security_threat_logs',
  'risk_detections',

  // ── Notifications & Email ─────────────────────────────────
  'notifications',
  'notification_preferences',
  'notification_queue',
  'email_templates',
  'email_settings',
  'email_history',

  // ── Webhooks & API ────────────────────────────────────────
  'webhooks',
  'webhook_endpoints',
  'webhook_events',
  'webhook_delivery_attempts',
  'webhook_delivery_logs',
  'webhook_retry_policies',
  'webhook_settings',
  'webhook_test_logs',
  'api_keys',
  'api_key_permissions',
  'api_key_rotation_history',
  'api_usage_logs',
  'event_subscriptions',

  // ── Analytics & Monitoring ────────────────────────────────
  'analytics_insights',
  'advanced_analytics_reports',
  'anomaly_alerts',
  'performance_alerts',
  'system_performance_metrics',
  'transaction_flow_metrics',
  'provider_performance_metrics',
  'provider_payment_volumes',
  'saved_reports',
  'report_templates',

  // ── Provider Onboarding & Settings ────────────────────────
  'provider_onboarding',
  'provider_documents',
  'onboarding_checklist_items',
  'onboarding_workflow_steps',
  'onboarding_email_log',
  'onboarding_team_invitations',
  'guided_onboarding_progress',
  'go_live_checklist',
  'organization_settings',
  'brand_customization',

  // ── Audit & Backup ────────────────────────────────────────
  'access_audit_logs',
  'audit_access_controls',
  'audit_log_exports',
  'data_backup_logs',
  'data_backup_schedules',
  'settings_activity_log',
  'incident_responses',
  'incident_activity_logs',

  // ── Developer Portal ──────────────────────────────────────
  'sandbox_sessions',
  'developer_portal_analytics',
  'code_snippet_usage',
  'api_documentation_feedback',
  'integration_health_checks',
  'integration_health_logs',
];

interface TestResult {
  table: string;
  status: 'accessible' | 'rls_blocked' | 'missing' | 'error';
  message?: string;
}

async function checkTable(table: string): Promise<TestResult> {
  try {
    const { error } = await supabase.from(table).select('*').limit(1);

    if (error) {
      // 42P01 = relation does not exist (table missing)
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return { table, status: 'missing', message: error.message };
      }
      // RLS or permission errors still mean the table exists
      if (
        error.code === '42501' ||
        error.message.includes('permission denied') ||
        error.message.includes('row-level security')
      ) {
        return {
          table,
          status: 'rls_blocked',
          message: 'RLS policy blocks anon access (expected)',
        };
      }
      return { table, status: 'error', message: `${error.code}: ${error.message}` };
    }
    return { table, status: 'accessible' };
  } catch (e: any) {
    return { table, status: 'error', message: e.message };
  }
}

async function testConnection() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     Modullar Advancia — Supabase Connection Test           ║');
  console.log('║     Checking all 110 project tables                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Tables to check: ${ALL_TABLES.length}\n`);

  // Run all checks in parallel (batched to avoid rate limits)
  const BATCH_SIZE = 15;
  const results: TestResult[] = [];

  for (let i = 0; i < ALL_TABLES.length; i += BATCH_SIZE) {
    const batch = ALL_TABLES.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(checkTable));
    results.push(...batchResults);
  }

  // Group results
  const accessible = results.filter((r) => r.status === 'accessible');
  const rlsBlocked = results.filter((r) => r.status === 'rls_blocked');
  const missing = results.filter((r) => r.status === 'missing');
  const errors = results.filter((r) => r.status === 'error');

  // Print accessible tables
  if (accessible.length > 0) {
    console.log(`\n✅ ACCESSIBLE (${accessible.length} tables):`);
    accessible.forEach((r) => console.log(`   ✅ ${r.table}`));
  }

  // Print RLS-blocked (still exist, just not accessible via anon key)
  if (rlsBlocked.length > 0) {
    console.log(
      `\n🔒 RLS-BLOCKED — tables exist but anon key blocked by RLS (${rlsBlocked.length} tables):`
    );
    rlsBlocked.forEach((r) => console.log(`   🔒 ${r.table}`));
  }

  // Print missing tables
  if (missing.length > 0) {
    console.log(`\n❌ MISSING — tables not found in database (${missing.length} tables):`);
    missing.forEach((r) => console.log(`   ❌ ${r.table} — ${r.message}`));
  }

  // Print errors
  if (errors.length > 0) {
    console.log(`\n⚠️  ERRORS (${errors.length} tables):`);
    errors.forEach((r) => console.log(`   ⚠️  ${r.table} — ${r.message}`));
  }

  // Summary
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Total tables:   ${ALL_TABLES.length}`);
  console.log(`  ✅ Accessible:  ${accessible.length}`);
  console.log(`  🔒 RLS blocked: ${rlsBlocked.length}`);
  console.log(`  ❌ Missing:     ${missing.length}`);
  console.log(`  ⚠️  Errors:     ${errors.length}`);
  console.log(`  📊 Exist total: ${accessible.length + rlsBlocked.length} / ${ALL_TABLES.length}`);
  console.log('══════════════════════════════════════════════════════════════');

  if (missing.length > 0) {
    console.log('\n💡 To create missing tables, run the relevant migration:');
    console.log('   npx tsx scripts/run-migration-rest.ts <migration_file>');
  }

  if (missing.length === 0 && errors.length === 0) {
    console.log('\n🎉 All tables are present in the database!');
  }
}

testConnection();
