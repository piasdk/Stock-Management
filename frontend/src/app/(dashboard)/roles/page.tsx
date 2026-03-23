"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { useAuthStore } from "@/store/authStore";
import { Shield, Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";

type Role = {
  role_id: number;
  company_id: number | null;
  name: string;
  role_code: string;
  description: string | null;
  is_system_role: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export default function RolesPage() {
  const { user } = useAuthStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role_code: "",
    description: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Company admins manage roles within their company
  const isCompanyAdmin = user?.is_company_admin;

  useEffect(() => {
    if (isCompanyAdmin) {
      loadRoles();
    } else {
      setError("Only company administrators can manage roles");
      setLoading(false);
    }
  }, [isCompanyAdmin]);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<Role[]>("/roles");

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    // Backend filters by company_id, so show all returned roles (excluding super_admin)
    setRoles((response.data || []).filter((r) => r.role_code !== "super_admin"));
    setLoading(false);
  };

  const handleSeedRoles = async () => {
    setSeeding(true);
    setError(null);
    setFormError(null);

    const response = await api.post("/roles/seed", {});

    if (response.error) {
      setFormError(response.error);
      setSeeding(false);
      return;
    }

    setFormSuccess("Default roles seeded successfully!");
    setSeeding(false);
    loadRoles();
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.name.trim()) {
      setFormError("Role name is required");
      return;
    }

    if (!formData.role_code.trim()) {
      setFormError("Role code is required");
      return;
    }

    setSubmitting(true);

    if (editingRole) {
      // Update existing role
      const response = await api.put<Role>(`/roles/${editingRole.role_id}`, {
        name: formData.name,
        role_code: formData.role_code,
        description: formData.description || null,
        is_active: formData.is_active,
      });

      if (response.error) {
        setFormError(response.error);
        setSubmitting(false);
        return;
      }

      setFormSuccess("Role updated successfully!");
      setSubmitting(false);
      setShowForm(false);
      setEditingRole(null);
      setFormData({ name: "", role_code: "", description: "", is_active: true });
      loadRoles();
      setTimeout(() => setFormSuccess(null), 3000);
    } else {
      // Create new role
      const response = await api.post<Role>("/roles", {
        name: formData.name,
        role_code: formData.role_code,
        description: formData.description || null,
        is_active: formData.is_active,
      });

      if (response.error) {
        setFormError(response.error);
        setSubmitting(false);
        return;
      }

      setFormSuccess("Role created successfully!");
      setSubmitting(false);
      setShowForm(false);
      setFormData({ name: "", role_code: "", description: "", is_active: true });
      loadRoles();
      setTimeout(() => setFormSuccess(null), 3000);
    }
  };

  const handleEdit = (role: Role) => {
    if (role.is_system_role === 1) {
      setError("System roles cannot be edited.");
      return;
    }
    if (role.company_id !== user?.company_id) {
      setError("You can only edit roles within your company.");
      return;
    }
    setEditingRole(role);
    setFormData({
      name: role.name,
      role_code: role.role_code,
      description: role.description || "",
      is_active: role.is_active === 1,
    });
    setShowForm(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleDelete = async (roleId: number) => {
    const role = roles.find((r) => r.role_id === roleId);
    if (!role) return;
    if (role.is_system_role === 1 || role.company_id !== user?.company_id) {
      setError("You can only delete roles within your company.");
      return;
    }
    if (!confirm("Are you sure you want to delete this role? This action cannot be undone.")) {
      return;
    }

    setError(null);
    const response = await api.delete(`/roles/${roleId}`);

    if (response.error) {
      setError(response.error);
      return;
    }

    loadRoles();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRole(null);
    setFormData({ name: "", role_code: "", description: "", is_active: true });
    setFormError(null);
    setFormSuccess(null);
  };

  if (!isCompanyAdmin) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-800">
              <XCircle className="h-5 w-5" />
              <p className="font-semibold">Access Denied</p>
            </div>
            <p className="mt-2 text-sm text-red-700">
              Only company administrators can manage roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Roles</h1>
          <p className="mt-2 text-foreground/60">
            Manage user roles for your organization
          </p>
        </div>
        <div className="flex gap-3">
          {roles.length === 0 && (
            <Button
              type="button"
              onClick={handleSeedRoles}
              disabled={seeding}
              variant="outline"
            >
              {seeding ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Seeding...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Seed Default Roles
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="text-emerald-500 hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
            onClick={() => {
              setShowForm(true);
              setEditingRole(null);
              setFormData({ name: "", role_code: "", description: "", is_active: true });
              setFormError(null);
              setFormSuccess(null);
            }}
            disabled={showForm}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </div>
      </div>

      {error && <ErrorMessage error={error} />}
      {formSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {formSuccess}
          </div>
        </div>
      )}

      {showForm && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>{editingRole ? "Edit Role" : "Create New Role"}</CardTitle>
            <CardDescription>
              {editingRole
                ? "Update the role details below"
                : "Fill in the details to create a new role"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Branch Admin, Manager"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={submitting || (editingRole?.is_system_role === 1)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Display name for the role
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role_code">Role Code *</Label>
                <Input
                  id="role_code"
                  type="text"
                  placeholder="e.g., branch_admin, manager"
                  value={formData.role_code}
                  onChange={(e) =>
                    setFormData({ ...formData, role_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                  }
                  disabled={submitting || (editingRole?.is_system_role === 1)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Unique code (lowercase with underscores)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Brief description of the role"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={submitting || (editingRole?.is_system_role === 1)}
                />
              </div>

              {editingRole && editingRole.is_system_role === 0 && (
                <div className="space-y-2">
                  <Label htmlFor="is_active">Active</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.checked })
                      }
                      disabled={submitting}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="is_active" className="text-sm font-normal">
                      Role is active and can be assigned
                    </Label>
                  </div>
                </div>
              )}

              {formError && <ErrorMessage error={formError} />}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  variant="ghost"
                  className="text-emerald-500 font-semibold hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {editingRole ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingRole ? (
                        <>
                          <Edit className="mr-2 h-4 w-4" />
                          Update Role
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Role
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-300 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>All Roles</CardTitle>
          <CardDescription>
            {roles.length === 0
              ? "No roles found. Click 'Seed Default Roles' to add default roles."
              : `Total: ${roles.length} role${roles.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <Shield className="h-10 w-10 text-primary" />
              <p className="text-lg font-semibold text-foreground">No roles yet</p>
              <p className="text-sm">
                Create your first role or seed default roles to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.role_id}
                  className="flex items-start justify-between rounded-lg border border-border/60 bg-white/70 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-foreground">{role.name}</p>
                      {role.is_system_role === 1 && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          System
                        </span>
                      )}
                      {role.is_active === 0 && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Inactive
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({role.role_code})
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {role.is_system_role === 0 && role.company_id === user?.company_id && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(role.role_id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
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

