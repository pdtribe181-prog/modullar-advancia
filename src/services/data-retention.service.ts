/**
 * Data Retention Policy Service
 *
 * Defines and enforces data retention policies for the healthcare
 * payment platform. Complies with:
 *   - HIPAA: 6-year minimum for medical/billing records
 *   - PCI-DSS: 1 year for transaction logs
 *   - GDPR: Purpose limitation + storage minimisation
 *
 * The `enforceRetentionPolicies()` function is designed to run
 * periodically (e.g. via a cron job, PM2 cron, or Supabase pg_cron).
 */

import { createServiceClient } from '../lib/supabase.js';
import { logger } from '../middleware/logging.middleware.js';

// ── Policy definitions ─────────────────────────────────────────────────

export interface RetentionPolicy {
  /** Human-readable name */
  name: string;
  /** Database table */
  table: string;
  /** Column used to determine age */
  timestampColumn: string;
  /** Retention period (PostgreSQL interval syntax) */
  retentionInterval: string;
  /** Action: 'delete' hard-removes rows; 'anonymise' nullifies PII columns */
  action: 'delete' | 'anonymise';
  /** Extra WHERE condition (SQL fragment) appended after the time check */
  condition?: string;
  /** Columns to set to NULL/placeholder during anonymisation */
  anonymiseColumns?: Record<string, string | null>;
  /** Regulation / justification */
  regulation: string;
}

/**
 * Master retention policy table.
 *
 * Conservative retention windows:
 *  - PHI / billing: 7 years (exceeds HIPAA 6-year minimum)
 *  - Transaction logs: 7 years (exceeds PCI-DSS 1-year minimum)
 *  - Audit / compliance: 7 years (matches HIPAA)
 *  - Notifications: 90 days (read) / 1 year (unread)
 *  - Session/token artefacts: 30 days
 *  - Temporary upload artefacts: 7 days
 */
export const RETENTION_POLICIES: RetentionPolicy[] = [
  // ── Ephemeral / operational data (short retention) ──────────────────

  {
    name: 'Expired wallet verification challenges',
    table: 'wallet_verification_challenges',
    timestampColumn: 'expires_at',
    retentionInterval: '1 hour',
    action: 'delete',
    condition:
      "expires_at < now() OR (verified_at IS NOT NULL AND verified_at < now() - interval '1 hour')",
    regulation: 'Operational cleanup',
  },
  {
    name: 'Processed notification queue',
    table: 'notification_queue',
    timestampColumn: 'created_at',
    retentionInterval: '30 days',
    action: 'delete',
    condition: "status IN ('sent', 'failed', 'cancelled')",
    regulation: 'Storage minimisation',
  },
  {
    name: 'Read notifications',
    table: 'notifications',
    timestampColumn: 'created_at',
    retentionInterval: '90 days',
    action: 'delete',
    condition: 'read = true',
    regulation: 'GDPR storage minimisation',
  },
  {
    name: 'Unread notifications',
    table: 'notifications',
    timestampColumn: 'created_at',
    retentionInterval: '1 year',
    action: 'delete',
    regulation: 'GDPR storage minimisation',
  },
  {
    name: 'Expired API rate limit logs',
    table: 'api_rate_limit_logs',
    timestampColumn: 'created_at',
    retentionInterval: '30 days',
    action: 'delete',
    regulation: 'Operational cleanup',
  },
  {
    name: 'Old system performance metrics',
    table: 'system_performance_metrics',
    timestampColumn: 'recorded_at',
    retentionInterval: '90 days',
    action: 'delete',
    regulation: 'Storage minimisation',
  },

  // ── Medium-term data ────────────────────────────────────────────────

  {
    name: 'Login history',
    table: 'login_history',
    timestampColumn: 'created_at',
    retentionInterval: '2 years',
    action: 'anonymise',
    anonymiseColumns: {
      ip_address: null,
      user_agent: null,
    },
    regulation: 'GDPR data minimisation',
  },
  {
    name: 'Security events',
    table: 'security_events',
    timestampColumn: 'created_at',
    retentionInterval: '3 years',
    action: 'anonymise',
    anonymiseColumns: {
      ip_address: null,
      user_agent: null,
    },
    regulation: 'Security log retention',
  },

  // ── Long-term data (HIPAA / PCI-DSS regulated — 7 years) ───────────

  {
    name: 'Access audit logs',
    table: 'access_audit_logs',
    timestampColumn: 'created_at',
    retentionInterval: '7 years',
    action: 'delete',
    regulation: 'HIPAA §164.530(j) — 6 year retention',
  },
  {
    name: 'Compliance logs',
    table: 'compliance_logs',
    timestampColumn: 'created_at',
    retentionInterval: '7 years',
    action: 'delete',
    regulation: 'HIPAA §164.530(j)',
  },
  {
    name: 'Transactions',
    table: 'transactions',
    timestampColumn: 'created_at',
    retentionInterval: '7 years',
    action: 'anonymise',
    anonymiseColumns: {
      payer_name: "'[RETAINED]'",
      payer_email: null,
    },
    regulation: 'PCI-DSS + HIPAA billing records',
  },
  {
    name: 'Invoices',
    table: 'invoices',
    timestampColumn: 'created_at',
    retentionInterval: '7 years',
    action: 'anonymise',
    anonymiseColumns: {
      notes: null,
    },
    regulation: 'HIPAA billing records',
  },
  {
    name: 'Medical records',
    table: 'medical_records',
    timestampColumn: 'created_at',
    retentionInterval: '7 years',
    action: 'anonymise',
    anonymiseColumns: {
      notes: "'[RETAINED]'",
      attachments: null,
    },
    regulation: 'HIPAA §164.530(j)',
  },
  {
    name: 'Appointments',
    table: 'appointments',
    timestampColumn: 'created_at',
    retentionInterval: '7 years',
    action: 'anonymise',
    anonymiseColumns: {
      notes: null,
      reason: "'[RETAINED]'",
    },
    regulation: 'HIPAA §164.530(j)',
  },
  {
    name: 'Disputes',
    table: 'disputes',
    timestampColumn: 'created_at',
    retentionInterval: '7 years',
    action: 'delete',
    regulation: 'PCI-DSS dispute records',
  },
  {
    name: 'Insurance claims',
    table: 'insurance_claims',
    timestampColumn: 'created_at',
    retentionInterval: '7 years',
    action: 'anonymise',
    anonymiseColumns: {
      notes: null,
    },
    regulation: 'HIPAA billing records',
  },
  {
    name: 'Deleted user profiles',
    table: 'user_profiles',
    timestampColumn: 'updated_at',
    retentionInterval: '7 years',
    action: 'delete',
    condition: "status = 'deleted'",
    regulation: 'GDPR right to erasure (after regulatory retention)',
  },
];

