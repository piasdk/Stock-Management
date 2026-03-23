"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import SuperAdminDashboard from "@/components/dashboards/SuperAdminDashboard";
import { shouldSeeDashboard, getDashboardRoute } from "@/lib/dashboard-routes";

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authorization
  useEffect(() => {
    if (!mounted || !user) return;
    
    if (!shouldSeeDashboard(user, "/dashboard/super-admin")) {
      router.replace(getDashboardRoute(user));
    }
  }, [mounted, user, router]);

  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!shouldSeeDashboard(user, "/dashboard/super-admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SuperAdminDashboard />
    </ErrorBoundary>
  );
}

