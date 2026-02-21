import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    aud?: string;
    [key: string]: any;
  };
  userProfile?: {
    id: string;
    role: string;
    full_name?: string;
    stripe_customer_id?: string;
    [key: string]: any;
  };
}

/**
 * Authenticate user via Supabase JWT token
 * Requires: Authorization: Bearer <token>
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Authenticate and fetch user profile with role
 * Use when you need role-based access control
 */
export const authenticateWithProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch user profile with role – select only needed columns
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, full_name, stripe_customer_id, status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.user = user;
    req.userProfile = profile;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Require specific roles
 * Use after authenticate or authenticateWithProfile middleware
 */
export const requireRole = (...allowedRoles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // If profile not loaded, fetch it – select only needed columns
    if (!req.userProfile && req.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role, full_name, stripe_customer_id, status')
        .eq('id', req.user.id)
        .single();

      req.userProfile = profile || undefined;
    }

    const userRole = req.userProfile?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      // Do NOT leak role info (current role or required roles) to the client
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Use for routes that work differently for authenticated vs anonymous users
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore auth errors for optional auth
    }
  }

  next();
};

/**
 * Require admin role
 */
export const requireAdmin = [authenticate, requireRole('admin')];

/**
 * Require provider role
 */
export const requireProvider = [authenticate, requireRole('provider', 'admin')];

/**
 * Require patient role
 */
export const requirePatient = [authenticate, requireRole('patient', 'admin')];
