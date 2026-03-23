"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import AccountantDashboard from "@/components/dashboards/AccountantDashboard";
import { shouldSeeDashboard, getDashboardRoute } from "@/lib/dashboard-routes";
import { ROLE_CODES } from "@/lib/constants";

export default function AccountantDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authorization - only redirect if user is definitely not an accountant
  useEffect(() => {
    if (!mounted || !user) return;
    
    // Check if user is accountant directly (prioritize role_code over admin flags)
    const isAccountant = user.role_code === ROLE_CODES.ACCOUNTANT;
    
    // Only redirect if user is NOT an accountant
    if (!isAccountant) {
      const dashboardRoute = getDashboardRoute(user);
      // Only redirect if we're actually on the accountant dashboard route
      if (typeof window !== 'undefined' && window.location.pathname === '/dashboard/accountant') {
        router.replace(dashboardRoute);
      }
    }
  }, [mounted, user]); // Removed router from dependencies to prevent re-runs

  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only check if user is accountant directly
  const isAccountant = user.role_code === ROLE_CODES.ACCOUNTANT;
  if (!isAccountant) {
    // Redirect will be handled by useEffect above
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <AccountantDashboard />;
}
