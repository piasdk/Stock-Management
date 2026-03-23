"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getToken, getUser, setToken, setUser, clearAuth, type User } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";

interface LoginCredentials {
  email: string;
  password: string;
}

interface CompanyPayload {
  name: string;
  legal_name?: string;
  country?: string;
  email?: string;
  phone?: string;
}

interface SignupData {
  companyId?: number;
  company?: CompanyPayload;
  fullName: string;
  email: string;
  password: string;
}

export function useAuth() {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const userData = getUser();
    if (token && userData) {
      setUserState(userData);
    }
    setInitializing(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{ user: User; token: string }>("/auth/login", credentials);

      if (response.error) {
        setError(response.error);
        return false;
      }

      if (response.data) {
        setToken(response.data.token);
        setUser(response.data.user);
        setUserState(response.data.user);
        // Sync with authStore
        useAuthStore.getState().setAuth(response.data.user, response.data.token);
        return true;
      }

      setError("Unable to login with the provided credentials.");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error during login.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: SignupData | { first_name: string; last_name: string; email: string; password: string; invitation_token?: string }) => {
    setLoading(true);
    setError(null);

    // Handle both SignupData format and invitation signup format
    let payload: Record<string, unknown>;
    
    if ('invitation_token' in data) {
      // Invitation signup format
      payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        invitation_token: data.invitation_token,
      };
    } else {
      // Regular signup format
      const [firstName, ...rest] = data.fullName.trim().split(" ");
      const lastName = rest.join(" ") || "";

      payload = {
        company_id: data.companyId,
        first_name: firstName || data.fullName,
        last_name: lastName || firstName || data.fullName,
        email: data.email,
        password: data.password,
      };

      if (!data.companyId && data.company) {
        payload.company = {
          name: data.company.name,
          legal_name: data.company.legal_name,
          country: data.company.country,
          email: data.company.email,
          phone: data.company.phone,
        };
      }
    }

    try {
      const response = await api.post<{ user: User; token: string }>("/auth/signup", payload);

      if (response.error) {
        setError(response.error);
        return false;
      }

      if (response.data) {
        setToken(response.data.token);
        setUser(response.data.user);
        setUserState(response.data.user);
        // Sync with authStore
        useAuthStore.getState().setAuth(response.data.user, response.data.token);
        return true;
      }

      setError("Unable to complete signup.");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error during signup.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
    setUserState(null);
    // Sync with authStore
    useAuthStore.getState().clearAuth();
  };

  const clearError = () => setError(null);

  /**
   * Check if authenticated
   */
  const isAuthenticated = () => {
    return user !== null && getToken() !== null;
  };

  return {
    user,
    loading,
    initializing,
    error,
    login,
    signup,
    logout,
    clearError,
    isAuthenticated: isAuthenticated(),
  };
}

