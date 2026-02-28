import { Router, Request, Response } from 'express';
import {
  authenticate,
  authenticateWithProfile,
  AuthenticatedRequest,
} from '../middleware/auth.middleware.js';
import { createServiceClient } from '../lib/supabase.js';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody, signinSchema, signupSchema } from '../middleware/validation.middleware.js';
import { asyncHandler, AppError, getErrorMessage } from '../utils/errors.js';
import { logSecurityEvent, logAndNotify, extractIPAddress } from '../services/security.service.js';
import { generateCsrfToken } from '../middleware/csrf.middleware.js';
import { z } from 'zod';

const router = Router();
const supabase = createServiceClient();

// Additional validation schemas for auth routes
const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  avatar_url: z.string().url().optional(),
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token required'),
});

// ------------------------------------------------------------------
// GET /auth/csrf-token — obtain a CSRF token for state-changing requests
// ------------------------------------------------------------------
router.get(
  '/csrf-token',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const token = await generateCsrfToken(req, res);
    res.json({ success: true, csrfToken: token });
  })
);

// ============================================================
// PROFILE ROUTES
// ============================================================

/**
 * Get current user's profile
 */
router.get(
  '/profile',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // If no profile exists, create one
      if (error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: req.user?.email,
            role: 'patient',
          })
          .select()
          .single();

        if (createError) {
          throw AppError.internal();
        }
        return res.json({ success: true, data: newProfile });
      }
      throw AppError.internal();
    }

    res.json({ success: true, data: profile });
  })
);

/**
 * Update current user's profile
 */
router.put(
  '/profile',
  authenticate,
  sensitiveLimiter,
  validateBody(profileUpdateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { full_name, phone, avatar_url } = req.body;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        full_name,
        phone,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw AppError.internal();
    }

    res.json({ success: true, data: profile });
  })
);

// ============================================================
// SUPABASE AUTH PROXY ROUTES
// ============================================================

/**
 * Login with email/password
 * Note: In production, use Supabase client directly from frontend
 */
router.post(
  '/login',
  authLimiter,
  validateBody(signinSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body;
    const ipAddress = extractIPAddress(req);
    const userAgent = req.headers['user-agent'];

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log failed login attempt (try to find user by email)
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (userData?.id) {
        await logSecurityEvent({
          userId: userData.id,
          eventType: 'failed_login',
          ipAddress,
          userAgent,
          metadata: { email, reason: error.message },
        });
      }
      throw AppError.unauthorized(error.message);
    }

    // Check user status - must be approved to login
    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('status, role')
        .eq('id', data.user.id)
        .single();

      if (profile?.status === 'pending') {
        // Sign out the user since they're not approved yet
        await supabase.auth.signOut();
        throw AppError.forbidden(
          'Your account is pending approval. Please wait for admin confirmation.'
        );
      }

      if (profile?.status === 'suspended') {
        await supabase.auth.signOut();
        throw AppError.forbidden('Your account has been suspended. Please contact support.');
      }

      // Update last_login timestamp
      await supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', data.user.id);

      // Log successful login
      await logAndNotify(
        {
          userId: data.user.id,
          eventType: 'login',
          ipAddress,
          userAgent,
          metadata: { email },
        },
        {
          email: data.user.email,
          name: data.user.user_metadata?.full_name,
          preferences: undefined, // Will fetch from DB in logAndNotify
        }
      );
    }

    res.json({
      success: true,
      data: {
        user: data.user,
        session: data.session,
      },
    });
  })
);

/**
 * Register new user
 * New users start with 'pending' status and must be approved by admin
 */
router.post(
  '/register',
  authLimiter,
  validateBody(signupSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password, fullName } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    // Create user profile with 'pending' status
    if (data.user) {
      await supabase.from('user_profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: 'patient',
          status: 'pending', // New users need admin approval
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }

    res.json({
      success: true,
      data: {
        user: data.user,
        session: null, // Don't return session since user needs approval
      },
      message:
        'Registration successful. Your account is pending admin approval. You will be notified once approved.',
    });
  })
);

/**
 * Logout (invalidate session)
 */
router.post(
  '/logout',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw AppError.internal();
    }

    res.json({ success: true, message: 'Logged out successfully' });
  })
);

/**
 * Refresh session token
 */
router.post(
  '/refresh',
  authLimiter,
  validateBody(refreshTokenSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refresh_token } = req.body;

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      throw AppError.unauthorized(error.message);
    }

    res.json({
      success: true,
      data: { session: data.session },
    });
  })
);

/**
 * Get current session info
 */
router.get(
  '/session',
  authenticate,
  sensitiveLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        user: req.user,
        authenticated: true,
      },
    });
  }
);

// ============================================================
// PHONE AUTHENTICATION ROUTES
// ============================================================

const phoneSignInSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
});

const phoneSignUpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum(['patient', 'provider']).optional(),
});

const phoneVerifySchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  token: z.string().length(6),
});

/**
 * Sign up with phone - sends OTP
 */
router.post(
  '/phone/signup',
  authLimiter,
  validateBody(phoneSignUpSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { phone, fullName = 'User', role = 'patient' } = req.body;

    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    res.json({
      success: true,
      message: 'OTP sent to your phone',
      data,
    });
  })
);

/**
 * Sign in with phone - sends OTP
 */
router.post(
  '/phone/signin',
  authLimiter,
  validateBody(phoneSignInSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;

    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    res.json({
      success: true,
      message: 'OTP sent to your phone',
      data,
    });
  })
);

/**
 * Verify phone OTP
 */
router.post(
  '/phone/verify',
  authLimiter,
  validateBody(phoneVerifySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { phone, token } = req.body;

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      throw AppError.unauthorized(error.message);
    }

    // Check user status — pending/suspended users must not get a session
    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('status, role')
        .eq('id', data.user.id)
        .single();

      if (profile?.status === 'pending') {
        await supabase.auth.signOut();
        throw AppError.forbidden(
          'Your account is pending approval. Please wait for admin confirmation.'
        );
      }

      if (profile?.status === 'suspended') {
        await supabase.auth.signOut();
        throw AppError.forbidden('Your account has been suspended. Please contact support.');
      }

      // Create profile if new user (no existing profile)
      if (!profile) {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          phone: data.user.phone,
          full_name: data.user.user_metadata?.full_name || 'User',
          role: data.user.user_metadata?.role || 'patient',
          status: 'pending',
        });

        // New phone users also start as pending
        await supabase.auth.signOut();
        throw AppError.forbidden(
          'Registration successful. Your account is pending admin approval.'
        );
      }

      // Update last_login timestamp
      await supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }

    res.json({
      success: true,
      data: {
        user: data.user,
        session: data.session,
      },
    });
  })
);

/**
 * Resend phone OTP
 */
router.post(
  '/phone/resend',
  authLimiter,
  validateBody(phoneSignInSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;

    const { data, error } = await supabase.auth.resend({
      type: 'sms',
      phone,
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    res.json({
      success: true,
      message: 'OTP resent',
      data,
    });
  })
);

/**
 * Update phone number (authenticated)
 */
router.put(
  '/phone',
  authenticate,
  sensitiveLimiter,
  validateBody(phoneSignInSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { phone } = req.body;

    const { data, error } = await supabase.auth.updateUser({
      phone,
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    res.json({
      success: true,
      message: 'Phone number updated',
      data: { user: data.user },
    });
  })
);

// ============================================================
// MULTI-FACTOR AUTHENTICATION (MFA) ROUTES
// ============================================================

const mfaEnrollSchema = z.object({
  friendlyName: z.string().min(1).max(50).optional(),
});

const mfaVerifySchema = z.object({
  factorId: z.string().uuid(),
  code: z.string().length(6),
});

const mfaUnenrollSchema = z.object({
  factorId: z.string().uuid(),
});

/**
 * Enroll TOTP MFA - generates QR code
 */
router.post(
  '/mfa/enroll',
  authenticate,
  sensitiveLimiter,
  validateBody(mfaEnrollSchema),
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const { friendlyName = 'Authenticator App' } = _req.body;

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });

    if (error) {
      throw AppError.internal();
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        type: data.type,
        totp: data.totp,
      },
    });
  })
);

/**
 * Verify and activate MFA factor
 */
router.post(
  '/mfa/verify',
  authenticate,
  authLimiter,
  validateBody(mfaVerifySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { factorId, code } = req.body;
    const userId = req.user!.id;
    const ipAddress = extractIPAddress(req);
    const userAgent = req.headers['user-agent'];

    // Create challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      throw AppError.badRequest(challengeError.message);
    }

    // Verify
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      throw AppError.unauthorized(error.message);
    }

    // Log MFA enabled and notify user
    const { data: userData } = await supabase.auth.getUser();
    await logAndNotify(
      {
        userId,
        eventType: 'mfa_enabled',
        ipAddress,
        userAgent,
        metadata: { factorId },
      },
      {
        email: userData.user?.email,
        phone: userData.user?.phone,
        name: userData.user?.user_metadata?.full_name,
      }
    );

    res.json({
      success: true,
      message: 'MFA factor verified',
      data,
    });
  })
);

/**
 * Challenge MFA during login
 */
router.post(
  '/mfa/challenge',
  authLimiter,
  validateBody(mfaVerifySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { factorId, code } = req.body;

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      throw AppError.badRequest(challengeError.message);
    }

    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    });

    if (error) {
      throw AppError.unauthorized(error.message);
    }

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * List enrolled MFA factors
 */
