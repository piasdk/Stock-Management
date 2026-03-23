/**
 * API Client
 * Centralized API request handling
 */

import { API_BASE_URL } from "./constants";
import { getToken, clearAuth } from "./auth";

export interface ApiError {
  error: string;
  details?: any;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: any;
}

/**
 * Make API request
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    // Log warning if no token but making authenticated request (except login/signup)
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
      console.warn(`[API] No token available for request to ${endpoint}`);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies in the request
    });

    // Try to parse JSON, but handle non-JSON responses
    // Skip parsing for 204 No Content responses
    let data: any = {};
    if (response.status !== 204) {
      try {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch {
        // If response is not JSON, use status text
        data = { error: response.statusText };
      }
    }

    // Handle 401 Unauthorized - only logout if it's actually an auth error
    if (response.status === 401) {
      // Only clear auth if it's a real authentication error (missing/invalid/expired token)
      // Not if it's just a permission issue or a temporary network error
      const errorMsg = (data.error || "").toLowerCase();
      const isPermissionError = errorMsg.includes("permission") || 
                                errorMsg.includes("administrator") ||
                                errorMsg.includes("only administrators") ||
                                errorMsg.includes("access denied") ||
                                errorMsg.includes("don't have permission");
      
      // Check if token exists - if no token, it's definitely an auth error
      const hasToken = !!token;
      
      // "No token provided" from Next.js proxy means the cookie/header wasn't sent
      // This could be a cookie issue, not necessarily that the user isn't logged in
      // So we should try to refresh/re-authenticate rather than immediately logout
      const isNoTokenError = errorMsg.includes("no token provided");
      
      // Only logout if:
      // 1. No token exists AND it's not just a "no token provided" error (which might be a cookie issue)
      // 2. Error message explicitly mentions token expiration or invalid token
      // 3. Error message mentions authentication/login (but NOT permission)
      const isTokenError = errorMsg.includes("token expired") || 
                          errorMsg.includes("invalid token") ||
                          errorMsg.includes("expired token");
      
      const isAuthError = errorMsg.includes("authentication") || 
                         errorMsg.includes("login") ||
                         errorMsg.includes("unauthorized");
      
      // For "no token provided" errors, check if we actually have a token in localStorage
      // If we do, it's likely a cookie/header forwarding issue, not an auth issue
      if (isNoTokenError && hasToken) {
        console.warn("[API] Token exists but not forwarded to server. This might be a cookie/header issue.");
        // Try to refresh the cookie
        const token = getToken();
        if (token && typeof document !== 'undefined') {
          // Refresh the cookie to ensure it's set
          document.cookie = `auth_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        }
        // Don't logout - just return the error and let the user retry
        return {
          error: "Authentication token not forwarded. Please try again or refresh the page.",
        };
      }
      
      // Logout only if it's clearly a token/auth issue, not a permission issue
      if ((!hasToken || isTokenError || (isAuthError && !isPermissionError)) && !isPermissionError && !isNoTokenError) {
        console.warn("[API] Authentication error detected, logging out:", errorMsg);
        clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return {
          error: "Unauthorized. Please login again.",
        };
      }
      
      // If it's a permission error or unclear, don't logout - just return the error
      // This prevents accidental logouts from permission issues or network errors
      return {
        error: data.error || "You don't have permission to perform this action.",
      };
    }

    if (!response.ok) {
      return {
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        details: {
          ...data.details,
          status: response.status,
        },
      };
    }

    // For 204 No Content, return success without data
    if (response.status === 204) {
      return { data: null as T };
    }

    return { data };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Network error. Please check your connection.",
    };
  }
}

/**
 * GET request
 */
export async function get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
  let url = endpoint;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  return request<T>(url, { method: "GET" });
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "DELETE" });
}

/**
 * API client object
 */
export const api = {
  get,
  post,
  put,
  patch,
  delete: del,
};

export default api;

