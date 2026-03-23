"use client";

import React, { useEffect, useMemo, useState } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SettingsIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.42-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.42-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.42-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2" />
    <path d="M7 8v12" />
    <path d="M12 8v12" />
    <path d="M17 8v12" />
    <path d="M7 8h10" />
  </svg>
);

const KeyIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx={7.5} cy={15.5} r={5.5} />
    <path d="m21 2-1 1" />
    <path d="m3 11 1-1" />
    <path d="m3 11 1 1" />
    <path d="m21 2-1-1" />
    <path d="m21 2-1-1" />
    <path d="m21 2-1 1" />
    <path d="m3 11 1-1" />
  </svg>
);

const FileTextIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1={16} y1={13} x2={8} y2={13} />
    <line x1={16} y1={17} x2={8} y2={17} />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const DatabaseIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <ellipse cx={12} cy={5} rx={9} ry={3} />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

interface Setting {
  setting_id: number;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Metric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ComponentType<React.SVGAttributes<SVGSVGElement>>;
}

const formatValue = (value: string | null, type: string) => {
  if (value == null) return "Not set";
  if (type === "boolean") return value === "true" || value === "1" ? "Yes" : "No";
  if (type === "number") return value;
  if (type === "json") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return value;
};

export function Settings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/settings");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch settings");
        }
        if (isMounted) {
          setSettings((Array.isArray(data) ? data : []) as Setting[]);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unexpected error loading settings",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const settingsTotals = useMemo(() => {
    const total = settings.length;
    const byType = new Map<string, number>();
    const withValues = settings.filter((s) => s.setting_value != null && s.setting_value !== "").length;
    
    settings.forEach((setting) => {
      const type = setting.setting_type || "unknown";
      byType.set(type, (byType.get(type) || 0) + 1);
    });

    return {
      total,
      byType: Array.from(byType.entries()).length,
      withValues,
      withoutValues: total - withValues,
    };
  }, [settings]);

  const metrics: Metric[] = useMemo(() => {
    return [
      {
        title: "Total Settings",
        value: settingsTotals.total.toString(),
        change: `${settingsTotals.byType} types`,
        isPositive: settingsTotals.total > 0,
        icon: SettingsIcon,
      },
      {
        title: "Configured",
        value: settingsTotals.withValues.toString(),
        change: `${settingsTotals.total ? Math.round((settingsTotals.withValues / settingsTotals.total) * 100) : 0}% of total`,
        isPositive: settingsTotals.withValues > 0,
        icon: KeyIcon,
      },
      {
        title: "Unconfigured",
        value: settingsTotals.withoutValues.toString(),
        change: `${settingsTotals.total ? Math.round((settingsTotals.withoutValues / settingsTotals.total) * 100) : 0}% of total`,
        isPositive: settingsTotals.withoutValues === 0,
        icon: FileTextIcon,
      },
      {
        title: "Setting Types",
        value: settingsTotals.byType.toString(),
        change: "Different data types",
        isPositive: settingsTotals.byType > 0,
        icon: DatabaseIcon,
      },
    ];
  }, [settingsTotals]);

  const typeSummary = useMemo(() => {
    const byType = new Map<string, number>();
    settings.forEach((setting) => {
      const type = setting.setting_type || "unknown";
      byType.set(type, (byType.get(type) || 0) + 1);
    });
    return Array.from(byType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [settings]);

  const groupedSettings = useMemo(() => {
    const grouped = new Map<string, Setting[]>();
    settings.forEach((setting) => {
      const key = setting.setting_key.split(".")[0] || "general";
      const existing = grouped.get(key) || [];
      existing.push(setting);
      grouped.set(key, existing);
    });
    return Array.from(grouped.entries())
      .map(([group, items]) => ({ group, items }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }, [settings]);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-foreground/60">
          Manage company settings and configuration.
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load settings</CardTitle>
            <CardDescription className="text-destructive">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Settings by Type</CardTitle>
            <CardDescription>
              Settings grouped by data type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {typeSummary.map((entry) => (
              <div
                key={entry.type}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {entry.type}
                  </p>
                </div>
                <Badge variant="outline">{entry.count}</Badge>
              </div>
            ))}
            {!typeSummary.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No settings recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {groupedSettings.map(({ group, items }) => (
          <Card key={group} className="border-border bg-card">
            <CardHeader>
              <CardTitle className="capitalize">{group}</CardTitle>
              <CardDescription>
                {items.length} setting{items.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((setting) => (
                <div
                  key={setting.setting_id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {setting.setting_key}
                      </p>
                      {setting.description ? (
                        <p className="text-xs text-foreground/60 mt-1">
                          {setting.description}
                        </p>
                      ) : null}
                      <div className="mt-2">
                        <p className="text-xs text-foreground/80 font-mono bg-muted p-2 rounded">
                          {formatValue(setting.setting_value, setting.setting_type)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {setting.setting_type}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-foreground/60">
                    <span>
                      {setting.updated_at
                        ? `Updated: ${new Date(setting.updated_at).toLocaleDateString()}`
                        : setting.created_at
                        ? `Created: ${new Date(setting.created_at).toLocaleDateString()}`
                        : ""}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {!groupedSettings.length && !isLoading ? (
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-foreground/50">No settings to display.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

