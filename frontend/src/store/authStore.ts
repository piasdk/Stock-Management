"use client";

import { create } from "zustand";
import type { User } from "@/lib/auth";
import { getToken, getUser, setToken, setUser, clearAuth, initializeAuthFromStorage } from "@/lib/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,

  setAuth: (user, token) => {
    setToken(token);
    setUser(user);
    set({
      user,
      token,
    });
  },

  clearAuth: () => {
    clearAuth();
    set({
      user: null,
      token: null,
    });
  },

  updateUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      setUser(updatedUser);
      set({ user: updatedUser });
    }
  },

  initialize: () => {
    if (typeof window === "undefined") return;
    // Initialize auth from localStorage (for persistence across page refreshes)
    initializeAuthFromStorage();
    const token = getToken();
    const user = getUser();
    if (token && user) {
      set({
        user,
        token,
      });
    }
  },
}));

// Initialize on mount - moved to client-side only
// This initialization happens in components that use the store

