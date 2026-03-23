"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function SignupPage() {
  const router = useRouter();
  const { signup, loading, error: authError, clearError } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    companyLegalName: "",
    companyCountry: "",
    companyEmail: "",
    companyPhone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [localError, setLocalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (!formData.fullName || !formData.companyName || !formData.email || !formData.password) {
      setLocalError("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }

    const success = await signup({
      fullName: formData.fullName,
      company: {
        name: formData.companyName,
        legal_name: formData.companyLegalName || undefined,
        country: formData.companyCountry || undefined,
        email: formData.companyEmail || formData.email,
        phone: formData.companyPhone || undefined,
      },
      email: formData.email,
      password: formData.password,
    });

    if (success) {
      router.push(ROUTES.DASHBOARD);
      return;
    }

    // Show backend error if available, otherwise generic message
    if (!authError) {
      setLocalError("Signup failed. Please try again.");
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(235,245,255,1))] text-slate-900 px-4 py-10">
      <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <Badge className="bg-primary/10 border border-primary/20 text-xs tracking-[0.3em] uppercase text-primary">
              Launch Workspace
            </Badge>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-slate-900">
              Create your Stock operations control center in under a minute.
            </h1>
            <p className="text-base text-slate-600 max-w-xl">
              Set up multi-tenant catalogs, permissions, supplier pipelines, and compliance alerts with zero dev effort.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Operators Invited", metric: "32", detail: "Multi-role access slots" },
              { title: "Warehouses Linked", metric: "18", detail: "Realtime visibility" },
              { title: "Compliance Ready", metric: "ISO", detail: "Audit friendly logs" },
              { title: "API Ready", metric: "REST", detail: "Open integration layer" },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-primary/20 bg-white px-4 py-5 shadow-lg">
                <p className="text-xs uppercase tracking-[0.25em] text-primary">{card.title}</p>
                <p className="text-3xl font-semibold mt-2 text-slate-900">{card.metric}</p>
                <p className="text-sm text-slate-600">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="w-full border-primary/10 bg-white shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-semibold text-slate-900">Create Account</CardTitle>
            <CardDescription className="text-slate-500">
              Configure your operator profile and organization context.
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
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Ada Lovelace"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="Acme Logistics"
                value={formData.companyName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyLegalName">Legal / Registered Name</Label>
              <Input
                id="companyLegalName"
                name="companyLegalName"
                placeholder="Acme Logistics LLC"
                value={formData.companyLegalName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyCountry">Country</Label>
                <Input
                  id="companyCountry"
                  name="companyCountry"
                  placeholder="Kenya"
                  value={formData.companyCountry}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Company Phone</Label>
                <Input
                  id="companyPhone"
                  name="companyPhone"
                  placeholder="+254 700 000000"
                  value={formData.companyPhone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                name="companyEmail"
                type="email"
                placeholder="ops@acmelogistics.com"
                value={formData.companyEmail}
                onChange={handleChange}
                disabled={loading}
              />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    autoComplete="new-password"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
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
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="text-center text-sm text-slate-300">
                Already have an account?{" "}
                <Link href={ROUTES.LOGIN} className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
