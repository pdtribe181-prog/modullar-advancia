import { Router, Response } from 'express';
import { authenticate, authenticateWithProfile, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createServiceClient } from '../lib/supabase.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();
const supabase = createServiceClient();

// ============================================================
// PROFILE ROUTES
// ============================================================

/**
 * Get current user's profile
 */
router.get('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
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
          return res.status(500).json({ error: createError.message });
        }
        return res.json(newProfile);
      }
      return res.status(500).json({ error: error.message });
    }

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update current user's profile
 */
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
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
      return res.status(500).json({ error: error.message });
    }

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SUPABASE AUTH PROXY ROUTES
// ============================================================

/**
 * Login with email/password
 * Note: In production, use Supabase client directly from frontend
 */
router.post('/login', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Register new user
 */
router.post('/register', authLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session,
      message: 'Check your email for verification link',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Logout (invalidate session)
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Refresh session token
 */
router.post('/refresh', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      session: data.session,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current session info
 */
router.get('/session', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: req.user,
    authenticated: true,
  });
});

export default router;
