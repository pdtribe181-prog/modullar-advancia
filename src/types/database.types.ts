// Auto-generated TypeScript types for Supabase database
// Generated from schema on February 16, 2026

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'patient' | 'provider' | 'admin' | 'staff';
          phone: string | null;
          avatar_url: string | null;
          stripe_customer_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'patient' | 'provider' | 'admin' | 'staff';
          phone?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'patient' | 'provider' | 'admin' | 'staff';
          phone?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          user_id: string | null;
          date_of_birth: string | null;
          gender: string | null;
          address_line_1: string | null;
          address_line_2: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          country: string;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          insurance_provider: string | null;
          insurance_policy_number: string | null;
          medical_history: Json;
          allergies: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          address_line_1?: string | null;
          address_line_2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          insurance_provider?: string | null;
          insurance_policy_number?: string | null;
          medical_history?: Json;
          allergies?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          address_line_1?: string | null;
          address_line_2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          insurance_provider?: string | null;
          insurance_policy_number?: string | null;
          medical_history?: Json;
          allergies?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      providers: {
        Row: {
          id: string;
          user_id: string | null;
          specialty: string;
          license_number: string;
          years_of_experience: number | null;
          education: Json;
          certifications: Json;
          consultation_fee: number;
          available_days: Json;
          available_hours: Json;
          bio: string | null;
          rating: number;
          total_consultations: number;
          stripe_account_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          specialty: string;
          license_number: string;
          years_of_experience?: number | null;
          education?: Json;
          certifications?: Json;
          consultation_fee: number;
          available_days?: Json;
          available_hours?: Json;
          bio?: string | null;
          rating?: number;
          total_consultations?: number;
          stripe_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          specialty?: string;
          license_number?: string;
          years_of_experience?: number | null;
          education?: Json;
          certifications?: Json;
          consultation_fee?: number;
          available_days?: Json;
          available_hours?: Json;
          bio?: string | null;
          rating?: number;
          total_consultations?: number;
          stripe_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string | null;
          provider_id: string | null;
          appointment_date: string;
          appointment_time: string;
          duration_minutes: number;
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
          reason_for_visit: string | null;
          notes: string | null;
          prescription: Json;
          follow_up_required: boolean;
          follow_up_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          provider_id?: string | null;
          appointment_date: string;
          appointment_time: string;
          duration_minutes?: number;
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
          reason_for_visit?: string | null;
          notes?: string | null;
          prescription?: Json;
          follow_up_required?: boolean;
          follow_up_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          provider_id?: string | null;
          appointment_date?: string;
          appointment_time?: string;
          duration_minutes?: number;
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
          reason_for_visit?: string | null;
          notes?: string | null;
          prescription?: Json;
          follow_up_required?: boolean;
          follow_up_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          patient_id: string | null;
          provider_id: string | null;
          appointment_id: string | null;
          payment_intent_id: string | null;
          stripe_charge_id: string | null;
          amount: number;
          currency: string;
          payment_method: 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'wallet' | null;
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
          description: string | null;
          billing_name: string | null;
          billing_email: string | null;
          billing_address: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          provider_id?: string | null;
          appointment_id?: string | null;
          payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          amount: number;
          currency?: string;
          payment_method?: 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'wallet' | null;
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
          description?: string | null;
          billing_name?: string | null;
          billing_email?: string | null;
          billing_address?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          provider_id?: string | null;
          appointment_id?: string | null;
          payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          amount?: number;
          currency?: string;
          payment_method?: 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'wallet' | null;
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
          description?: string | null;
          billing_name?: string | null;
          billing_email?: string | null;
          billing_address?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          patient_id: string | null;
          provider_id: string | null;
          transaction_id: string | null;
          issue_date: string;
          due_date: string;
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          currency: string;
          notes: string | null;
          terms: string | null;
          payment_instructions: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          patient_id?: string | null;
          provider_id?: string | null;
          transaction_id?: string | null;
          issue_date?: string;
          due_date: string;
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          currency?: string;
          notes?: string | null;
          terms?: string | null;
          payment_instructions?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          patient_id?: string | null;
          provider_id?: string | null;
          transaction_id?: string | null;
          issue_date?: string;
          due_date?: string;
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          currency?: string;
          notes?: string | null;
          terms?: string | null;
          payment_instructions?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          dispute_number: string;
          transaction_id: string | null;
          invoice_id: string | null;
          patient_id: string | null;
          provider_id: string | null;
          dispute_reason:
            | 'fraud'
            | 'duplicate'
            | 'product_not_received'
            | 'service_not_provided'
            | 'other';
          status: 'new' | 'under_review' | 'resolved' | 'rejected';
          amount: number;
          currency: string;
          dispute_date: string;
          due_date: string | null;
          resolved_date: string | null;
          customer_description: string | null;
          internal_notes: string | null;
          evidence_url: string | null;
          assigned_to: string | null;
          resolution_outcome: 'won' | 'lost' | 'partial' | 'withdrawn' | null;
          resolution_notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dispute_number: string;
          transaction_id?: string | null;
          invoice_id?: string | null;
          patient_id?: string | null;
          provider_id?: string | null;
          dispute_reason:
            | 'fraud'
            | 'duplicate'
            | 'product_not_received'
            | 'service_not_provided'
            | 'other';
          status?: 'new' | 'under_review' | 'resolved' | 'rejected';
          amount: number;
          currency?: string;
          dispute_date?: string;
          due_date?: string | null;
          resolved_date?: string | null;
          customer_description?: string | null;
          internal_notes?: string | null;
          evidence_url?: string | null;
          assigned_to?: string | null;
          resolution_outcome?: 'won' | 'lost' | 'partial' | 'withdrawn' | null;
          resolution_notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dispute_number?: string;
          transaction_id?: string | null;
          invoice_id?: string | null;
          patient_id?: string | null;
          provider_id?: string | null;
          dispute_reason?:
            | 'fraud'
            | 'duplicate'
            | 'product_not_received'
            | 'service_not_provided'
            | 'other';
          status?: 'new' | 'under_review' | 'resolved' | 'rejected';
          amount?: number;
          currency?: string;
          dispute_date?: string;
          due_date?: string | null;
          resolved_date?: string | null;
          customer_description?: string | null;
          internal_notes?: string | null;
          evidence_url?: string | null;
          assigned_to?: string | null;
          resolution_outcome?: 'won' | 'lost' | 'partial' | 'withdrawn' | null;
          resolution_notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          notification_type: 'system' | 'transaction' | 'security' | 'compliance' | 'marketing';
          priority: 'low' | 'medium' | 'high' | 'critical';
          title: string;
          message: string;
          read_status: 'unread' | 'read' | 'archived';
          related_transaction_id: string | null;
          related_resource_type: string | null;
          related_resource_id: string | null;
          action_url: string | null;
          action_label: string | null;
          metadata: Json;
          read_at: string | null;
          archived_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          notification_type: 'system' | 'transaction' | 'security' | 'compliance' | 'marketing';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          title: string;
          message: string;
          read_status?: 'unread' | 'read' | 'archived';
          related_transaction_id?: string | null;
          related_resource_type?: string | null;
          related_resource_id?: string | null;
          action_url?: string | null;
          action_label?: string | null;
          metadata?: Json;
          read_at?: string | null;
          archived_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          notification_type?: 'system' | 'transaction' | 'security' | 'compliance' | 'marketing';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          title?: string;
          message?: string;
          read_status?: 'unread' | 'read' | 'archived';
          related_transaction_id?: string | null;
          related_resource_type?: string | null;
          related_resource_id?: string | null;
          action_url?: string | null;
          action_label?: string | null;
          metadata?: Json;
          read_at?: string | null;
          archived_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          key_hash: string;
          key_prefix: string;
          environment: 'sandbox' | 'production';
          status: 'active' | 'inactive' | 'revoked' | 'expired';
          permissions: Json;
          rate_limit: number;
          requests_today: number;
          total_requests: number;
          last_used_at: string | null;
          last_used_ip: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          key: string | null;
          description: string | null;
          last_rotated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          key_hash: string;
          key_prefix: string;
          environment?: 'sandbox' | 'production';
          status?: 'active' | 'inactive' | 'revoked' | 'expired';
          permissions?: Json;
          rate_limit?: number;
          requests_today?: number;
          total_requests?: number;
          last_used_at?: string | null;
          last_used_ip?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          key?: string | null;
          description?: string | null;
          last_rotated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          key_hash?: string;
          key_prefix?: string;
          environment?: 'sandbox' | 'production';
          status?: 'active' | 'inactive' | 'revoked' | 'expired';
          permissions?: Json;
          rate_limit?: number;
          requests_today?: number;
          total_requests?: number;
          last_used_at?: string | null;
          last_used_ip?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          key?: string | null;
          description?: string | null;
          last_rotated_at?: string | null;
        };
      };
      webhooks: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          url: string;
          description: string | null;
          status: 'active' | 'inactive' | 'failed';
          secret_key: string;
          subscribed_events: Json;
          headers: Json;
          timeout_seconds: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          url: string;
          description?: string | null;
          status?: 'active' | 'inactive' | 'failed';
          secret_key: string;
          subscribed_events?: Json;
          headers?: Json;
          timeout_seconds?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          url?: string;
          description?: string | null;
          status?: 'active' | 'inactive' | 'failed';
          secret_key?: string;
          subscribed_events?: Json;
          headers?: Json;
          timeout_seconds?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: 'patient' | 'provider' | 'admin' | 'staff';
      appointment_status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
      payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
      invoice_status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
      dispute_status: 'new' | 'under_review' | 'resolved' | 'rejected';
      dispute_reason:
        | 'fraud'
        | 'duplicate'
        | 'product_not_received'
        | 'service_not_provided'
        | 'other';
      notification_type: 'system' | 'transaction' | 'security' | 'compliance' | 'marketing';
      notification_priority: 'low' | 'medium' | 'high' | 'critical';
      webhook_status: 'active' | 'inactive' | 'failed';
      api_environment: 'sandbox' | 'production';
      api_key_status: 'active' | 'inactive' | 'revoked' | 'expired';
    };
  };
};

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
