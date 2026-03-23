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
  Mail, 
  Building2, 
  Shield, 
  CheckCircle2, 
  Clock, 
  Activity,
  Award,
  Settings
} from "lucide-react";

type ActivityLog = {
  action_type: string;
  entity_type: string;
  description: string | null;
  created_at: string;
};

const chipClasses =
  "rounded-full px-4 py-1.5 text-xs font-bold tracking-wide bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md border-2 border-primary-400";

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const profileFetchedRef = useRef(false);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

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
          console.warn("Unable to refresh profile:", response.error);
        }
      } catch (error) {
        if (isMounted) {
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
            <UserIcon className="h-8 w-8 text-primary-600" />
          </div>
          <p className="text-lg font-semibold text-foreground">Sign in to view your profile</p>
        </div>
      </div>
    );
  }

  const loginTime = user.last_login || user.last_login_at;

  return (
    <div className="space-y-4 sm:space-y-6 bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-3xl font-bold uppercase text-amber-700">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-emerald-600 font-bold bg-white px-2 py-0.5 rounded-full shadow-sm border border-emerald-300">
                Active
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground font-bold">User Profile</p>
                <h1 className="text-3xl font-semibold text-foreground">
                  {user.first_name} {user.last_name}
                </h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide bg-primary/10 text-primary border border-primary/20">
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
          <Card className="rounded-2xl border border-border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Workspace Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company ID</span>
                <Badge variant="outline" className="border-border text-foreground">
                  {user.company_id ?? "—"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Branch ID</span>
                <span className="text-foreground font-semibold">{user.branch_id ?? "—"}</span>
              </div>
              {loginTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Login</span>
                  <span className="text-foreground">{new Date(loginTime).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Access & Permissions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/60 p-4">
                <span className="text-foreground">Operations Console</span>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/60 p-4">
                <span className="text-foreground">Catalog & Inventory</span>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/60 p-4">
                <span className="text-foreground">Compliance Suite</span>
                <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-700">
                  Pending
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex items-center justify-center py-6">
                <LoadingSpinner size="sm" />
              </div>
            ) : activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((item, idx) => (
                  <div key={`${item.action_type}-${item.created_at}-${idx}`} className="border border-border rounded-xl p-4 bg-muted/40 hover:bg-muted/60 transition">
                    <p className="font-semibold text-foreground">{item.description ?? `${formatLabel(item.action_type)} ${formatLabel(item.entity_type)}`}</p>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{formatRelativeTime(item.created_at)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.entity_type ? `${formatLabel(item.entity_type)} · ${new Date(item.created_at).toLocaleString()}` : new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                {activityError ?? "No recent activity recorded for this workspace yet."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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