router.get(
  '/mfa/factors',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      throw AppError.internal();
    }

    res.json({
      success: true,
      data: {
        all: data.all,
        totp: data.totp,
        phone: data.phone,
      },
    });
  })
);

/**
 * Unenroll MFA factor
 */
router.delete(
  '/mfa/factors/:factorId',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const factorId = req.params.factorId as string;
    const userId = req.user!.id;
    const ipAddress = extractIPAddress(req);
    const userAgent = req.headers['user-agent'];

    const { data, error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      throw AppError.internal();
    }

    // Log MFA disabled and notify user
    const { data: userData } = await supabase.auth.getUser();
    await logAndNotify(
      {
        userId,
        eventType: 'mfa_disabled',
        ipAddress,
        userAgent,
        metadata: { factorId },
      },
      {
        email: userData.user?.email,
        phone: userData.user?.phone,
        name: userData.user?.user_metadata?.full_name,
      }
    );

    res.json({
      success: true,
      message: 'MFA factor removed',
      data,
    });
  })
);

/**
 * Get MFA assurance level
 */
router.get(
  '/mfa/assurance',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (error) {
      throw AppError.internal();
    }

    res.json({
      success: true,
      data: {
        currentLevel: data.currentLevel,
        nextLevel: data.nextLevel,
        currentAuthenticationMethods: data.currentAuthenticationMethods,
      },
    });
  })
);

// ============================================================
// EMAIL ROUTES
// ============================================================

const emailSchema = z.object({
  email: z.string().email(),
});

/**
 * Resend email confirmation
 */
router.post(
  '/email/resend-confirmation',
  authLimiter,
  validateBody(emailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    res.json({
      success: true,
      message: 'Confirmation email resent',
      data,
    });
  })
);

/**
 * Update email address
 */
router.put(
  '/email',
  authenticate,
  sensitiveLimiter,
  validateBody(emailSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email } = req.body;

    const { data, error } = await supabase.auth.updateUser({
      email,
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    res.json({
      success: true,
      message: 'Verification email sent to new address',
      data: { user: data.user },
    });
  })
);

/**
 * Request password reset
 */
const handleForgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
  });

  if (error) {
    throw AppError.badRequest(error.message);
  }

  res.json({
    success: true,
    message: 'Password reset email sent',
    data,
  });
});

router.post('/password/reset', authLimiter, validateBody(emailSchema), handleForgotPassword);

/**
 * Forgot password (alias for /password/reset)
 * Provides the standard forgot-password endpoint expected by clients
 */
router.post('/forgot-password', authLimiter, validateBody(emailSchema), handleForgotPassword);

const updatePasswordSchema = z.object({
  password: z.string().min(8),
});

/**
 * Update password (authenticated)
 */
router.put(
  '/password',
  authenticate,
  sensitiveLimiter,
  validateBody(updatePasswordSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { password } = req.body;
    const userId = req.user!.id;
    const ipAddress = extractIPAddress(req);
    const userAgent = req.headers['user-agent'];

    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    // Log password change and notify user
    await logAndNotify(
      {
        userId,
        eventType: 'password_changed',
        ipAddress,
        userAgent,
      },
      {
        email: data.user?.email,
        phone: data.user?.phone,
        name: data.user?.user_metadata?.full_name,
      }
    );

    res.json({
      success: true,
      message: 'Password updated',
      data: { user: data.user },
    });
  })
);

// ============================================================
// IDENTITY LINKING ROUTES
// ============================================================

const linkIdentitySchema = z.object({
  provider: z.enum(['google', 'github', 'facebook', 'apple']),
});

/**
 * Get linked identities for current user
 */
router.get(
  '/identities',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;

    // Get user with identities from auth
    const { data: userData, error } = await supabase.auth.getUser();

    if (error) {
      throw AppError.internal();
    }

    const identities = userData.user?.identities || [];

    res.json({
      success: true,
      data: {
        identities: identities.map((i) => ({
          id: i.id,
          provider: i.provider,
          createdAt: i.created_at,
          lastSignInAt: i.last_sign_in_at,
          identity_data: {
            email: i.identity_data?.email,
            name: i.identity_data?.full_name || i.identity_data?.name,
            avatar: i.identity_data?.avatar_url,
          },
        })),
      },
    });
  })
);

/**
 * Link OAuth provider to account
 * Returns URL to redirect user for OAuth flow
 */
