"use client";

import React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuthStore } from "@/store/authStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { ROUTES, ROLE_CODES } from "@/lib/constants";
import { getDashboardRoute } from "@/lib/dashboard-routes";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, initialize } = useAuthStore();
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Initialize currentPath immediately with pathname to prevent sidebar flash
  const [currentPath, setCurrentPath] = React.useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname || pathname || null;
    }
    return pathname || null;
  });

  // Initialize auth on mount - MUST call all hooks before any early returns
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        initialize();
        setIsInitialized(true);
      }
    } catch (err) {
      console.error("Error initializing auth:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize");
      setIsInitialized(true);
    }
  }, [initialize]);

  // Update current path when pathname changes (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname || pathname || null);
    } else {
      setCurrentPath(pathname || null);
    }
  }, [pathname]);

  // Check authentication after initialization
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      const token = useAuthStore.getState().token;
      const user = useAuthStore.getState().user;
      const isAuthenticated = token !== null && user !== null;

      if (!isAuthenticated && typeof window !== "undefined") {
        router.push(ROUTES.LOGIN);
        return;
      }

      // Redirect accountants away from pages that would show the old sidebar
      // Accountants should only use their dedicated dashboard
      if (user?.role_code === ROLE_CODES.ACCOUNTANT && typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        // Allow only the accountant dashboard and its sub-routes
        if (!currentPath.startsWith('/dashboard/accountant') && 
            currentPath !== '/dashboard/accountant' &&
            currentPath !== '/login' &&
            currentPath !== '/register' &&
            currentPath !== '/signup') {
          const dashboardRoute = getDashboardRoute(user);
          router.replace(dashboardRoute);
        }
      }

      // Redirect production supervisors to their dedicated dashboard
      if (user?.role_code === ROLE_CODES.PRODUCTION_SUPERVISOR && typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        // Allow only the production supervisor dashboard and its sub-routes
        if (!currentPath.startsWith('/dashboard/production-supervisor') && 
            currentPath !== '/dashboard/production-supervisor' &&
            currentPath !== '/login' &&
            currentPath !== '/register' &&
            currentPath !== '/signup') {
          const dashboardRoute = getDashboardRoute(user);
          router.replace(dashboardRoute);
        }
      }
    } catch (err) {
      console.error("Error checking authentication:", err);
      setError(err instanceof Error ? err.message : "Authentication check failed");
    }
  }, [isInitialized, router]);

  // Operations route now redirects server-side, so we don't need special handling
  // Check if we're on a dashboard route that uses its own layout (like manager/branch-admin)
  // Use safe checks to avoid SSR issues
  // IMPORTANT: Check this FIRST before any rendering to prevent unwanted sidebar
  // Use state variable that updates with pathname changes, with immediate fallback to pathname
  const pathToCheck = currentPath || pathname || (typeof window !== "undefined" ? window.location.pathname : '') || '';
  const isOperationsRoute = pathToCheck.startsWith('/operations');
  const isManagerDashboard = pathToCheck.startsWith('/dashboard/manager');
  const isBranchAdminDashboard = pathToCheck.startsWith('/dashboard/branch-admin');
  const isAccountantDashboard = pathToCheck.startsWith('/dashboard/accountant');
  const isProductionSupervisorDashboard = pathToCheck.startsWith('/dashboard/production-supervisor');
  // Branch Admin Dashboard now uses MainLayout (like Super Admin), so it doesn't need own layout
  const usesOwnLayout = isManagerDashboard || isAccountantDashboard || isProductionSupervisorDashboard;
  
  // Operations route redirects, so skip layout processing for it
  // BUT all hooks must be called first (above) before this early return
  if (isOperationsRoute) {
    return <>{children}</>;
  }

  // For routes with their own layout (manager dashboard, accountant dashboard, production supervisor dashboard)
  // return children without MainLayout IMMEDIATELY - even during loading
  // This prevents the unwanted sidebar from showing during initialization
  // CRITICAL: This check must happen BEFORE any MainLayout rendering
  // Check both currentPath state and pathname to catch it immediately
  const shouldUseOwnLayout = usesOwnLayout || 
    pathname?.startsWith('/dashboard/manager') || 
    pathname?.startsWith('/dashboard/accountant') ||
    pathname?.startsWith('/dashboard/production-supervisor') ||
    currentPath?.startsWith('/dashboard/manager') ||
    currentPath?.startsWith('/dashboard/accountant') ||
    currentPath?.startsWith('/dashboard/production-supervisor');
  
  if (shouldUseOwnLayout) {
    // Still show loading/error states, but without MainLayout wrapper
    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    if (!isInitialized) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      );
    }

    const isAuthenticated = user !== null && token !== null;
    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      );
    }

    // Return children directly WITHOUT MainLayout wrapper
    return <>{children}</>;
  }

  // Show error if initialization failed (for routes that use MainLayout)
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading while initializing (for routes that use MainLayout)
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Check auth after initialization (for routes that use MainLayout)
  const isAuthenticated = user !== null && token !== null;
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // For routes that use MainLayout (with sidebar)
  return (
    <ErrorBoundary>
      <MainLayout>{children}</MainLayout>
    </ErrorBoundary>
  );
}

