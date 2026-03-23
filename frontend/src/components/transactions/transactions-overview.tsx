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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { api } from "@/lib/api";

type IconProps = React.SVGAttributes<SVGSVGElement>;

const ClipboardIcon = ({ className, ...props }: IconProps) => (
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
    <rect width={8} height={4} x={8} y={2} rx={1} />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);

const ShoppingBagIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M6 2v6" />
    <path d="M18 2v6" />
    <path d="M3 8h18l-1.5 12a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z" />
    <path d="M3 8h18" />
    <path d="M7 13v4" />
    <path d="M17 13v4" />
  </svg>
);

const FactoryIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M3 21V9l7 5V9l7 5V3l4 3v15" />
    <path d="M13 14v7" />
    <path d="M9 17v4" />
    <path d="M17 17v4" />
  </svg>
);

const DollarIcon = ({ className, ...props }: IconProps) => (
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
    <line x1={12} y1={1} x2={12} y2={23} />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

type MetricPayload = {
  current: number;
  previous: number | null;
};

type TransactionsOverviewResponse = {
  metrics: {
    openPurchaseOrders: MetricPayload;
    openSalesOrders: MetricPayload;
    activeBatches: MetricPayload;
    pendingApprovals: MetricPayload;
  };
  pipeline: {
    purchasing: { submitted: number; approved: number; received: number };
    sales: { draft: number; allocated: number; shipped: number };
    manufacturing: { planned: number; in_progress: number; completed: number };
  };
  financialSnapshot: {
    monthlySpend: number;
    salesRevenue: number;
    outstandingInvoices: number;
    billsDue7Days: number;
  };
  recentActivity: {
    description: string;
    created_at: string;
  }[];
  approvals: {
    title: string;
    type: string;
    owner: string;
    age: string;
    severity: "High" | "Medium" | "Low";
  }[];
};

export function TransactionsOverview() {
  const [data, setData] = useState<TransactionsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);

    const response = await api.get<TransactionsOverviewResponse>(
      "/transactions/overview",
    );

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return;
    }

    setData(response.data ?? null);
    setLoading(false);
  };

  const metrics = useMemo(
    () => deriveMetrics(data),
    [data],
  );
  const pipeline = data?.pipeline;
  const recentActivity = data?.recentActivity ?? [];
  const approvals = data?.approvals ?? [];
  const financialSnapshot = useMemo(
    () => deriveFinancialSnapshot(data),
    [data],
  );

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
          Retry fetching transactions data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
        <p className="mt-2 text-foreground/60">
          Manage purchasing, sales, and manufacturing flows from a single view.
        </p>
      </div>

      {metrics.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Process Pipelines</CardTitle>
          <CardDescription>
            Track orders across each transaction stage.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {pipeline && (
            <>
              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Purchasing
                </h3>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      label: "Submitted",
                      count: pipeline.purchasing.submitted,
                    },
                    {
                      label: "Approved",
                      count: pipeline.purchasing.approved,
                    },
                    { label: "Received", count: pipeline.purchasing.received },
                  ].map((stage) => (
                    <div
                      key={stage.label}
                      className="flex items-center justify-between rounded-md bg-card-foreground/5 px-3 py-2"
                    >
                      <span className="text-xs font-medium text-foreground">
                        {stage.label}
                      </span>
                      <Badge variant="outline">{stage.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Sales
                </h3>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Draft", count: pipeline.sales.draft },
                    { label: "Allocated", count: pipeline.sales.allocated },
                    { label: "Shipped", count: pipeline.sales.shipped },
                  ].map((stage) => (
                    <div
                      key={stage.label}
                      className="flex items-center justify-between rounded-md bg-card-foreground/5 px-3 py-2"
                    >
                      <span className="text-xs font-medium text-foreground">
                        {stage.label}
                      </span>
                      <Badge variant="outline">{stage.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Manufacturing
                </h3>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      label: "Planned",
                      count: pipeline.manufacturing.planned,
                    },
                    {
                      label: "In Progress",
                      count: pipeline.manufacturing.in_progress,
                    },
                    {
                      label: "Completed",
                      count: pipeline.manufacturing.completed,
                    },
                  ].map((stage) => (
                    <div
                      key={stage.label}
                      className="flex items-center justify-between rounded-md bg-card-foreground/5 px-3 py-2"
                    >
                      <span className="text-xs font-medium text-foreground">
                        {stage.label}
                      </span>
                      <Badge variant="outline">{stage.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              A unified stream of purchasing, sales, and production updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div
                  key={`${item.description}-${item.created_at}`}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <span className="text-sm text-foreground">
                    {item.description}
                  </span>
                  <span className="text-xs text-foreground/50">
                    {formatRelativeTime(item.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-border/60 bg-card-foreground/5 p-6 text-center text-sm text-foreground/60">
                No recent purchasing or sales activity yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Approvals & Exceptions</CardTitle>
            <CardDescription>
              Prioritize items waiting for managerial action.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvals.length > 0 ? (
              approvals.map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <Badge
                      variant={
                        item.severity === "High"
                          ? "destructive"
                          : item.severity === "Medium"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {item.severity}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-foreground/60">
                    <span>{item.type}</span>
                    <span>Owner: {item.owner}</span>
                    <span>{item.age} old</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-border/60 bg-card-foreground/5 p-6 text-center text-sm text-foreground/60">
                No approvals are pending right now.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Jump directly into common transaction workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                label: "Purchase Order Intake",
                description: "Start supplier orders",
              },
              {
                label: "Receive Goods",
                description: "Post goods receipts",
              },
              {
                label: "Issue Sales Order",
                description: "Convert quotes to orders",
              },
              {
                label: "Returns Management",
                description: "Process customer returns",
              },
            ].map((link) => (
              <div
                key={link.label}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {link.label}
                  </p>
                  <p className="text-xs text-foreground/50 mt-1">
                    {link.description}
                  </p>
                </div>
                <Button variant="ghost" size="icon">
                  <span aria-hidden className="text-lg">
                    →
                  </span>
                  <span className="sr-only">Open {link.label}</span>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Financial Snapshot</CardTitle>
            <CardDescription>
              Compare spend, revenue, and payables at a glance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {financialSnapshot.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border px-4 py-3"
              >
                <p className="text-xs text-foreground/60">{item.label}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {item.value}
                  </span>
                  <Badge
                    variant={item.trend.startsWith("+") ? "secondary" : "outline"}
                  >
                    {item.trend}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function deriveMetrics(data: TransactionsOverviewResponse | null) {
  if (!data) return [];

  const { metrics } = data;

  return [
    {
      title: "Open Purchase Orders",
      value: formatNumber(metrics.openPurchaseOrders.current),
      icon: ClipboardIcon,
    },
    {
      title: "Open Sales Orders",
      value: formatNumber(metrics.openSalesOrders.current),
      icon: ShoppingBagIcon,
    },
    {
      title: "Active Batches",
      value: formatNumber(metrics.activeBatches.current),
      icon: FactoryIcon,
    },
    {
      title: "Pending Approvals",
      value: formatNumber(metrics.pendingApprovals.current),
      icon: DollarIcon,
    },
  ];
}

function deriveFinancialSnapshot(
  data: TransactionsOverviewResponse | null,
): { label: string; value: string; trend: string }[] {
  if (!data) return [];

  const f = data.financialSnapshot;

  return [
    {
      label: "Monthly Spend",
      value: formatCurrency(f.monthlySpend),
      trend: "",
    },
    {
      label: "Sales Revenue",
      value: formatCurrency(f.salesRevenue),
      trend: "",
    },
    {
      label: "Outstanding Invoices",
      value: formatCurrency(f.outstandingInvoices),
      trend: "",
    },
    {
      label: "Bills Due (7 days)",
      value: formatCurrency(f.billsDue7Days),
      trend: "",
    },
  ];
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
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

