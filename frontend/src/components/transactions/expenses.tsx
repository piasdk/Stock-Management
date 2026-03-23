"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ReceiptIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M14 8H8" />
    <path d="M16 12H8" />
    <path d="M13 16H8" />
  </svg>
);

const DollarIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <line x1={12} y1={1} x2={12} y2={23} />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const CheckCircleIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ClockIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <circle cx={12} cy={12} r={10} />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

interface ExpenseReport {
  expense_report_id: number;
  report_number: string;
  title: string | null;
  status: string;
  total_amount: number | null;
  currency: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  user_id: number | null;
  submitted_by_name: string | null;
  approved_by_id: number | null;
  approved_by_name: string | null;
}

interface Metric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ComponentType<React.SVGAttributes<SVGSVGElement>>;
}

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export function Expenses() {
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    report_number: "",
    title: "",
    total_amount: "",
    currency: "USD",
    status: "draft",
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/expenses");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch expense reports");
        }
        if (isMounted) {
          setExpenseReports((Array.isArray(data) ? data : []) as ExpenseReport[]);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unexpected error loading expenses",
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

  const expensesTotals = useMemo(() => {
    const total = expenseReports.length;
    const totalAmount = expenseReports.reduce(
      (acc, report) => acc + Number(report.total_amount || 0),
      0,
    );
    const pending = expenseReports.filter(
      (report) => report.status === "draft" || report.status === "submitted",
    ).length;
    const approved = expenseReports.filter(
      (report) => report.status === "approved" || report.status === "reimbursed",
    ).length;
    const rejected = expenseReports.filter(
      (report) => report.status === "rejected",
    ).length;

    return {
      total,
      totalAmount,
      pending,
      approved,
      rejected,
    };
  }, [expenseReports]);

  const metrics: Metric[] = useMemo(() => {
    return [
      {
        title: "Total Reports",
        value: expensesTotals.total.toString(),
        change: `${expensesTotals.approved} approved`,
        isPositive: expensesTotals.total > 0,
        icon: ReceiptIcon,
      },
      {
        title: "Total Expenses",
        value: formatCurrency(expensesTotals.totalAmount),
        change: `${expensesTotals.approved} approved`,
        isPositive: expensesTotals.totalAmount >= 0,
        icon: DollarIcon,
      },
      {
        title: "Pending",
        value: expensesTotals.pending.toString(),
        change: `${expensesTotals.total ? Math.round((expensesTotals.pending / expensesTotals.total) * 100) : 0}% of total`,
        isPositive: expensesTotals.pending === 0,
        icon: ClockIcon,
      },
      {
        title: "Rejected",
        value: expensesTotals.rejected.toString(),
        change: `${expensesTotals.total ? Math.round((expensesTotals.rejected / expensesTotals.total) * 100) : 0}% of total`,
        isPositive: expensesTotals.rejected === 0,
        icon: CheckCircleIcon,
      },
    ];
  }, [expensesTotals]);

  const recentReports = useMemo(() => {
    return [...expenseReports]
      .sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 10);
  }, [expenseReports]);

  const statusSummary = useMemo(() => {
    const byStatus = new Map<string, { count: number; total: number }>();
    expenseReports.forEach((report) => {
      const status = report.status || "unknown";
      const entry = byStatus.get(status) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += Number(report.total_amount || 0);
      byStatus.set(status, entry);
    });
    return Array.from(byStatus.entries()).map(([status, data]) => ({
      status,
      ...data,
    }));
  }, [expenseReports]);

  const handleDelete = (reportId: number) => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm("Are you sure you want to delete this expense report?");
    if (!confirmed) return;
    setExpenseReports((prev) => prev.filter((report) => report.expense_report_id !== reportId));
  };

  const handleEdit = (reportId: number) => {
    alert(`Edit flow for expense report #${reportId} coming soon.`);
  };

  const resetForm = () => {
    setFormData({
      report_number: "",
      title: "",
      total_amount: "",
      currency: "USD",
      status: "draft",
      notes: "",
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const handleAddExpense = () => {
    setShowForm(true);
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.report_number.trim() || !formData.total_amount.trim()) {
      setFormError("Report number and total amount are required.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const newReport: ExpenseReport = {
        expense_report_id: Date.now(),
        report_number: formData.report_number,
        title: formData.title || null,
        status: formData.status,
        total_amount: Number(formData.total_amount) || 0,
        currency: formData.currency,
        submitted_at: new Date().toISOString(),
        approved_at: null,
        notes: formData.notes || null,
        created_at: new Date().toISOString(),
        user_id: null,
        submitted_by_name: "You",
        approved_by_id: null,
        approved_by_name: null,
      };
      setExpenseReports((prev) => [newReport, ...prev]);
      setFormSuccess("Expense recorded successfully.");
      setShowForm(false);
      resetForm();
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : "Failed to submit expense report",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
          <p className="mt-2 text-foreground/60">
            Track expense reports, reimbursements, and spending.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto border-transparent text-emerald-500 hover:text-emerald-200 hover:bg-transparent shadow-none transition-colors duration-150 ease-in-out"
          onClick={handleAddExpense}
          disabled={showForm}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {formSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {formSuccess}
        </div>
      )}
      {formError && (
        <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">
          {formError}
        </div>
      )}

      {showForm && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Record Expense</CardTitle>
            <CardDescription>Add a new expense report to the ledger.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="report_number">Report Number *</Label>
                  <Input
                    id="report_number"
                    placeholder="EXP-2025-001"
                    value={formData.report_number}
                    onChange={(e) => setFormData({ ...formData, report_number: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Marketing retreat"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Amount *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="KES">KES</option>
                      <option value="NGN">NGN</option>
                      <option value="FRW">FRW</option>
                    </select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="approved">Approved</option>
                      <option value="reimbursed">Reimbursed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Describe the expense or reimbursement notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-foreground/70 hover:text-foreground"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load expenses</CardTitle>
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
            <CardTitle>Status Summary</CardTitle>
            <CardDescription>
              Expense reports grouped by status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusSummary.map((entry) => (
              <div
                key={entry.status}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {entry.status}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {entry.count} reports
                  </p>
                </div>
                <Badge variant="outline">{formatCurrency(entry.total)}</Badge>
              </div>
            ))}
            {!statusSummary.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No expense reports recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            Latest expense reports and submissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentReports.map((report) => (
            <div
              key={report.expense_report_id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {report.report_number}
                  </p>
                  <p className="text-xs text-foreground/60 mt-1">
                    {report.title || "No title"}
                    {report.submitted_by_name ? ` • ${report.submitted_by_name}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(report.total_amount)}
                  </p>
                  <Badge
                    variant={
                      report.status === "reimbursed"
                        ? "default"
                        : report.status === "approved"
                        ? "secondary"
                        : report.status === "rejected"
                        ? "destructive"
                        : "outline"
                    }
                    className="mt-1"
                  >
                    {report.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-foreground/60">
                <span>
                  {report.submitted_at
                    ? `Submitted: ${new Date(report.submitted_at).toLocaleDateString()}`
                    : report.created_at
                    ? `Created: ${new Date(report.created_at).toLocaleDateString()}`
                    : "No date"}
                </span>
                <span>
                  {report.approved_by_name
                    ? `Approved by: ${report.approved_by_name}`
                    : report.status === "approved" || report.status === "reimbursed"
                    ? "Approved"
                    : "Pending approval"}
                </span>
              </div>
            </div>
          ))}
          {!recentReports.length && !isLoading ? (
            <p className="text-sm text-foreground/50">No expense reports to display.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>All Expense Reports</CardTitle>
          <CardDescription>Manage every expense entry with quick actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-foreground/50">
                  <th className="py-2 pr-4">Report #</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Submitted</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenseReports.length ? (
                  expenseReports.map((report) => (
                    <tr
                      key={report.expense_report_id}
                      className="border-t border-border/60 text-foreground"
                    >
                      <td className="py-3 pr-4 font-medium">{report.report_number}</td>
                      <td className="py-3 pr-4">{report.title ?? "Untitled report"}</td>
                      <td className="py-3 pr-4">{formatCurrency(report.total_amount)}</td>
                      <td className="py-3 pr-4 capitalize">{report.status}</td>
                      <td className="py-3 pr-4 text-foreground/60">
                        {report.submitted_at
                          ? new Date(report.submitted_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(report.expense_report_id)}
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(report.expense_report_id)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-foreground/50">
                      {isLoading
                        ? "Loading expense reports..."
                        : "No expense reports found. Start by adding a new expense."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

