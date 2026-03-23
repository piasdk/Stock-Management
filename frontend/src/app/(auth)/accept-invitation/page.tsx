"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Mail, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

type InvitationData = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: number | null;
  role_name?: string | null;
  role_code?: string | null;
  company_id: number;
  branch_id: number | null;
};

function AcceptInvitationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, loading, error: authError, clearError } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [localError, setLocalError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Ensure we're on the client before accessing search params
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    try {
      // Try to get token from searchParams first
      let tokenParam: string | null = null;
      if (searchParams) {
        tokenParam = searchParams.get("token");
      }
      
      // Fallback: get from window.location
      if (!tokenParam && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        tokenParam = urlParams.get("token");
      }
      
      if (tokenParam) {
        setToken(tokenParam);
        validateInvitation(tokenParam);
      } else {
        setValidationError("No invitation token provided");
        setValidating(false);
      }
    } catch (error) {
      console.error("Error getting token from URL:", error);
      setValidationError("Error reading invitation token");
      setValidating(false);
    }
  }, [mounted]); // Removed searchParams from dependencies to avoid re-renders

  const validateInvitation = async (invitationToken: string) => {
    setValidating(true);
    setValidationError(null);

    try {
      const response = await api.get<{
        valid: boolean;
        invitation: InvitationData;
      }>(`/invitations/validate/${invitationToken}`);

      if (response.error) {
        setValidationError(response.error || "Invalid invitation");
        setValidating(false);
        return;
      }

      if (response.data?.valid && response.data.invitation) {
        setInvitationData(response.data.invitation);
        const inv = response.data.invitation;
        setFormData((prev) => ({
          ...prev,
          email: inv.email,
          fullName: inv.first_name && inv.last_name 
            ? `${inv.first_name} ${inv.last_name}`.trim()
            : inv.first_name || inv.last_name || "",
        }));
        setValidating(false);
      } else {
        setValidationError("Invalid invitation");
        setValidating(false);
      }
    } catch (error) {
      console.error("Error validating invitation:", error);
      setValidationError("Failed to validate invitation");
      setValidating(false);
    }
  };

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

    if (!formData.fullName || !formData.email || !formData.password) {
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

    if (!token) {
      setLocalError("Invalid invitation token");
      return;
    }

    // Split full name into first and last name
    const nameParts = formData.fullName.trim().split(/\s+/);
    const first_name = nameParts[0] || "";
    const last_name = nameParts.slice(1).join(" ") || "";

    const success = await signup({
      first_name,
      last_name,
      email: formData.email,
      password: formData.password,
      invitation_token: token,
    });

    if (success) {
      router.push(ROUTES.DASHBOARD);
      return;
    }

    if (!authError) {
      setLocalError("Signup failed. Please try again.");
    }
  };

  const displayError = localError || authError || validationError;

  if (validating) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(235,245,255,1))] text-slate-900 px-4 py-10 flex items-center justify-center">
        <Card className="w-full max-w-md border-primary/10 bg-white shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-slate-600">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationError && !invitationData) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(235,245,255,1))] text-slate-900 px-4 py-10 flex items-center justify-center">
        <Card className="w-full max-w-md border-primary/10 bg-white shadow-2xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-semibold text-slate-900">Invalid Invitation</CardTitle>
            <CardDescription className="text-slate-500">
              {validationError}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <span className="text-destructive">{validationError}</span>
            </div>
            <Button
              onClick={() => router.push(ROUTES.LOGIN)}
              className="w-full mt-4"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = formatInvitedRoleLabel(invitationData);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(235,245,255,1))] text-slate-900 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="space-y-8 mb-8">
          <div className="space-y-4 text-center">
            <Badge className="bg-primary/10 border border-primary/20 text-xs tracking-[0.3em] uppercase text-primary">
              Accept Invitation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-slate-900">
              You&apos;ve been invited!
            </h1>
            <p className="text-base text-slate-600 max-w-xl mx-auto">
              Complete your account setup to join the workspace as{" "}
              <span className="font-semibold">{roleLabel}</span>.
            </p>
          </div>
        </div>

        <Card className="w-full border-primary/10 bg-white shadow-2xl">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-3xl font-semibold text-slate-900">Create Account</CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              Set up your account to accept the invitation.
            </CardDescription>
            {invitationData && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Email:</span> {invitationData.email}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  <span className="font-semibold">Role:</span> {roleLabel}
                </p>
                {invitationData.role_id && (
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Role ID:</span> {invitationData.role_id}
                  </p>
                )}
                {invitationData.first_name || invitationData.last_name ? (
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">Pre-filled Name:</span>{" "}
                    {[invitationData.first_name, invitationData.last_name].filter(Boolean).join(" ")}
                  </p>
                ) : null}
              </div>
            )}
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
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="name"
                  required
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
                  disabled={loading || !!invitationData}
                  autoComplete="email"
                  required
                />
                {invitationData && (
                  <p className="text-xs text-slate-500">
                    This email is pre-filled from your invitation.
                  </p>
                )}
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
                    required
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
                    required
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
                  "Accept Invitation & Create Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(235,245,255,1))] text-slate-900 px-4 py-10 flex items-center justify-center">
          <Card className="w-full max-w-md border-primary/10 bg-white shadow-2xl">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-slate-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AcceptInvitationPageContent />
    </Suspense>
  );
}

function formatInvitedRoleLabel(invitationData: InvitationData | null) {
  if (!invitationData) {
    return "your workspace role";
  }
  if (invitationData.role_name) {
    return invitationData.role_name;
  }
  if (invitationData.role_code) {
    return toTitleCase(invitationData.role_code.replace(/_/g, " "));
  }
  return "your workspace role";
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
