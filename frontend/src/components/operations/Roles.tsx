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

export function Roles() {
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

  const isBranchAdmin = Boolean(user?.is_branch_admin && user?.branch_id);
  const isManager = user?.role_code === "manager";
  const canManageBranchRoles = isBranchAdmin || isManager;

  useEffect(() => {
    if (canManageBranchRoles) {
      loadRoles();
    } else {
      setError("Only branch administrators or managers can manage roles");
      setLoading(false);
    }
  }, [canManageBranchRoles]);

  const loadRoles = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<Role[]>("/roles");

    if (response.error) {
      // Handle 500 errors gracefully - don't show error for backend issues
      if (response.details?.status === 500) {
        setRoles([]);
        setLoading(false);
        return;
      }
      // Handle 403 errors - user might not have company_id
      if (response.details?.status === 403) {
        setError("Unable to load roles. Please ensure you have a company assigned.");
        setRoles([]);
        setLoading(false);
        return;
      }
      setError(response.error);
      setLoading(false);
      return;
    }

    // Branch roles screen: never show platform/tenant admin roles
    const filteredRoles = (response.data || []).filter(
      (role) => role.role_code !== "super_admin" && role.role_code !== "company_admin"
    );
    
    setRoles(filteredRoles);
    setLoading(false);
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
      if (
        editingRole.is_system_role === 1 ||
        editingRole.role_code === "branch_admin" ||
        editingRole.role_code === "manager"
      ) {
        setFormError("Cannot edit system roles, branch admin role, or manager role");
        setSubmitting(false);
        return;
      }

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
      const response = await api.post<Role>("/roles", {
        name: formData.name,
        role_code: formData.role_code,
        description: formData.description || null,
        is_active: formData.is_active,
        company_id: user?.company_id || null,
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
    if (
      role.is_system_role === 1 ||
      role.role_code === "branch_admin" ||
      role.role_code === "manager"
    ) {
      setError("Cannot edit system roles, branch admin role, or manager role");
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
    const roleToDelete = roles.find(r => r.role_id === roleId);
    
    if (roleToDelete && (roleToDelete.role_code === "branch_admin" || roleToDelete.is_system_role === 1)) {
      setError("Cannot delete branch admin or system roles");
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

  if (!isBranchAdmin) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-800">
              <XCircle className="h-5 w-5" />
              <p className="font-semibold">Access Denied</p>
            </div>
            <p className="mt-2 text-sm text-red-700">
              Only branch administrators can manage roles.
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Roles</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage user roles for your branch
          </p>
        </div>
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
        <Card className="border border-gray-200 bg-white">
          <CardHeader>
            <CardTitle>{editingRole ? "Edit Role" : "Create New Role"}</CardTitle>
            <CardDescription>
              {editingRole
                ? "Update the role details below"
                : "Fill in the details to create a new role for your branch"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Staff, Cashier, Manager"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={submitting}
                  required
                />
                <p className="text-xs text-gray-500">
                  Display name for the role
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role_code">Role Code *</Label>
                <Input
                  id="role_code"
                  type="text"
                  placeholder="e.g., staff, cashier, manager"
                  value={formData.role_code}
                  onChange={(e) =>
                    setFormData({ ...formData, role_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })
                  }
                  disabled={submitting}
                  required
                />
                <p className="text-xs text-gray-500">
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
                  disabled={submitting}
                />
              </div>

              {editingRole && (
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

      <Card className="border border-gray-200 bg-white">
        <CardHeader>
          <CardTitle>Available Roles</CardTitle>
          <CardDescription>
            {roles.length === 0
              ? "No roles found. Create your first role to get started."
              : `Total: ${roles.length} role${roles.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-gray-500">
              <Shield className="h-10 w-10 text-blue-600" />
              <p className="text-lg font-semibold text-gray-900">No roles yet</p>
              <p className="text-sm">
                Create your first role to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.role_id}
                  className="flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-gray-900">{role.name}</p>
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
                      <span className="text-xs text-gray-500">
                        ({role.role_code})
                      </span>
                    </div>
                    {role.description && (
                      <p className="text-sm text-gray-600">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {role.is_system_role === 0 &&
                      role.role_code !== "branch_admin" &&
                      role.role_code !== "manager" && (
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

