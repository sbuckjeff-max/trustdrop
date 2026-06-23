import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../api/auth';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (nextToken: string, nextUser: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      if (!token) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const me = await getMe(token);
        if (isMounted) {
          setUser(me);
        }
      } catch {
        if (isMounted) {
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        localStorage.setItem('token', nextToken);
      },
      logout: () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
      },
    }),
    [loading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
