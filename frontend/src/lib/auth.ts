/**
 * Authentication Utilities
 */

import { STORAGE_KEYS } from "./constants";

export interface User {
  user_id: number;
  company_id: number | null;
  branch_id: number | null;
  email: string;
  first_name: string;
  last_name: string;
  is_super_admin: boolean;
  is_company_admin: boolean;
  is_branch_admin: boolean;
  status: string;
  role_id?: number | null;
  role_name?: string | null;
  role_code?: string | null;
  last_login?: string | null;
  last_login_at?: string | null;
}

/**
 * Get auth token from sessionStorage (tab-specific to prevent cross-tab interference)
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Set auth token in sessionStorage (tab-specific to prevent cross-tab interference)
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  // Also set in localStorage for persistence across page refreshes (but not shared across tabs)
  // We'll use a tab-specific key to prevent cross-tab interference
  const tabId = getOrCreateTabId();
  localStorage.setItem(`${STORAGE_KEYS.AUTH_TOKEN}_${tabId}`, token);
  // Set cookie with SameSite=Lax for same-site requests (works for localhost and same domain)
  // This ensures the cookie is accessible to Next.js API routes
  document.cookie = `auth_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}

/**
 * Remove auth token from sessionStorage
 */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  const tabId = getOrCreateTabId();
  localStorage.removeItem(`${STORAGE_KEYS.AUTH_TOKEN}_${tabId}`);
}

/**
 * Get or create a unique tab ID for this browser tab
 */
function getOrCreateTabId(): string {
  if (typeof window === "undefined") return "default";
  let tabId = sessionStorage.getItem("tab_id");
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("tab_id", tabId);
  }
  return tabId;
}

/**
 * Get user from sessionStorage (tab-specific to prevent cross-tab interference)
 */
export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const userStr = sessionStorage.getItem(STORAGE_KEYS.USER);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Set user in sessionStorage (tab-specific to prevent cross-tab interference)
 */
export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  // Also store in localStorage with tab-specific key for persistence
  const tabId = getOrCreateTabId();
  localStorage.setItem(`${STORAGE_KEYS.USER}_${tabId}`, JSON.stringify(user));
}

/**
 * Remove user from sessionStorage
 */
export function removeUser(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEYS.USER);
  const tabId = getOrCreateTabId();
  localStorage.removeItem(`${STORAGE_KEYS.USER}_${tabId}`);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null && getUser() !== null;
}

/**
 * Initialize auth from localStorage on page load (for persistence across refreshes)
 * This is called once when the app loads to restore the session from the previous page load
 */
export function initializeAuthFromStorage(): void {
  if (typeof window === "undefined") return;
  const tabId = getOrCreateTabId();
  
  // Try to restore from localStorage using tab-specific key
  const storedToken = localStorage.getItem(`${STORAGE_KEYS.AUTH_TOKEN}_${tabId}`);
  const storedUser = localStorage.getItem(`${STORAGE_KEYS.USER}_${tabId}`);
  
  if (storedToken && storedUser) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, storedToken);
      sessionStorage.setItem(STORAGE_KEYS.USER, storedUser);
    } catch (error) {
      console.error("Error restoring auth from storage:", error);
    }
  }
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: User | null): boolean {
  return user?.is_super_admin === true;
}

/**
 * Check if user is company admin
 */
export function isCompanyAdmin(user: User | null): boolean {
  return user?.is_company_admin === true;
}

/**
 * Check if user is branch admin
 */
export function isBranchAdmin(user: User | null): boolean {
  return user?.is_branch_admin === true;
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  removeToken();
  removeUser();
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.COMPANY);
    localStorage.removeItem(STORAGE_KEYS.BRANCH);
    // Also clear any cookies that might exist
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }
}

