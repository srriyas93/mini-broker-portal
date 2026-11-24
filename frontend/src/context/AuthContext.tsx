import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { User, UserRole } from '../types';
import {
  authApi,
  getStoredToken,
  getStoredUser,
  saveAuthData,
  clearAuthData,
} from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClient: boolean;
  login: (token: string, user: User, remember: boolean) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      if (storedToken) {
        try {
          const res = await authApi.me();
          setUser(res.user);
          setToken(storedToken);
          // Sync fresh user data back to the active storage
          const isRemembered = localStorage.getItem('remember_me') === 'true';
          saveAuthData(storedToken, res.user, isRemembered);
        } catch {
          clearAuthData();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User, remember: boolean) => {
    saveAuthData(newToken, newUser, remember);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthData();
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      setUser(res.user);
      const isRemembered = localStorage.getItem('remember_me') === 'true';
      if (token) {
        saveAuthData(token, res.user, isRemembered);
      }
    } catch {
      // Ignore background refresh errors
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    const isRemembered = localStorage.getItem('remember_me') === 'true';
    if (token) {
      saveAuthData(token, updatedUser, isRemembered);
    }
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === ('admin' as UserRole);
  const isClient = user?.role === ('client' as UserRole);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated,
      isAdmin,
      isClient,
      login,
      logout,
      refreshUser,
      updateUser,
    }),
    [user, token, isLoading, isAuthenticated, isAdmin, isClient]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

