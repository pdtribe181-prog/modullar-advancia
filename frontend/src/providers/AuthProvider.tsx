import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthResponse {
  data: {
    token: string;
    user: User;
  };
}

interface ProfileResponse {
  data: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token and validate
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      api.setToken(storedToken);
      // Fetch user profile
      api.get<ProfileResponse>('/profile')
        .then((data) => {
          setUser(data.data);
          setToken(storedToken);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/signin', { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    api.setToken(newToken);
    setToken(newToken);
    setUser(userData);
  };

  const signup = async (email: string, password: string, role = 'patient') => {
    const response = await api.post<AuthResponse>('/auth/signup', { email, password, role });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    api.setToken(newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    api.setToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
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