router.post(
  '/identities/link',
  authenticate,
  sensitiveLimiter,
  validateBody(linkIdentitySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { provider } = req.body;
    const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`;

    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    res.json({
      success: true,
      message: `Redirect user to complete ${provider} linking`,
      data: {
        url: data.url,
        provider,
      },
    });
  })
);

const unlinkIdentitySchema = z.object({
  identityId: z.string().uuid(),
});

/**
 * Unlink identity from account
 */
router.delete(
  '/identities/:identityId',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { identityId } = req.params;

    // Get current identities to validate
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      throw AppError.internal();
    }

    const identities = userData.user?.identities || [];

    // Ensure user has at least one other auth method
    if (identities.length <= 1) {
      throw AppError.badRequest(
        'Cannot unlink last authentication method. Add another method first.'
      );
    }

    const identity = identities.find((i) => i.id === identityId);
    if (!identity) {
      throw AppError.notFound('Identity not found');
    }

    const { error } = await supabase.auth.unlinkIdentity(identity);

    if (error) {
      throw AppError.internal();
    }

    res.json({
      success: true,
      message: `${identity.provider} identity unlinked`,
    });
  })
);

// ============================================================
// ACCOUNT RECOVERY ROUTES
// ============================================================

const recoveryPhoneSchema = z.object({
  phone: z.string().min(10).max(15),
});

/**
 * Set recovery phone number
 * Allows account recovery via phone if email access is lost
 */
router.post(
  '/recovery/phone',
  authenticate,
  sensitiveLimiter,
  validateBody(recoveryPhoneSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { phone } = req.body;
    const userId = req.user!.id;

    // Update user metadata with recovery phone
    const { data, error } = await supabase.auth.updateUser({
      phone,
      data: {
        recovery_phone: phone,
        recovery_phone_verified: false,
      },
    });

    if (error) {
      throw AppError.badRequest(error.message);
    }

    // Trigger OTP verification
    await supabase.auth.signInWithOtp({ phone });

    res.json({
      success: true,
      message: 'Recovery phone set. Verify with OTP sent to your phone.',
      data: { user: data.user },
    });
  })
);

/**
 * Verify recovery phone with OTP
 */
router.post(
  '/recovery/phone/verify',
  authenticate,
  authLimiter,
  validateBody(phoneVerifySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { phone, token } = req.body;

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      throw AppError.unauthorized(error.message);
    }

    // Mark recovery phone as verified
    await supabase.auth.updateUser({
      data: {
        recovery_phone_verified: true,
      },
    });

    res.json({
      success: true,
      message: 'Recovery phone verified',
      data: { session: data.session },
    });
  })
);

/**
 * Initiate account recovery via phone
 * Used when user has lost access to email
 */
router.post(
  '/recovery/initiate',
  authLimiter,
  validateBody(recoveryPhoneSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;

    // Find user with this recovery phone
    const { data: profiles, error: lookupError } = await supabase
      .from('user_profiles')
      .select('id, phone, email')
      .eq('phone', phone)
      .single();

    if (lookupError || !profiles) {
      // Don't reveal whether phone exists
      res.json({
        success: true,
        message: 'If this phone is registered for recovery, an OTP has been sent.',
      });
      return;
    }

    // Send OTP for recovery
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      throw AppError.internal('Failed to send recovery OTP');
    }

    res.json({
      success: true,
      message: 'If this phone is registered for recovery, an OTP has been sent.',
    });
  })
);

/**
 * Complete account recovery with phone OTP
 */
router.post(
  '/recovery/complete',
  authLimiter,
  validateBody(phoneVerifySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { phone, token } = req.body;

    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      throw AppError.unauthorized('Invalid or expired OTP');
    }

    // User is now authenticated, they can reset their password
    res.json({
      success: true,
      message: 'Account recovered. You can now update your password.',
      data: {
        user: data.user,
        session: data.session,
      },
    });
  })
);

// ============================================================
// SECURITY NOTIFICATION PREFERENCES
// ============================================================

const securityPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  notifyOnLogin: z.boolean().optional(),
  notifyOnPasswordChange: z.boolean().optional(),
  notifyOnEmailChange: z.boolean().optional(),
  notifyOnNewDevice: z.boolean().optional(),
});

/**
 * Get security notification preferences
 */
router.get(
  '/security/preferences',
  authenticate,
  sensitiveLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('security_preferences')
      .eq('id', userId)
      .single();

    if (error) {
      throw AppError.internal();
    }

    const defaults = {
      emailNotifications: true,
      smsNotifications: false,
      notifyOnLogin: false,
      notifyOnPasswordChange: true,
      notifyOnEmailChange: true,
      notifyOnNewDevice: true,
    };

    res.json({
      success: true,
      data: {
        preferences: { ...defaults, ...(data?.security_preferences || {}) },
      },
    });
  })
);

/**
 * Update security notification preferences
 */
router.put(
  '/security/preferences',
  authenticate,
  sensitiveLimiter,
  validateBody(securityPreferencesSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const preferences = req.body;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        security_preferences: preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw AppError.internal();
    }

    res.json({
      success: true,
      message: 'Security preferences updated',
      data: { preferences },
    });
  })
);

export default router;
