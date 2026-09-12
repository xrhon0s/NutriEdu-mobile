import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, setUnauthorizedHandler } from '@/services/api';
import { cancelLocalReminders } from '@/services/local-notifications';
import { storage } from '@/services/storage';

const TOKEN_KEY = 'nutriedu_token';
const USER_KEY = 'nutriedu_user';

export type AuthUser = {
  id: number;
  nombre: string;
  email: string;
  rol: string;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  notice: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearNotice: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const clearSession = useCallback(async () => {
    await Promise.allSettled([
      storage.remove(TOKEN_KEY),
      storage.remove(USER_KEY),
      cancelLocalReminders(),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)])
      .then(([savedToken, savedUser]) => {
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      })
      .catch(() => Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setNotice('Tu sesion expiro. Inicia sesion nuevamente.');
      void clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = async (email: string, password: string) => {
    const response = await apiRequest<LoginResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    await Promise.all([
      storage.set(TOKEN_KEY, response.token),
      storage.set(USER_KEY, JSON.stringify(response.user)),
    ]);
    setToken(response.token);
    setUser(response.user);
    setNotice('');
  };

  const logout = async () => {
    setNotice('');
    await clearSession();
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, notice, login, logout, clearNotice: () => setNotice('') }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
