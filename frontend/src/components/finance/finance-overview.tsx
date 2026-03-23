"use client";

import React from "react";

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

type IconProps = React.SVGAttributes<SVGSVGElement>;

const CashIcon = ({ className, ...props }: IconProps) => (
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
    <rect width={20} height={14} x={2} y={5} rx={2} />
    <line x1={2} y1={10} x2={22} y2={10} />
    <line x1={12} y1={5} x2={12} y2={3} />
    <line x1={12} y1={21} x2={12} y2={19} />
  </svg>
);

const LedgerIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h9" />
    <path d="M21 2h-6v20h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 6h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
  </svg>
);

const TaxIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M9 14h6" />
    <path d="M8 18h8" />
    <path d="M10 6 8 8l2 2" />
    <path d="m14 6 2-2-2-2" />
    <path d="m14 10 2 2-2 2" />
    <circle cx={12} cy={6} r={4} />
    <path d="M6 22h12" />
  </svg>
);

const ShieldIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const metrics = [
  {
    title: "Cash Balance",
    value: "$1.42M",
    change: "+3.6%",
    isPositive: true,
    icon: CashIcon,
  },
  {
    title: "Month-to-Date Revenue",
    value: "$642K",
    change: "+8.9%",
    isPositive: true,
    icon: LedgerIcon,
  },
  {
    title: "Outstanding Bills",
    value: "$217K",
    change: "-4.2%",
    isPositive: false,
    icon: ShieldIcon,
  },
  {
    title: "Tax Filings Due",
    value: "3",
    change: "+1",
    isPositive: false,
    icon: TaxIcon,
  },
];

const cashAccounts = [
  { name: "Operating Account", balance: "$512,430", currency: "USD", trend: "+5.2%" },
  { name: "Payroll Account", balance: "$124,890", currency: "USD", trend: "-1.4%" },
  { name: "Euro Receivables", balance: "€86,120", currency: "EUR", trend: "+2.1%" },
];

const complianceTasks = [
  {
    title: "Quarterly Tax Filing",
    dueDate: "In 5 days",
    status: "Pending",
    owner: "Finance",
    severity: "High",
  },
  {
    title: "Audit Log Analysis",
    dueDate: "Today",
    status: "In Progress",
    owner: "Compliance",
    severity: "Medium",
  },
  {
    title: "Payment Terms Audit",
    dueDate: "In 9 days",
    status: "Not Started",
    owner: "Finance",
    severity: "Low",
  },
];

const ledgerHighlights = [
  { title: "Journal Entries Posted", value: "127", trend: "+6.7%" },
  { title: "Accounts Reconciled", value: "33 / 40", trend: "+82%" },
  { title: "Open Fiscal Periods", value: "2", trend: "Stable" },
];

const quickLinks = [
  { label: "Record Journal Entry", description: "Manual adjustments & accruals" },
  { label: "Reconcile Accounts", description: "Match transactions with statements" },
  { label: "Update Tax Codes", description: "Manage rates and effective dates" },
  { label: "Exchange Rate Check", description: "Validate currency conversions" },
];

const policyAlerts = [
  {
    title: "Policy update required",
    description: "Cash handling policy needs annual review.",
    severity: "warning",
  },
  {
    title: "Compliance evidence missing",
    description: "Upload bank reconciliation documents for March.",
    severity: "error",
  },
  {
    title: "Audit reminder",
    description: "Prepare Q2 financial statements for internal audit.",
    severity: "info",
  },
];

export function FinanceOverview() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Finance & Compliance</h1>
        <p className="mt-2 text-foreground/60">
          Stay on top of cash, ledger health, and regulatory obligations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Cash & Banking</CardTitle>
            <CardDescription>
              Monitor account balances and recent transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashAccounts.map((account) => (
              <div
                key={account.name}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {account.name}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {account.currency}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {account.balance}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {account.trend}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Compliance Tasks</CardTitle>
            <CardDescription>
              Upcoming filings and policy reviews that need attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {complianceTasks.map((task) => (
              <div
                key={task.title}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {task.title}
                  </p>
                  <Badge
                    variant={
                      task.severity === "High"
                        ? "destructive"
                        : task.severity === "Medium"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {task.severity}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-foreground/60">
                  <span>Due: {task.dueDate}</span>
                  <span>Owner: {task.owner}</span>
                  <span>{task.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Ledger Health</CardTitle>
            <CardDescription>
              Keep your books current and reconciled.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {ledgerHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-border p-4"
              >
                <p className="text-xs text-foreground/50">{item.title}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {item.value}
                </p>
                <Badge variant="outline" className="mt-2">
                  {item.trend}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Policy Alerts</CardTitle>
            <CardDescription>
              Track policy and compliance communication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {policyAlerts.map((alert) => (
              <div
                key={alert.title}
                className="rounded-lg border border-border bg-card-foreground/5 p-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  {alert.title}
                </p>
                <p className="mt-1 text-xs text-foreground/60">
                  {alert.description}
                </p>
                <Badge
                  variant={
                    alert.severity === "error"
                      ? "destructive"
                      : alert.severity === "warning"
                      ? "secondary"
                      : "outline"
                  }
                  className="mt-2"
                >
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Finance Quick Links</CardTitle>
          <CardDescription>
            Access frequently used finance and compliance workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {quickLinks.map((link) => (
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
    </div>
  );
}

