"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { shouldSeeDashboard, getDashboardRoute } from "@/lib/dashboard-routes";
import { ROLE_CODES } from "@/lib/constants";
import dynamic from "next/dynamic";

const ProductionSupervisorDashboard = dynamic(() => import("@/components/dashboards/ProductionSupervisorDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
});

export default function ProductionSupervisorDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authorization
  useEffect(() => {
    if (!mounted || !user) return;
    
    // Redirect if user is not a production supervisor
    if (!shouldSeeDashboard(user, "/dashboard/production-supervisor")) {
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

  if (!shouldSeeDashboard(user, "/dashboard/production-supervisor")) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ProductionSupervisorDashboard />
    </ErrorBoundary>
  );
}

