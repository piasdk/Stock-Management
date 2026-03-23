"use client";

import { api } from "@/lib/api";
import { type User } from "@/lib/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { 
  User as UserIcon,
  Edit,
  Save,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ActivityLog = {
  action_type: string;
  entity_type: string;
  description: string | null;
  created_at: string;
};

function formatLabel(value?: string | null) {
  if (!value) return "Activity";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRelativeTime(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function Profile() {
  const { user, updateUser } = useAuthStore();
  const profileFetchedRef = useRef(false);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });

  useEffect(() => {
    if (!user?.user_id) {
      profileFetchedRef.current = false;
      return;
    }

    if (profileFetchedRef.current) {
      return;
    }

    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const response = await api.get<User>("/auth/me");
        if (!isMounted) return;
        if (response.data) {
          updateUser(response.data);
        } else if (response.error) {
          // Handle 500 errors gracefully - don't spam console
          if (response.details?.status === 500) {
            // Silently fail for backend errors
            return;
          }
          console.warn("Unable to refresh profile:", response.error);
        }
      } catch (error) {
        if (isMounted) {
          // Only log non-500 errors
          console.error("Unexpected error fetching profile:", error);
        }
      } finally {
        if (isMounted) {
          profileFetchedRef.current = true;
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [updateUser, user?.user_id]);

  useEffect(() => {
    if (!user?.company_id) {
      setActivity([]);
      return;
    }

    let isMounted = true;

    const fetchActivity = async () => {
      setActivityLoading(true);
      setActivityError(null);
      const response = await api.get<{ activity: ActivityLog[] }>("/dashboard/overview");

      if (!isMounted) {
        return;
      }

      // Handle 500 errors gracefully
      if (response.error && response.details?.status === 500) {
        setActivity([]);
        setActivityLoading(false);
        return;
      }

      if (response.error) {
        setActivityError(response.error);
        setActivity([]);
        setActivityLoading(false);
        return;
      }

      setActivity(response.data?.activity ?? []);
      setActivityLoading(false);
    };

    fetchActivity();

    return () => {
      isMounted = false;
    };
  }, [user?.company_id]);

  const roleLabel = useMemo(() => {
    if (!user) return "User";
    if (user.role_name) return user.role_name;
    if (user.role_code) {
      return user.role_code
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    // Company Admin (one company) before Super Admin (platform-wide) so company creators show as Company Admin
    if (user.is_company_admin && user.company_id) return "Company Admin";
    if (user.is_super_admin) return "Super Admin";
    if (user.is_branch_admin) return "Branch Admin";
    return "User";
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <UserIcon className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">Sign in to view your profile</p>
        </div>
      </div>
    );
  }

  const loginTime = user.last_login || user.last_login_at;

  // Sync form data when displayed user fields change (use primitives so Profile section doesn't tick on every user reference change)
  useEffect(() => {
    if (user && !isEditing) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || ''
      });
    }
  }, [user?.first_name, user?.last_name, user?.email, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || ''
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || ''
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Update user profile via API
      const response = await api.put(`/auth/users/${user.user_id}`, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email
      });

      if (response.error) {
        alert(`Failed to update profile: ${response.error}`);
        return;
      }

      // Update local user state
      if (response.data) {
        updateUser(response.data);
      }

      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile. Please try again.');
      console.error('Error updating profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-3xl font-bold uppercase text-amber-700">
                {formData.first_name?.[0] || user.first_name?.[0]}
                {formData.last_name?.[0] || user.last_name?.[0]}
              </div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-emerald-600 font-bold bg-white px-2 py-0.5 rounded-full shadow-sm border border-emerald-300">
                Active
              </span>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.4em] text-gray-500 font-bold">User Profile</p>
                  {isEditing ? (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="max-w-md"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="max-w-md"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="max-w-md"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="inline-flex items-center gap-2"
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-3xl font-semibold text-gray-900">
                        {user.first_name} {user.last_name}
                      </h1>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <Button
                    onClick={handleEdit}
                    variant="outline"
                    className="inline-flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide bg-blue-100 text-blue-700 border border-blue-200">
                  Role: {roleLabel}
                </span>
                <span className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Status: {user.status || "active"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Workspace Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Company ID</span>
                <Badge variant="outline" className="border-gray-300 text-gray-900">
                  {user.company_id ?? "—"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Branch ID</span>
                <span className="text-gray-900 font-semibold">{user.branch_id ?? "—"}</span>
              </div>
              {loginTime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Login</span>
                  <span className="text-gray-900">{new Date(loginTime).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Access & Permissions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                <span className="text-gray-900">Operations Console</span>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                <span className="text-gray-900">Catalog & Inventory</span>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                <span className="text-gray-900">Compliance Suite</span>
                <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-700">
                  Pending
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex items-center justify-center py-6">
                <LoadingSpinner size="sm" />
              </div>
            ) : activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((item, idx) => (
                  <div key={`${item.action_type}-${item.created_at}-${idx}`} className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition">
                    <p className="font-semibold text-gray-900">{item.description ?? `${formatLabel(item.action_type)} ${formatLabel(item.entity_type)}`}</p>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">{formatRelativeTime(item.created_at)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.entity_type ? `${formatLabel(item.entity_type)} · ${new Date(item.created_at).toLocaleString()}` : new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                {activityError ?? "No recent activity recorded for this workspace yet."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

