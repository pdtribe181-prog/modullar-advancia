import type { Request } from 'express';
import type { User } from '@supabase/supabase-js';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: User;
  userProfile?: {
    id: string;
    role: string;
    full_name?: string;
    stripe_customer_id?: string;
    [key: string]: any;
  };
  requestId?: string;
}

/**
 * Type guard to check if request has authenticated user
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== null && req.user !== undefined;
}

/**
 * API response wrapper types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Common error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
  requestId?: string;
}

/**
 * User profile from database
 */
export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'patient' | 'provider' | 'admin';
  created_at: string;
  updated_at: string;
}

/**
 * Provider profile
 */
export interface ProviderProfile {
  id: string;
  user_id: string;
  business_name: string;
  license_number: string | null;
  specialty: string | null;
  stripe_account_id: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

/**
 * Patient profile
 */
export interface PatientProfile {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  created_at: string;
}

/**
 * Transaction types
 */
export interface Transaction {
  id: string;
  patient_id: string;
  provider_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Appointment types
 */
export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  reason: string | null;
  notes: string | null;
  payment_status: 'pending' | 'paid' | 'refunded';
  created_at: string;
}

/**
 * Stripe Connect account status
 */
export interface ConnectAccountStatus {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}
