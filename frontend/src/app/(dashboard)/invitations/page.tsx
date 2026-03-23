"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { useAuthStore } from "@/store/authStore";
import { Mail, X, CheckCircle, Clock, XCircle } from "lucide-react";

type Invitation = {
  invitation_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: number | null;
  branch_id: number | null;
  branch_name: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  invited_by_first_name: string | null;
  invited_by_last_name: string | null;
};

type Branch = {
  branch_id: number;
  name: string;
  code: string;
};

type Role = {
  role_id: number;
  name: string;
  role_code: string;
  description: string | null;
  is_active: number;
};

export default function InvitationsPage() {
  const { user } = useAuthStore();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    branch_id: "",
    role_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [inviteLinkToCopy, setInviteLinkToCopy] = useState<string>("");

  const canManageInvitations = Boolean(
    user?.is_super_admin || user?.is_company_admin
  );

  useEffect(() => {
    if (canManageInvitations) {
      loadInvitations();
      loadBranches();
      loadRoles();
    }
  }, [canManageInvitations]);

  const loadInvitations = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<Invitation[]>("/invitations");

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    setInvitations(response.data ?? []);
    setLoading(false);
  };

  const loadBranches = async () => {
    if (!user?.company_id) return;

    const response = await api.get<Branch[]>(
      `/companies/${user.company_id}/branches`
    );

    if (!response.error && response.data) {
      setBranches(response.data);
    }
  };

  const loadRoles = async () => {
    const response = await api.get<Role[]>("/roles");

    if (!response.error && response.data) {
      setRoles(response.data);
    }
  };

  useEffect(() => {
    const defaultRole = roles.find(
      (role) =>
        role.role_code === "branch_admin" ||
        role.role_code === "branch_manager" ||
        role.role_code === "manager",
    );

    if (defaultRole && !formData.role_id) {
      setFormData((prev) => ({
        ...prev,
        role_id: defaultRole.role_id.toString(),
      }));
    }
  }, [roles, formData.role_id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setInviteLinkToCopy("");

    if (!formData.email) {
      setFormError("Email is required");
      return;
    }

    setSubmitting(true);

    const payload = {
      email: formData.email,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      branch_id: formData.branch_id ? parseInt(formData.branch_id, 10) : null,
      role_id: formData.role_id ? parseInt(formData.role_id, 10) : null,
    };

    console.log("Sending invitation with payload:", payload);
    const response = await api.post<Invitation & { email_sent?: boolean; email_error?: string; invitation_token?: string }>("/invitations", payload);
    console.log("Invitation response:", response);

    if (response.error) {
      console.error("Invitation error:", response.error);
      setFormError(response.error);
      setSubmitting(false);
      return;
    }

    const data = response.data;
    if (data?.email_sent === false) {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const inviteLink = data?.invitation_token ? `${baseUrl}/accept-invitation?token=${data.invitation_token}` : "";
      setFormSuccess(
        inviteLink
          ? "Invitation created. Email could not be sent (SMTP not configured). Share this link with the recipient:"
          : "Invitation created. Email could not be sent (SMTP not configured). Check the invitation list for details."
      );
      setInviteLinkToCopy(inviteLink);
    } else {
      setFormSuccess("Invitation sent successfully!");
      setInviteLinkToCopy("");
    }
    setFormData({ email: "", first_name: "", last_name: "", branch_id: "", role_id: "" });
    setSubmitting(false);
    loadInvitations();
  };

  const handleCancel = async (invitationId: number) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }

    const response = await api.post(`/invitations/${invitationId}/cancel`, {});

    if (response.error) {
      alert(`Failed to cancel invitation: ${response.error}`);
      return;
    }

    loadInvitations();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="!bg-green-50 !text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "expired":
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            {status === "expired" ? "Expired" : "Cancelled"}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInvitationLink = (token: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/accept-invitation?token=${token}`;
  };

  if (!canManageInvitations) {
    return (
      <div className="space-y-8 p-8">
        <Card className="bg-white/90">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Mail className="h-12 w-12 text-primary mb-4" />
            <p className="text-lg font-semibold text-foreground">
              Access Restricted
            </p>
            <p className="text-sm">
              Only administrators can manage invitations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <Badge className="bg-primary/10 text-primary">Team Management</Badge>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Invite Branch Admins
          </h1>
          <p className="text-muted-foreground">
            Send invitations to branch administrators to join your workspace.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Send Invitation</CardTitle>
            <CardDescription>
              Invite a new branch administrator by email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@branch.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={submitting}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name (Optional)</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name (Optional)</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_id">Branch (Optional)</Label>
                <select
                  id="branch_id"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.branch_id}
                  onChange={(e) =>
                    setFormData({ ...formData, branch_id: e.target.value })
                  }
                  disabled={submitting}
                >
                  <option value="">Select a branch (optional)</option>
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role_id">Role (Optional)</Label>
                <select
                  id="role_id"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.role_id}
                  onChange={(e) =>
                    setFormData({ ...formData, role_id: e.target.value })
                  }
                  disabled={submitting}
                >
                  <option value="">Select a role (optional)</option>
                  {roles
                    .filter(
                      (role) =>
                        role.is_active === 1 &&
                        role.role_code !== "super_admin" &&
                        role.role_code !== "company_admin"
                    )
                    .map((role) => (
                      <option key={role.role_id} value={role.role_id}>
                        {role.name}
                        {role.description ? ` - ${role.description}` : ""}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {roles.length === 0
                    ? "No roles available. Create roles in the Roles page first."
                    : "A branch role is pre-selected but can be changed if needed."}
                </p>
              </div>

              <ErrorMessage error={formError} />
              {formSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 space-y-2">
                  <p>{formSuccess}</p>
                  {inviteLinkToCopy && (
                    <div className="flex flex-col gap-1.5">
                      <code className="break-all bg-white/60 px-2 py-1 rounded text-xs">
                        {inviteLinkToCopy}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit border-emerald-300 text-emerald-800"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLinkToCopy);
                        }}
                      >
                        Copy link
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Recent Invitations</CardTitle>
            <CardDescription>
              Track the status of sent invitations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <ErrorMessage error={error} />
            ) : invitations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                <Mail className="h-10 w-10 text-primary" />
                <p className="text-lg font-semibold text-foreground">
                  No invitations yet
                </p>
                <p className="text-sm">
                  Send your first invitation using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.invitation_id}
                    className="rounded-lg border border-border/60 bg-white/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-foreground">
                            {invitation.email}
                          </p>
                          {getStatusBadge(invitation.status)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {invitation.first_name || invitation.last_name ? (
                            <p>
                              Name:{" "}
                              <span className="font-medium text-foreground">
                                {[invitation.first_name, invitation.last_name].filter(Boolean).join(" ") || "Not provided"}
                              </span>
                            </p>
                          ) : null}
                          {invitation.role_id ? (
                            <p>
                              Role:{" "}
                              <span className="font-medium text-foreground">
                                {roles.find((r) => r.role_id === invitation.role_id)?.role_name ||
                                  `Role ID: ${invitation.role_id}`}
                              </span>
                            </p>
                          ) : null}
                          {invitation.branch_name && (
                            <p>
                              Branch:{" "}
                              <span className="font-medium text-foreground">
                                {invitation.branch_name}
                              </span>
                            </p>
                          )}
                          <p>
                            Sent:{" "}
                            {new Date(invitation.created_at).toLocaleDateString()}
                          </p>
                          {invitation.status === "pending" && (
                            <p className="text-xs text-amber-600">
                              Expires:{" "}
                              {new Date(invitation.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {invitation.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(invitation.invitation_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

