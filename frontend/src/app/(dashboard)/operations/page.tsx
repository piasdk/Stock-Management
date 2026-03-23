"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /operations route - Redirects to dashboard
 * This route redirects all users to /dashboard which then routes them
 * to their role-specific dashboard
 */
export default function OperationsDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect immediately on client side
    if (typeof window !== "undefined") {
      router.replace("/dashboard");
    }
  }, [router]);

  // Return minimal valid component
  return <div />;
}