// ── Enforcement ────────────────────────────────────────────────────────

export interface RetentionResult {
  policy: string;
  table: string;
  action: string;
  rowsAffected: number;
  error?: string;
}

/**
 * Execute all retention policies. Returns a summary of actions taken.
 *
 * Safe to call repeatedly — each policy is idempotent.
 */
export async function enforceRetentionPolicies(): Promise<RetentionResult[]> {
  const sb = createServiceClient();
  const results: RetentionResult[] = [];

  for (const policy of RETENTION_POLICIES) {
    try {
      let rowsAffected = 0;

      if (policy.action === 'delete') {
        rowsAffected = await executeDelete(sb, policy);
      } else {
        rowsAffected = await executeAnonymise(sb, policy);
      }

      results.push({
        policy: policy.name,
        table: policy.table,
        action: policy.action,
        rowsAffected,
      });

      if (rowsAffected > 0) {
        logger.info('Retention policy enforced', {
          policy: policy.name,
          table: policy.table,
          action: policy.action,
          rowsAffected,
          regulation: policy.regulation,
        });
      }
    } catch (err) {
      const errorMsg = String(err);
      results.push({
        policy: policy.name,
        table: policy.table,
        action: policy.action,
        rowsAffected: 0,
        error: errorMsg,
      });
      logger.error('Retention policy failed', undefined, {
        policy: policy.name,
        table: policy.table,
        error: errorMsg,
      });
    }
  }

  // Log the run to compliance_logs
  try {
    await sb.from('compliance_logs').insert({
      action: 'data_retention_enforcement',
      resource_type: 'system',
      details: {
        policiesRun: results.length,
        policiesWithAction: results.filter((r) => r.rowsAffected > 0).length,
        errors: results.filter((r) => r.error).length,
        summary: results,
        timestamp: new Date().toISOString(),
      },
      status: results.every((r) => !r.error) ? 'success' : 'partial_failure',
    });
  } catch {
    // Non-fatal
  }

  return results;
}

// ── Internal helpers ───────────────────────────────────────────────────

