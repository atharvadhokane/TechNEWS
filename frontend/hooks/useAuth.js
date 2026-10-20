'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

const TOKEN_KEY = 'ai_tech_news_token';

export function useAuth() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (stored) setToken(stored);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    window.localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, login, logout, isAuthenticated: Boolean(token) };
}
