import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiError } from '../services/api';

interface User {
  id: string;
  email: string;
  phone?: string;
  role: string;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type SupabaseSession = {
  access_token: string;
  expires_at?: number; // seconds since epoch
};

type AuthApiData = {
  user: unknown;
  session: SupabaseSession | null;
};

type ProfileResponse = ApiEnvelope<User>;

function extractTokenAndExpiry(session: SupabaseSession | null): { token: string; expiresAt?: number } {
  if (!session?.access_token) {
    throw new Error('Authentication succeeded but no session token was returned');
  }

  return {
    token: session.access_token,
    expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
  };
}

interface MFAFactor {
  id: string;
  type: 'totp' | 'phone';
  friendlyName?: string;
  status: 'verified' | 'unverified';
}

interface MFAEnrollResponse {
  data: {
    id: string;
    type: 'totp';
    totp: {
      qr_code: string;
      secret: string;
      uri: string;
    };
  };
}

interface MFAFactorsResponse {
  data: {
    all: MFAFactor[];
    totp: MFAFactor[];
    phone: MFAFactor[];
  };
}

interface PhoneOtpResponse {
  success: boolean;
  message: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  mfaRequired: boolean;
  mfaFactorId: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  /** Hydrate auth state from an OAuth access_token (e.g. after Supabase redirect). */
  setTokenFromOAuth: (accessToken: string, expiresIn?: number) => Promise<void>;
  // Phone auth
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, code: string) => Promise<void>;
  // OAuth
  signInWithGoogle: () => Promise<void>;
  // MFA
  enrollMFA: (friendlyName?: string) => Promise<MFAEnrollResponse['data']>;
  verifyMFA: (factorId: string, code: string) => Promise<void>;
  challengeMFA: (factorId: string, code: string) => Promise<void>;
  listMFAFactors: () => Promise<MFAFactor[]>;
  unenrollMFA: (factorId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Session storage keys
const TOKEN_KEY = 'token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const USER_KEY = 'user_data';

// Check if token is expired (with 5 minute buffer)
function isTokenExpired(expiryTime: number | null): boolean {
  if (!expiryTime) return false;
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return Date.now() >= expiryTime - bufferMs;
}

// Parse JWT to get expiry (if no expiresAt from server)
function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(() => {
    const stored = localStorage.getItem(TOKEN_EXPIRY_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  // Clear all auth data
  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(USER_KEY);
    api.setToken(null);
    setToken(null);
    setTokenExpiry(null);
    setUser(null);
  }, []);

  // Set auth data
  const setAuth = useCallback((newToken: string, userData: User, expiresAt?: number) => {
    const expiry = expiresAt || getTokenExpiry(newToken);

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    if (expiry) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    }

    api.setToken(newToken);
    setToken(newToken);
    setTokenExpiry(expiry);
    setUser(userData);
  }, []);

  // Validate current session
  const validateSession = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    const expiry = storedExpiry ? parseInt(storedExpiry, 10) : null;

    if (!storedToken) {
      clearAuth();
      return false;
    }

    // Check if token is expired
    if (isTokenExpired(expiry)) {
      clearAuth();
      return false;
    }

    // Validate token with server
    try {
      api.setToken(storedToken);
      const response = await api.get<ProfileResponse>('/profile');
      setAuth(storedToken, response.data, expiry || undefined);
      return true;
    } catch (err) {
      // If 401, clear auth
      if (err instanceof ApiError && err.status === 401) {
        clearAuth();
      }
      return false;
    }
  }, [clearAuth, setAuth]);

  // Initial session validation
  useEffect(() => {
    validateSession().finally(() => setLoading(false));
  }, [validateSession]);

  // Session expiry timer
  useEffect(() => {
    if (!tokenExpiry || !token) return;

    const timeUntilExpiry = tokenExpiry - Date.now();
    if (timeUntilExpiry <= 0) {
      clearAuth();
      return;
    }

    // Set timer to clear auth when token expires
    const timerId = setTimeout(() => {
      clearAuth();
      // Dispatch custom event for UI to react
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }, timeUntilExpiry);

    return () => clearTimeout(timerId);
  }, [tokenExpiry, token, clearAuth]);

  // Cross-tab session sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        if (e.newValue === null) {
          // Logged out in another tab
          setToken(null);
          setUser(null);
          setTokenExpiry(null);
        } else if (e.newValue !== token) {
          // Token changed in another tab
          validateSession();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [token, validateSession]);

  // API error handler for 401 responses
  useEffect(() => {
    const handleAuthError = () => {
      clearAuth();
    };

    window.addEventListener('auth:unauthorized', handleAuthError);
    return () => window.removeEventListener('auth:unauthorized', handleAuthError);
  }, [clearAuth]);

  const login = async (email: string, password: string) => {
    const authRes = await api.post<ApiEnvelope<AuthApiData>>('/auth/login', { email, password });
    const { token: newToken, expiresAt } = extractTokenAndExpiry(authRes.data.session);

    api.setToken(newToken);
    const profileRes = await api.get<ProfileResponse>('/profile');
    setAuth(newToken, profileRes.data, expiresAt);
  };

  const signup = async (email: string, password: string, fullName?: string, role = 'patient') => {
    const registerRes = await api.post<ApiEnvelope<AuthApiData>>('/auth/register', {
      email,
      password,
      fullName,
      role,
    });

    // The backend may intentionally return no session until admin approval.
    if (!registerRes.data.session?.access_token) {
      throw new Error(registerRes.message || 'Registration successful. Your account is pending approval.');
    }

    const { token: newToken, expiresAt } = extractTokenAndExpiry(registerRes.data.session);
    api.setToken(newToken);
    const profileRes = await api.get<ProfileResponse>('/profile');
    setAuth(newToken, profileRes.data, expiresAt);
  };

  const logout = useCallback(async () => {
    // Attempt server-side logout (best-effort, don't block on failure)
    try {
      await api.post('/auth/logout');
    } catch {
      // Server logout failed — still clear local state
    }
    clearAuth();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }, [clearAuth]);

  const refreshSession = useCallback(async () => {
    await validateSession();
  }, [validateSession]);

  /**
   * Set auth state from an OAuth redirect access_token.
   * Called by AuthCallback after Supabase redirects back with the token in the URL hash.
   */
  const setTokenFromOAuth = useCallback(async (accessToken: string, expiresIn = 3600) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    api.setToken(accessToken);
    const profileRes = await api.get<ProfileResponse>('/profile');
    setAuth(accessToken, profileRes.data, expiresAt);
  }, [setAuth]);

  // Phone auth methods
  const sendPhoneOtp = async (phone: string) => {
    await api.post<PhoneOtpResponse>('/auth/phone/signin', { phone });
  };

  const verifyPhoneOtp = async (phone: string, code: string) => {
    const authRes = await api.post<ApiEnvelope<AuthApiData>>('/auth/phone/verify', { phone, token: code });
    const { token: newToken, expiresAt } = extractTokenAndExpiry(authRes.data.session);

    api.setToken(newToken);
    const profileRes = await api.get<ProfileResponse>('/profile');
    setAuth(newToken, profileRes.data, expiresAt);
    setMfaRequired(false);
    setMfaFactorId(null);
  };

  // OAuth methods
  const signInWithGoogle = async () => {
    // This redirects to Supabase OAuth flow
    const googleAuthUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
    window.location.href = googleAuthUrl;
  };

  // MFA methods
  const enrollMFA = async (friendlyName = 'Authenticator App'): Promise<MFAEnrollResponse['data']> => {
    const response = await api.post<MFAEnrollResponse>('/auth/mfa/enroll', { friendlyName });
    return response.data;
  };

  const verifyMFA = async (factorId: string, code: string) => {
    await api.post('/auth/mfa/verify', { factorId, code });
  };

  const challengeMFA = async (factorId: string, code: string) => {
    const authRes = await api.post<ApiEnvelope<AuthApiData>>('/auth/mfa/challenge', { factorId, code });
    const { token: newToken, expiresAt } = extractTokenAndExpiry(authRes.data.session);

    api.setToken(newToken);
    const profileRes = await api.get<ProfileResponse>('/profile');
    setAuth(newToken, profileRes.data, expiresAt);
    setMfaRequired(false);
    setMfaFactorId(null);
  };

  const listMFAFactors = async (): Promise<MFAFactor[]> => {
    const response = await api.get<MFAFactorsResponse>('/auth/mfa/factors');
    return response.data.all;
  };

  const unenrollMFA = async (factorId: string) => {
    await api.delete(`/auth/mfa/factors/${factorId}`);
  };

  const isAuthenticated = !!token && !!user && !isTokenExpired(tokenExpiry);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated,
      mfaRequired,
      mfaFactorId,
      login,
      signup,
      logout,
      refreshSession,
      setTokenFromOAuth,
      // Phone auth
      sendPhoneOtp,
      verifyPhoneOtp,
      // OAuth
      signInWithGoogle,
      // MFA
      enrollMFA,
      verifyMFA,
      challengeMFA,
      listMFAFactors,
      unenrollMFA,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
