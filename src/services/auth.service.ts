// Authentication Service
import { getSupabaseClient } from '../lib/supabase.js';
import type { AuthError, Factor, AuthMFAVerifyResponse } from '@supabase/supabase-js';

// Types for phone auth
export interface PhoneSignUpResult {
  user: { id: string; phone?: string } | null;
  session: unknown | null;
}

export interface PhoneVerifyResult {
  user: { id: string; phone?: string } | null;
  session: unknown | null;
}

export interface MFAEnrollResult {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export const authService = {
  // Sign up with email and password
  async signUp(
    email: string,
    password: string,
    fullName: string,
    role: 'patient' | 'provider' = 'patient'
  ) {
    const supabase = getSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (authError) throw authError;

    // Create user profile after signup
    if (authData.user) {
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
      });

      if (profileError) throw profileError;
    }

    return authData;
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  async getCurrentUser() {
    const supabase = getSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Get current session
  async getSession() {
    const supabase = getSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Reset password
  async resetPassword(email: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    });

    if (error) throw error;
    return data;
  },

  // Update password
  async updatePassword(newPassword: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    const supabase = getSupabaseClient();
    return supabase.auth.onAuthStateChange(callback);
  },

  // Sign in with OAuth provider
  async signInWithProvider(provider: 'google' | 'github' | 'azure') {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  },

  // ============================================================
  // PHONE AUTHENTICATION
  // ============================================================

  /**
   * Sign up with phone number - sends OTP
   */
  async signUpWithPhone(
    phone: string,
    fullName: string,
    role: 'patient' | 'provider' = 'patient'
  ): Promise<PhoneSignUpResult> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) throw error;
    return data as PhoneSignUpResult;
  },

  /**
   * Sign in with phone number - sends OTP
   */
  async signInWithPhone(phone: string): Promise<{ messageId?: string }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) throw error;
    return { messageId: data.messageId ?? undefined };
  },

  /**
   * Verify phone OTP
   */
  async verifyPhoneOtp(phone: string, token: string): Promise<PhoneVerifyResult> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) throw error;

    // Create/update user profile if needed
    if (data.user) {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!existingProfile) {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          phone: data.user.phone,
          full_name: data.user.user_metadata?.full_name || 'User',
          role: data.user.user_metadata?.role || 'patient',
        });
      }
    }

    return data as PhoneVerifyResult;
  },

  /**
   * Update user's phone number
   */
  async updatePhone(phone: string): Promise<{ user: unknown }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({
      phone,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Resend phone OTP
   */
  async resendPhoneOtp(phone: string): Promise<{ messageId?: string }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.resend({
      type: 'sms',
      phone,
    });

    if (error) throw error;
    return { messageId: data.messageId ?? undefined };
  },

  // ============================================================
  // MULTI-FACTOR AUTHENTICATION (MFA/2FA)
  // ============================================================

  /**
   * Enroll TOTP MFA factor (generates QR code)
   */
  async enrollMFA(friendlyName = 'Authenticator App'): Promise<MFAEnrollResult> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });

    if (error) throw error;
    return data as MFAEnrollResult;
  },

  /**
   * Verify and activate MFA factor
   */
  async verifyMFA(factorId: string, code: string): Promise<AuthMFAVerifyResponse['data']> {
    const supabase = getSupabaseClient();

    // First create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) throw challengeError;

    // Then verify with the code
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Complete MFA challenge during sign in
   */
  async challengeMFA(factorId: string, code: string): Promise<AuthMFAVerifyResponse['data']> {
    const supabase = getSupabaseClient();

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) throw challengeError;

    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) throw error;
    return data;
  },

  /**
   * List all enrolled MFA factors
   */
  async listMFAFactors(): Promise<Factor[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) throw error;
    return data.all || [];
  },

  /**
   * Unenroll an MFA factor
   */
  async unenrollMFA(factorId: string): Promise<{ id: string }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Get the current MFA assurance level
   */
  async getMFAAssuranceLevel(): Promise<{
    currentLevel: string | null;
    nextLevel: string | null;
    currentAuthenticationMethods: unknown[];
  }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (error) throw error;
    return {
      currentLevel: data.currentLevel as string | null,
      nextLevel: data.nextLevel as string | null,
      currentAuthenticationMethods: data.currentAuthenticationMethods as unknown[],
    };
  },

  /**
   * Check if MFA is required but not yet verified
   */
  async isMFARequired(): Promise<boolean> {
    try {
      const { currentLevel, nextLevel } = await this.getMFAAssuranceLevel();
      return currentLevel === 'aal1' && nextLevel === 'aal2';
    } catch {
      return false;
    }
  },

  // ============================================================
  // REAUTHENTICATION
  // ============================================================

  /**
   * Request reauthentication nonce for sensitive actions
   */
  async reauthenticate(): Promise<{ user: unknown }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.reauthenticate();

    if (error) throw error;
    return data;
  },

  // ============================================================
  // EMAIL VERIFICATION
  // ============================================================

  /**
   * Resend email confirmation
   */
  async resendEmailConfirmation(email: string): Promise<{ messageId?: string }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) throw error;
    return { messageId: data.messageId ?? undefined };
  },

  /**
   * Update email address (sends verification to new email)
   */
  async updateEmail(newEmail: string): Promise<{ user: unknown }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) throw error;
    return data;
  },
};

export default authService;
