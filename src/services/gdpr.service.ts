/**
 * GDPR Compliance Service
 *
 * Provides data-export (Right of Access / Portability, Art. 15 + 20 GDPR) and
 * data-erasure (Right to Erasure, Art. 17 GDPR) capabilities.
 *
 * The service collects user data from every relevant table, groups it into
 * logical categories, and returns it as a JSON package or deletes / anonymises
 * it per the retention rules below.
 *
 * Retention rules (deletion vs. anonymisation):
 *   - Clinical / financial / audit records required by HIPAA or tax law are
 *     anonymised (PII stripped) rather than hard-deleted.
 *   - Personally-identifiable columns are set to '[DELETED]' / null.
 *   - Storage objects (avatars, documents, etc.) are removed.
 *   - The auth.users row is deleted via Supabase Admin API, cascading the
 *     session / identity graph.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '../lib/supabase.js';
import { logger } from '../middleware/logging.middleware.js';

// ─── Types ────────────────────────────────────────────────────────────────

export interface GdprExportPackage {
  exportedAt: string;
  userId: string;
  profile: Record<string, unknown> | null;
  patient: Record<string, unknown> | null;
  provider: Record<string, unknown> | null;
  appointments: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  disputes: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  paymentMethods: Record<string, unknown>[];
  paymentPlans: Record<string, unknown>[];
  consents: Record<string, unknown>[];
  medicalRecords: Record<string, unknown>[];
  prescriptions: Record<string, unknown>[];
  labResults: Record<string, unknown>[];
  apiKeys: Record<string, unknown>[];
  webhooks: Record<string, unknown>[];
  linkedWallets: Record<string, unknown>[];
  accessLogs: Record<string, unknown>[];
  complianceLogs: Record<string, unknown>[];
  emailSettings: Record<string, unknown> | null;
  notificationPreferences: Record<string, unknown> | null;
  paymentPreferences: Record<string, unknown> | null;
  brandCustomization: Record<string, unknown> | null;
  organizationSettings: Record<string, unknown> | null;
  medbedBookings: Record<string, unknown>[];
}

export interface GdprDeletionResult {
  deletedAt: string;
  userId: string;
  tablesProcessed: string[];
  storageCleared: string[];
  authAccountDeleted: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Safely query a table, returning empty array on error (table may not exist
 * in all environments – e.g. local dev without certain migrations).
 */
