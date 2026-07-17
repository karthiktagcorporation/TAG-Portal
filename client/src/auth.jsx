import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, clearToken, getToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const d = await api('/api/auth/login', { method: 'POST', body: { username, password } });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const faceLogin = useCallback(async (username, descriptors) => {
    const d = await api('/api/auth/face-login', { method: 'POST', body: { username, descriptors } });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const d = await api('/api/auth/me');
    setUser(d.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, faceLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
