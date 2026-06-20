import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('aegis_user');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Normalize: ensure _id is always set (old sessions used `id`)
    if (parsed && !parsed._id && parsed.id) {
      parsed._id = parsed.id;
    }
    return parsed;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // On mount, validate the stored token is still valid
  useEffect(() => {
    const token = localStorage.getItem('aegis_token');
    if (token && !user) {
      authAPI.getMe()
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('aegis_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('aegis_token');
          localStorage.removeItem('aegis_user');
          setUser(null);
        });
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.login(email, password);
      const { token, user: userData } = res.data;
      localStorage.setItem('aegis_token', token);
      localStorage.setItem('aegis_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, role: userData.role };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.register(name, email, password, role);
      const { token, user: userData } = res.data;
      localStorage.setItem('aegis_token', token);
      localStorage.setItem('aegis_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, role: userData.role };
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aegis_token');
    localStorage.removeItem('aegis_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
};