async function safeSelect(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<Record<string, unknown>[]> {
  try {
    const { data, error } = await supabase.from(table).select('*').eq(column, value);
    if (error) {
      logger.warn(`GDPR export: skipping table ${table}`, { error: error.message });
      return [];
    }
    return (data ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

async function safeSingle(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase.from(table).select('*').eq(column, value).single();
    if (error) return null;
    return data as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

/**
 * Safely delete rows from a table.
 */
async function safeDelete(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from(table).delete().eq(column, value);
    if (error) {
      logger.warn(`GDPR delete: could not clear ${table}`, { error: error.message });
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Anonymise rows instead of deleting (for audit / legal-hold tables).
 */
async function safeAnonymise(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string,
  setFields: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabase.from(table).update(setFields).eq(column, value);
    if (error) {
      logger.warn(`GDPR anonymise: could not update ${table}`, { error: error.message });
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove all objects stored under a user's folder in a Supabase Storage bucket.
 */
async function clearStorageBucket(
  supabase: SupabaseClient,
  bucket: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: files, error: listErr } = await supabase.storage
      .from(bucket)
      .list(userId, { limit: 1000 });
    if (listErr || !files || files.length === 0) return true; // nothing to remove

    const paths = files.map((f) => `${userId}/${f.name}`);
    const { error: rmErr } = await supabase.storage.from(bucket).remove(paths);
    return !rmErr;
  } catch {
    return false;
  }
}

// ─── Export ───────────────────────────────────────────────────────────────

/**
 * Collect **all** personal data associated with `userId` into a JSON package
 * that can be returned to the user (GDPR Art. 15 / 20).
 */
export async function exportUserData(userId: string): Promise<GdprExportPackage> {
  const sb = createServiceClient();

  // Resolve patient / provider IDs (they may differ from userId)
  const patient = await safeSingle(sb, 'patients', 'user_id', userId);
  const provider = await safeSingle(sb, 'providers', 'user_id', userId);
  const patientId = patient?.id as string | undefined;
  const providerId = provider?.id as string | undefined;

  // Fire independent queries in parallel
  const [
    profile,
    emailSettings,
    notifPrefs,
    paymentPrefs,
    brand,
    orgSettings,
    apiKeys,
    webhooks,
    linkedWallets,
    paymentMethods,
    notifications,
  ] = await Promise.all([
    safeSingle(sb, 'user_profiles', 'id', userId),
    safeSingle(sb, 'email_settings', 'user_id', userId),
    safeSingle(sb, 'notification_preferences', 'user_id', userId),
    safeSingle(sb, 'payment_preferences', 'user_id', userId),
    safeSingle(sb, 'brand_customization', 'user_id', userId),
    safeSingle(sb, 'organization_settings', 'user_id', userId),
    safeSelect(sb, 'api_keys', 'user_id', userId),
    safeSelect(sb, 'webhooks', 'user_id', userId),
    safeSelect(sb, 'linked_wallets', 'user_id', userId),
    safeSelect(sb, 'payment_methods', 'user_id', userId),
    safeSelect(sb, 'notifications', 'user_id', userId),
  ]);

  // Patient-specific data
  let appointments: Record<string, unknown>[] = [];
  let transactions: Record<string, unknown>[] = [];
  let invoices: Record<string, unknown>[] = [];
  let disputes: Record<string, unknown>[] = [];
  let messages: Record<string, unknown>[] = [];
  let paymentPlans: Record<string, unknown>[] = [];
  let consents: Record<string, unknown>[] = [];
  let medicalRecords: Record<string, unknown>[] = [];
  let prescriptions: Record<string, unknown>[] = [];
  let labResults: Record<string, unknown>[] = [];
  let accessLogs: Record<string, unknown>[] = [];
  let complianceLogs: Record<string, unknown>[] = [];
  let medbedBookings: Record<string, unknown>[] = [];

  // Parallel batch for patient / provider / user data
  const promises: Promise<void>[] = [];

  if (patientId) {
    promises.push(
      safeSelect(sb, 'appointments', 'patient_id', patientId).then((d) => {
        appointments = d;
      }),
      safeSelect(sb, 'transactions', 'patient_id', patientId).then((d) => {
        transactions = d;
      }),
      safeSelect(sb, 'invoices', 'patient_id', patientId).then((d) => {
        invoices = d;
      }),
      safeSelect(sb, 'disputes', 'patient_id', patientId).then((d) => {
        disputes = d;
      }),
      safeSelect(sb, 'payment_plans', 'patient_id', patientId).then((d) => {
        paymentPlans = d;
      }),
      safeSelect(sb, 'patient_consents', 'patient_id', patientId).then((d) => {
        consents = d;
      }),
      safeSelect(sb, 'medical_records', 'patient_id', patientId).then((d) => {
        medicalRecords = d;
      }),
      safeSelect(sb, 'prescriptions', 'patient_id', patientId).then((d) => {
        prescriptions = d;
      }),
      safeSelect(sb, 'lab_results', 'patient_id', patientId).then((d) => {
        labResults = d;
      })
    );
  }

  if (providerId) {
    // Provider also has appointment / transaction / invoice data — merge
    promises.push(
      safeSelect(sb, 'appointments', 'provider_id', providerId).then((d) => {
        appointments = [...appointments, ...d];
      }),
      safeSelect(sb, 'transactions', 'provider_id', providerId).then((d) => {
        transactions = [...transactions, ...d];
      }),
      safeSelect(sb, 'invoices', 'provider_id', providerId).then((d) => {
        invoices = [...invoices, ...d];
      })
    );
  }

  // User-level
  promises.push(
    safeSelect(sb, 'messages', 'sender_id', userId).then((d) => {
      messages = d;
    }),
    safeSelect(sb, 'access_audit_logs', 'user_id', userId).then((d) => {
      accessLogs = d;
    }),
    safeSelect(sb, 'compliance_logs', 'user_id', userId).then((d) => {
      complianceLogs = d;
    }),
    safeSelect(sb, 'med_bed_bookings', 'user_id', userId).then((d) => {
      medbedBookings = d;
    })
  );

  // Also fetch messages where user is recipient
  promises.push(
    safeSelect(sb, 'messages', 'recipient_id', userId).then((d) => {
      messages = [...messages, ...d];
    })
  );

  await Promise.all(promises);

  return {
    exportedAt: new Date().toISOString(),
    userId,
    profile,
    patient,
    provider,
    appointments,
    transactions,
    invoices,
    disputes,
    notifications,
    messages,
    paymentMethods,
    paymentPlans,
    consents,
    medicalRecords,
    prescriptions,
    labResults,
    apiKeys,
    webhooks,
    linkedWallets,
    accessLogs,
    complianceLogs,
    emailSettings,
    notificationPreferences: notifPrefs,
    paymentPreferences: paymentPrefs,
    brandCustomization: brand,
    organizationSettings: orgSettings,
    medbedBookings,
  };
}

// ─── Erasure ──────────────────────────────────────────────────────────────

/**
 * Delete or anonymise all personal data for `userId` (GDPR Art. 17).
 *
 * Strategy:
 *  1. Hard-delete rows that hold no legal retention value.
 *  2. Anonymise rows we must keep for financial / medical audit trails.
 *  3. Remove storage objects.
 *  4. Delete the Supabase Auth account (cascade drops sessions/identities).
 *  5. Log a compliance record of the erasure.
 */
export async function eraseUserData(
  userId: string,
  requestedBy: string
): Promise<GdprDeletionResult> {
  const sb = createServiceClient();
  const tablesProcessed: string[] = [];
  const storageCleared: string[] = [];

  // Resolve patient / provider IDs
  const patient = await safeSingle(sb, 'patients', 'user_id', userId);
  const provider = await safeSingle(sb, 'providers', 'user_id', userId);
  const patientId = patient?.id as string | undefined;
  const providerId = provider?.id as string | undefined;

  // ── 1. Hard-delete ephemeral / low-retention tables ──────────────────

  const deleteTasks: Array<{ table: string; column: string; id: string }> = [
    // User-level
    { table: 'notifications', column: 'user_id', id: userId },
    { table: 'notification_preferences', column: 'user_id', id: userId },
    { table: 'notification_queue', column: 'user_id', id: userId },
    { table: 'email_settings', column: 'user_id', id: userId },
    { table: 'payment_methods', column: 'user_id', id: userId },
    { table: 'payment_preferences', column: 'user_id', id: userId },
    { table: 'api_keys', column: 'user_id', id: userId },
    { table: 'webhooks', column: 'user_id', id: userId },
    { table: 'webhook_endpoints', column: 'user_id', id: userId },
    { table: 'webhook_settings', column: 'user_id', id: userId },
    { table: 'brand_customization', column: 'user_id', id: userId },
    { table: 'organization_settings', column: 'user_id', id: userId },
    { table: 'linked_wallets', column: 'user_id', id: userId },
    { table: 'wallet_verification_challenges', column: 'user_id', id: userId },
    { table: 'sandbox_sessions', column: 'user_id', id: userId },
    { table: 'user_permissions', column: 'user_id', id: userId },
    { table: 'user_role_assignments', column: 'user_id', id: userId },
    { table: 'transaction_permissions', column: 'user_id', id: userId },
    { table: 'med_bed_bookings', column: 'user_id', id: userId },
    { table: 'security_preferences', column: 'user_id', id: userId },
    { table: 'audit_access_controls', column: 'user_id', id: userId },
  ];

  if (patientId) {
    deleteTasks.push(
      { table: 'patient_consents', column: 'patient_id', id: patientId },
      { table: 'payment_plans', column: 'patient_id', id: patientId },
      { table: 'payment_plan_transactions', column: 'payment_plan_id', id: patientId }, // best-effort
      { table: 'recurring_billing', column: 'patient_id', id: patientId },
      { table: 'appointment_waitlist', column: 'patient_id', id: patientId },
      { table: 'provider_reviews', column: 'patient_id', id: patientId }
    );
  }

  await Promise.all(
    deleteTasks.map(async ({ table, column, id }) => {
      const ok = await safeDelete(sb, table, column, id);
      if (ok) tablesProcessed.push(table);
    })
  );

  // ── 2. Anonymise financial / clinical / audit tables ─────────────────

  const ANON_TEXT = '[DELETED]';
  const anonymiseTasks: Array<{
    table: string;
    column: string;
    id: string;
    fields: Record<string, unknown>;
  }> = [];

  if (patientId) {
    anonymiseTasks.push(
      {
        table: 'transactions',
        column: 'patient_id',
        id: patientId,
        fields: {
          billing_name: ANON_TEXT,
          billing_email: ANON_TEXT,
          billing_address: null,
          receipt_url: null,
        },
      },
      {
        table: 'invoices',
        column: 'patient_id',
        id: patientId,
        fields: { pdf_url: null },
      },
      {
        table: 'appointments',
        column: 'patient_id',
        id: patientId,
        fields: { reason_for_visit: ANON_TEXT, notes: null, prescription: null },
      },
      {
        table: 'medical_records',
        column: 'patient_id',
        id: patientId,
        fields: {
          diagnosis: null,
          treatment_plan: ANON_TEXT,
          lab_results: null,
          file_url: null,
        },
      },
      {
        table: 'prescriptions',
        column: 'patient_id',
        id: patientId,
        fields: { notes: ANON_TEXT },
      },
      {
        table: 'disputes',
        column: 'patient_id',
        id: patientId,
        fields: { customer_description: ANON_TEXT },
      },
      {
        table: 'insurance_claims',
        column: 'patient_id',
        id: patientId,
        fields: { policy_number: ANON_TEXT },
      }
    );
  }

  // Anonymise audit / access logs (cannot delete due to compliance requirements)
  anonymiseTasks.push(
    {
      table: 'access_audit_logs',
      column: 'user_id',
      id: userId,
      fields: { ip_address: null },
    },
    {
      table: 'compliance_logs',
      column: 'user_id',
      id: userId,
      fields: { details: { anonymised: true } },
    },
    {
      table: 'security_events',
      column: 'user_id',
      id: userId,
      fields: { ip_address: null, user_agent: null },
    },
    {
      table: 'settings_activity_log',
      column: 'user_id',
      id: userId,
      fields: { ip_address: null, details: { anonymised: true } },
    }
  );

  // Messages — anonymise content but keep metadata for recipient's record
  anonymiseTasks.push(
    {
      table: 'messages',
      column: 'sender_id',
      id: userId,
      fields: { content: ANON_TEXT, subject: ANON_TEXT, attachments: null },
    },
    {
      table: 'email_history',
      column: 'recipient',
      id: ((await safeSingle(sb, 'user_profiles', 'id', userId))?.email as string) ?? userId,
      fields: { subject: ANON_TEXT },
    }
  );

  // Anonymise patient identity
  if (patientId) {
    anonymiseTasks.push({
      table: 'patients',
      column: 'id',
      id: patientId,
      fields: {
        date_of_birth: null,
        gender: null,
        address_line_1: ANON_TEXT,
        address_line_2: null,
        city: ANON_TEXT,
        state: ANON_TEXT,
        postal_code: ANON_TEXT,
        emergency_contact_name: ANON_TEXT,
        emergency_contact_phone: ANON_TEXT,
        insurance_provider: ANON_TEXT,
        insurance_policy_number: ANON_TEXT,
        medical_history: null,
        allergies: null,
      },
    });
  }

  // Anonymise provider identity
  if (providerId) {
    anonymiseTasks.push({
      table: 'providers',
      column: 'id',
      id: providerId,
      fields: {
        license_number: ANON_TEXT,
        bio: ANON_TEXT,
        education: null,
        certifications: null,
      },
    });
  }

  await Promise.all(
    anonymiseTasks.map(async ({ table, column, id, fields }) => {
      const ok = await safeAnonymise(sb, table, column, id, fields);
      if (ok) tablesProcessed.push(`${table} (anonymised)`);
    })
  );

  // ── 3. Clear storage buckets ─────────────────────────────────────────

  const buckets = [
    'avatars',
    'provider-documents',
    'medical-records',
    'invoice-attachments',
    'dispute-evidence',
    'message-attachments',
  ];

  await Promise.all(
    buckets.map(async (bucket) => {
      const ok = await clearStorageBucket(sb, bucket, userId);
      if (ok) storageCleared.push(bucket);
    })
  );

  // ── 4. Anonymise the user_profiles row ───────────────────────────────

  await safeAnonymise(sb, 'user_profiles', 'id', userId, {
    full_name: ANON_TEXT,
    email: `deleted_${userId.slice(0, 8)}@deleted.invalid`,
    phone: null,
    avatar_url: null,
    status: 'deleted',
    updated_at: new Date().toISOString(),
  });
  tablesProcessed.push('user_profiles (anonymised)');

  // ── 5. Delete the Supabase Auth account ──────────────────────────────

  let authAccountDeleted = false;
  try {
    const { error } = await sb.auth.admin.deleteUser(userId);
    if (!error) authAccountDeleted = true;
    else logger.warn('GDPR: auth account deletion failed', { error: error.message });
  } catch (err) {
    logger.warn('GDPR: auth account deletion threw', { error: String(err) });
  }

  // ── 6. Record the erasure in compliance log ──────────────────────────

  try {
    await sb.from('compliance_logs').insert({
      user_id: requestedBy,
      action: 'gdpr_erasure',
      details: {
        erasedUserId: userId,
        tablesProcessed: tablesProcessed.length,
        storageCleared: storageCleared.length,
        authDeleted: authAccountDeleted,
        requestedAt: new Date().toISOString(),
      },
    });
  } catch {
    // Best-effort — do not fail the entire erasure if logging fails
  }

  return {
    deletedAt: new Date().toISOString(),
    userId,
    tablesProcessed,
    storageCleared,
    authAccountDeleted,
  };
}

// ─── Consent management ───────────────────────────────────────────────────

export interface ConsentRecord {
  consentType: string;
  granted: boolean;
}

/**
 * List the consent records for a patient.
 */
export async function getConsents(patientId: string): Promise<Record<string, unknown>[]> {
  const sb = createServiceClient();
  return safeSelect(sb, 'patient_consents', 'patient_id', patientId);
}

/**
 * Grant or revoke a specific consent type.
 */
export async function updateConsent(
  patientId: string,
  consentType: string,
  granted: boolean,
  ipAddress?: string
): Promise<Record<string, unknown> | null> {
  const sb = createServiceClient();
  const now = new Date().toISOString();

  // Upsert: update existing or insert new
  const { data: existing } = await sb
    .from('patient_consents')
    .select('id')
    .eq('patient_id', patientId)
    .eq('consent_type', consentType)
    .single();

  if (existing) {
    const { data, error } = await sb
      .from('patient_consents')
      .update({
        granted,
        granted_at: granted ? now : null,
        revoked_at: granted ? null : now,
        ip_address: ipAddress ?? null,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) {
      logger.error('Failed to update consent', error as Error);
      return null;
    }
    return data as Record<string, unknown>;
  }

  const { data, error } = await sb
    .from('patient_consents')
    .insert({
      patient_id: patientId,
      consent_type: consentType,
      granted,
      granted_at: granted ? now : null,
      ip_address: ipAddress ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create consent', error as Error);
    return null;
  }
  return data as Record<string, unknown>;
}
