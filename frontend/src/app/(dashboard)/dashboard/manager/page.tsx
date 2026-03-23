"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { shouldSeeDashboard, getDashboardRoute } from "@/lib/dashboard-routes";
import dynamic from "next/dynamic";

const ManagerDashboard = dynamic(() => import("@/components/dashboards/ManagerDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
});

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authorization
  useEffect(() => {
    if (!mounted || !user) return;
    
    if (!shouldSeeDashboard(user, "/dashboard/manager")) {
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

  if (!shouldSeeDashboard(user, "/dashboard/manager")) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ManagerDashboard />
    </ErrorBoundary>
  );
}

