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
  branch_id: number | null;
  branch_name: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  invited_by_first_name: string | null;
  invited_by_last_name: string | null;
  invited_by: number;
};

type Role = {
  role_id: number;
  name: string;
  role_code: string;
  is_active: number;
  description: string | null;
};

export default function BranchInvitationsPage() {
  const { user } = useAuthStore();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [inviteLinkToCopy, setInviteLinkToCopy] = useState<string>("");

  const isBranchAdmin = user?.is_branch_admin && user?.branch_id;

  useEffect(() => {
    if (isBranchAdmin) {
      loadInvitations();
      loadRoles();
    } else {
      setError("Only branch administrators can send invitations");
      setLoading(false);
    }
  }, [isBranchAdmin]);

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

  const loadRoles = async () => {
    const response = await api.get<Role[]>("/roles");

    if (!response.error && response.data) {
      setRoles(response.data);
    }
  };

  const loadInvitations = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<Invitation[]>("/invitations");

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    // Filter invitations for this branch only
    const branchInvitations = (response.data || []).filter(
      (inv) =>
        inv.branch_id === user?.branch_id &&
        inv.invited_by === user?.user_id
    );
    setInvitations(branchInvitations);
    setLoading(false);
  };

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
      branch_id: user?.branch_id || null,
      role_id: formData.role_id ? parseInt(formData.role_id, 10) : null,
    };

    const response = await api.post<Invitation & { email_sent?: boolean; email_error?: string; invitation_token?: string }>("/invitations", payload);

    if (response.error) {
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
          : "Invitation created. Email could not be sent (SMTP not configured)."
      );
      setInviteLinkToCopy(inviteLink);
    } else {
      setFormSuccess("Invitation sent successfully!");
      setInviteLinkToCopy("");
    }
    setFormData({ email: "", first_name: "", last_name: "", role_id: "" });
    setSubmitting(false);
    loadInvitations();
    setTimeout(() => setFormSuccess(null), 5000);
  };

  const handleCancel = async (invitationId: number) => {
    if (!window.confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }

    setError(null);
    setLoading(true);

    const response = await api.post(`/invitations/${invitationId}/cancel`);

    if (response.error) {
      setError(response.error);
    } else {
      setFormSuccess("Invitation cancelled successfully.");
    }
    loadInvitations();
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800">
            <Clock className="mr-1 h-3 w-3" /> Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="!bg-green-50 !text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" /> Accepted
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" /> Expired
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            <X className="mr-1 h-3 w-3" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isBranchAdmin) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-800">
              <XCircle className="h-5 w-5" />
              <p className="font-semibold">Access Denied</p>
            </div>
            <p className="mt-2 text-sm text-red-700">
              Only branch administrators can send invitations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Branch Invitations</h1>
        <p className="mt-2 text-foreground/60">
          Invite staff members to join your branch.
        </p>
      </div>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Send New Invitation</CardTitle>
          <CardDescription>
            Invite new staff members to join your branch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <Label htmlFor="role_id">Role (pre-selected)</Label>
              <select
                id="role_id"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.role_id}
                onChange={(e) =>
                  setFormData({ ...formData, role_id: e.target.value })
                }
                disabled={submitting || roles.length === 0}
              >
                <option value="">
                  {roles.length === 0
                    ? "No roles available"
                    : "Select a role (branches default branch admin)"}
                </option>
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
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground">
                A branch role is chosen automatically but can be overridden.
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
                      onClick={() => navigator.clipboard.writeText(inviteLinkToCopy)}
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
          <CardTitle>Branch Invitations</CardTitle>
          <CardDescription>
            Track the status of invitations sent for your branch.
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
                Send your first invitation using the form above.
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
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(invitation.invitation_id)}
                        disabled={submitting}
                      >
                        <X className="mr-2 h-4 w-4" /> Cancel
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
  );
}