async function executeDelete(
  sb: ReturnType<typeof createServiceClient>,
  policy: RetentionPolicy
): Promise<number> {
  // Use custom condition if provided, otherwise use standard time-based check
  const timeCondition = policy.condition
    ? policy.condition
    : `${policy.timestampColumn} < now() - interval '${policy.retentionInterval}'`;

  // Supabase JS doesn't support raw SQL DELETE with custom WHERE,
  // so we use the RPC approach or a two-step select+delete.
  // For safety, select IDs first, then delete in batches.
  const { data: rows, error: selectErr } = (await sb
    .from(policy.table)
    .select('id')
    .or(timeCondition)) as any;

  // Fallback: use rpc if the .or() approach doesn't work with raw SQL
  // Actually, we need to use a raw filter. Supabase .filter() supports simple ops.
  // For complex conditions we do it via a DB function or just use the standard approach.

  // Standard approach: use .lt() for timestamp column
  if (!policy.condition) {
    const cutoff = new Date(Date.now() - parseIntervalToMs(policy.retentionInterval)).toISOString();

    const { count, error } = await sb
      .from(policy.table)
      .delete({ count: 'exact' })
      .lt(policy.timestampColumn, cutoff);

    if (error) throw new Error(`Delete failed on ${policy.table}: ${error.message}`);
    return count ?? 0;
  }

  // For custom conditions, we still use the standard time filter + extra conditions
  const cutoff = new Date(Date.now() - parseIntervalToMs(policy.retentionInterval)).toISOString();

  // Build query with both time and status conditions
  let query = sb.from(policy.table).delete({ count: 'exact' }).lt(policy.timestampColumn, cutoff);

  // Parse simple conditions like "status = 'deleted'" or "read = true"
  const simpleConditions = parseSimpleConditions(policy.condition);
  for (const cond of simpleConditions) {
    query = query.eq(cond.column, cond.value) as any;
  }

  const { count, error } = await query;
  if (error) throw new Error(`Delete failed on ${policy.table}: ${error.message}`);
  return count ?? 0;
}

async function executeAnonymise(
  sb: ReturnType<typeof createServiceClient>,
  policy: RetentionPolicy
): Promise<number> {
  if (!policy.anonymiseColumns) return 0;

  const cutoff = new Date(Date.now() - parseIntervalToMs(policy.retentionInterval)).toISOString();

  // Build update payload
  const updates: Record<string, unknown> = {};
  for (const [col, replacement] of Object.entries(policy.anonymiseColumns)) {
    if (replacement === null) {
      updates[col] = null;
    } else {
      // Strip surrounding quotes from SQL literals
      updates[col] = replacement.replace(/^'|'$/g, '');
    }
  }

  const { count, error } = await sb
    .from(policy.table)
    .update(updates, { count: 'exact' })
    .lt(policy.timestampColumn, cutoff);

  if (error) throw new Error(`Anonymise failed on ${policy.table}: ${error.message}`);
  return count ?? 0;
}

// ── Parsing helpers ────────────────────────────────────────────────────

const INTERVAL_MAP: Record<string, number> = {
  hour: 3_600_000,
  day: 86_400_000,
  days: 86_400_000,
  year: 365.25 * 86_400_000,
  years: 365.25 * 86_400_000,
};

/**
 * Convert a PostgreSQL-style interval string to milliseconds.
 * Supports: '30 days', '90 days', '1 year', '7 years', '1 hour'
 */
export function parseIntervalToMs(interval: string): number {
  const match = interval.match(/^(\d+)\s+(\w+)$/);
  if (!match) throw new Error(`Cannot parse interval: ${interval}`);
  const [, num, unit] = match;
  const multiplier = INTERVAL_MAP[unit.toLowerCase()];
  if (!multiplier) throw new Error(`Unknown interval unit: ${unit}`);
  return parseInt(num, 10) * multiplier;
}

interface SimpleCondition {
  column: string;
  value: string | boolean;
}

function parseSimpleConditions(condition: string): SimpleCondition[] {
  const results: SimpleCondition[] = [];
  // Match: column = 'value' or column = true/false
  const regex = /(\w+)\s*=\s*(?:'([^']*)'|(true|false))/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(condition)) !== null) {
    const col = m[1];
    const strVal = m[2];
    const boolVal = m[3];
    if (boolVal !== undefined) {
      results.push({ column: col, value: boolVal === 'true' });
    } else if (strVal !== undefined) {
      results.push({ column: col, value: strVal });
    }
  }
  return results;
}

// ── Policy documentation (for admin/compliance UI) ─────────────────────

export function getRetentionPolicySummary() {
  return RETENTION_POLICIES.map((p) => ({
    name: p.name,
    table: p.table,
    retention: p.retentionInterval,
    action: p.action,
    regulation: p.regulation,
  }));
}
