"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { getDashboardRoute } from "@/lib/dashboard-routes";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function LoginForm() {
  const router = useRouter();
  const { login, loading, error: authError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [localError, setLocalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError("");
    if (authError) {
      clearError();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!formData.email || !formData.password) {
      setLocalError("Please enter your email and password");
      return;
    }

    const success = await login(formData);

    if (success) {
      // Get user from store (should be set by login function immediately)
      const currentUser = useAuthStore.getState().user;
      const dashboardRoute = getDashboardRoute(currentUser);
      router.push(dashboardRoute);
      return;
    }

    if (!authError) {
      setLocalError("Invalid email or password. Please try again.");
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(230,240,255,1))] text-slate-900 px-4 py-10">
      <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <Badge className="bg-primary/10 border border-primary/20 text-xs tracking-[0.3em] uppercase text-primary">
              Stock Platform
            </Badge>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-slate-900">
              Command your operations dashboard with enterprise-grade visibility.
            </h1>
            <p className="text-base text-slate-600 max-w-xl">
              Monitor catalog uptime, supplier performance, inventory health, and compliance signals from a single
              multi-tenant console designed for modern ops teams.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Real-time Inventory", metric: "97%", detail: "Locations streaming data" },
              { title: "Supplier Reliability", metric: "12h", detail: "Average response SLA" },
              { title: "Customers Active", metric: "1.4K", detail: "Engagement last 24h" },
              { title: "Compliance Alerts", metric: "0", detail: "Open critical items" },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-primary/20 bg-white px-4 py-5 shadow-lg"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-primary">{card.title}</p>
                <p className="text-3xl font-semibold mt-2 text-slate-900">{card.metric}</p>
                <p className="text-sm text-slate-600">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="w-full border-primary/10 bg-white shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-semibold text-slate-900">Sign in</CardTitle>
            <CardDescription className="text-slate-500">
              Enter your operator credentials to access the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {displayError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-destructive">{displayError}</span>
              </div>
            )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="team@stock.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href={ROUTES.FORGOT_PASSWORD} className="text-sm text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm text-slate-600">
              Don't have an account?{" "}
              <Link href={ROUTES.SIGNUP} className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}






