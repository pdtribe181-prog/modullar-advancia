// API Services for Supabase operations
import { supabase } from '../lib/supabase';

// User Profiles Service
export const userProfilesService = {
  async getById(id: string) {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// Patients Service
export const patientsService = {
  async getAll() {
    const { data, error } = await supabase.from('patients').select('*, user_profiles(*)');
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*, user_profiles(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(patient: Record<string, unknown>) {
    const { data, error } = await supabase.from('patients').insert(patient).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// Providers Service
export const providersService = {
  async getAll() {
    const { data, error } = await supabase.from('providers').select('*, user_profiles(*)');
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('providers')
      .select('*, user_profiles(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getBySpecialty(specialty: string) {
    const { data, error } = await supabase
      .from('providers')
      .select('*, user_profiles(*)')
      .eq('specialty', specialty);
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('providers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// Appointments Service
export const appointmentsService = {
  async getByPatient(patientId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, providers(*, user_profiles(*))')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByProvider(providerId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(*, user_profiles(*))')
      .eq('provider_id', providerId)
      .order('appointment_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(appointment: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// Transactions Service
export const transactionsService = {
  async getByPatient(patientId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByProvider(providerId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(transaction: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('transactions')
      .update({ payment_status: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// Invoices Service
export const invoicesService = {
  async getByPatient(patientId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByProvider(providerId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), patients(*, user_profiles(*))')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(invoice: Record<string, unknown>) {
    const { data, error } = await supabase.from('invoices').insert(invoice).select().single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// Notifications Service
export const notificationsService = {
  async getUnread(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read_status', 'unread')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async markAsRead(id: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_status: 'read', read_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async create(notification: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// API Keys Service
export const apiKeysService = {
  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(apiKey: Record<string, unknown>) {
    const { data, error } = await supabase.from('api_keys').insert(apiKey).select().single();
    if (error) throw error;
    return data;
  },

  async revoke(id: string) {
    const { data, error } = await supabase
      .from('api_keys')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// Webhooks Service
export const webhooksService = {
  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(webhook: Record<string, unknown>) {
    const { data, error } = await supabase.from('webhooks').insert(webhook).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('webhooks').delete().eq('id', id);
    if (error) throw error;
  },
};

// Disputes Service
export const disputesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('disputes')
      .select(
        '*, transactions(*), invoices(*), patients(*, user_profiles(*)), providers(*, user_profiles(*))'
      )
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('disputes')
      .select(
        '*, transactions(*), invoices(*), patients(*, user_profiles(*)), providers(*, user_profiles(*)), dispute_evidence(*), dispute_timeline(*)'
      )
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(dispute: Record<string, unknown>) {
    const { data, error } = await supabase.from('disputes').insert(dispute).select().single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('disputes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
