import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(api.getToken());
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Add toast notification
  const notify = (title, message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setNotifications(prev => [{ id, title, message, type, timestamp: new Date() }, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Switch identity
  const loginAs = async (userIdOrUsername) => {
    setLoading(true);
    try {
      const res = await api.login(userIdOrUsername, userIdOrUsername);
      api.setToken(res.token);
      setToken(res.token);
      setUser(res.user);
      notify('Identity Authenticated', `Welcome, ${res.user.name} (${res.user.role})`, 'success');
      return res.user;
    } catch (err) {
      console.error('[Auth] Login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    notify('Logged Out', 'Session terminated.', 'info');
  };

  // Load initial session & demo accounts list
  useEffect(() => {
    async function initAuth() {
      try {
        const accountsRes = await api.getDemoAccounts();
        setDemoAccounts(accountsRes.accounts || []);

        const savedToken = api.getToken();
        if (savedToken) {
          try {
            const meRes = await api.getMe();
            setUser(meRes.user);
          } catch (e) {
            // Token expired or invalid, clear session
            api.setToken(null);
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('[Auth] Init demo accounts failed:', err);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const value = {
    user,
    token,
    loading,
    demoAccounts,
    notifications,
    notify,
    removeNotification,
    loginAs,
    logout,
    isAdmin: user?.role === 'Admin',
    isClient: user?.role === 'Client'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
