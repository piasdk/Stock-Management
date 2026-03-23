"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertsSection,
  type DashboardAlert,
} from "@/components/dashboard/alerts-section";
import { MetricCard } from "@/components/dashboard/metric-card";
import { QuickLinksSection } from "@/components/dashboard/quick-links-section";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { api } from "@/lib/api";

type IconProps = React.SVGAttributes<SVGSVGElement>;

const TrendingUpIcon = ({ className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

type MetricPayload = {
  current: number;
  previous: number | null;
};

type DashboardResponse = {
  metrics: {
    revenue: MetricPayload;
    activeOrders: MetricPayload;
    inventoryValue: MetricPayload;
    pendingInvoices: MetricPayload;
  };
  currency?: string;
  alerts: Array<{
    product: string;
    branch: string | null;
    quantity: number;
    reorder_level: number;
    minimum_stock_level: number;
    severity: "error" | "warning" | "info";
  }>;
  activity: Array<{
    action_type: string;
    entity_type: string;
    description: string | null;
    created_at: string;
  }>;
};

export function DashboardOverview() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<DashboardResponse>("/dashboard/overview");

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    setData(response.data ?? null);
    setLoading(false);
  };

  const metrics = useMemo(() => deriveMetrics(data), [data]);
  const alerts = useMemo<DashboardAlert[]>(() => mapAlerts(data), [data]);
  const activities = data?.activity ?? [];
  const isBranchAdmin = user?.is_branch_admin && user?.branch_id;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-8">
        <ErrorMessage error={error} />
        <button
          type="button"
          onClick={fetchOverview}
          className="text-sm font-medium text-primary hover:underline"
        >
          Retry fetching dashboard data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-2 text-foreground/60">
          {isBranchAdmin
            ? "Welcome back. Here's your branch overview."
            : "Welcome back. Here's your business overview."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AlertsSection alerts={alerts} />
        </div>
        <div>
          <QuickLinksSection />
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 30 days summary</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, idx) => (
                <div
                  key={`${activity.action_type}-${activity.created_at}-${idx}`}
                  className="flex items-center justify-between border-b border-border py-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {getActivityIcon(activity.action_type)}
                    </span>
                    <span className="text-sm text-foreground">
                      {activity.description ||
                        `${formatLabel(activity.action_type)} ${formatLabel(activity.entity_type)}`}
                    </span>
                  </div>
                  <span className="text-xs text-foreground/50">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-card-foreground/5 p-6 text-center text-sm text-foreground/60">
              No activity has been recorded yet for this workspace.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function deriveMetrics(data: DashboardResponse | null) {
  if (!data) {
    return [];
  }

  const {
    metrics: { revenue, activeOrders, inventoryValue, pendingInvoices },
  } = data;
  const displayCurrency = data.currency ?? "USD";

  const configs = [
    {
      title: "Total Revenue",
      value: formatCurrency(revenue.current, displayCurrency),
      trend: formatChange(revenue.current, revenue.previous),
    },
    {
      title: "Active Orders",
      value: formatNumber(activeOrders.current),
      trend: formatChange(activeOrders.current, activeOrders.previous),
    },
    {
      title: "Inventory Value",
      value: formatCurrency(inventoryValue.current, displayCurrency),
      trend: formatChange(inventoryValue.current, inventoryValue.previous),
    },
    {
      title: "Pending Invoices",
      value: formatCurrency(pendingInvoices.current, displayCurrency),
      trend: formatChange(
        pendingInvoices.current,
        pendingInvoices.previous,
        false,
      ),
    },
  ];

  return configs.map((config) => ({
    title: config.title,
    value: config.value,
    change: config.trend.label,
    isPositive: config.trend.isPositive,
    icon: TrendingUpIcon,
  }));
}

function mapAlerts(data: DashboardResponse | null): DashboardAlert[] {
  if (!data) return [];

  return data.alerts.map((alert) => ({
    id: `${alert.product}-${alert.branch ?? "global"}`,
    title: alert.product,
    description: buildAlertDescription(alert),
    severity: alert.severity,
    timestamp: alert.branch ? `Branch: ${alert.branch}` : undefined,
  }));
}

function buildAlertDescription(alert: DashboardResponse["alerts"][number]) {
  if (alert.minimum_stock_level) {
    return `Qty ${alert.quantity} / Min ${alert.minimum_stock_level}`;
  }
  if (alert.reorder_level) {
    return `Qty ${alert.quantity} / Reorder ${alert.reorder_level}`;
  }
  return `Qty ${alert.quantity}`;
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatChange(
  current: number,
  previous: number | null,
  positiveWhenIncrease = true,
) {
  if (previous === null) {
    return {
      label: "",
      isPositive: true,
    };
  }

  if (previous === 0) {
    return {
      label: current === 0 ? "0%" : "+100%",
      isPositive: current >= 0,
    };
  }

  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
  const trendIsUp = delta >= 0;
  const isPositive = positiveWhenIncrease ? trendIsUp : !trendIsUp;

  return {
    label: rounded,
    isPositive,
  };
}

function getActivityIcon(actionType: string) {
  switch (actionType) {
    case "purchase":
    case "purchase_order":
      return "📋";
    case "sale":
    case "sales_order":
      return "🛒";
    case "inventory":
    case "adjustment":
      return "📦";
    case "login":
    case "logout":
      return "👤";
    default:
      return "📌";
  }
}

function formatLabel(value: string | null) {
  if (!value) return "";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });

  if (Math.abs(diffMinutes) < 1) {
    return "just now";
  }

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

