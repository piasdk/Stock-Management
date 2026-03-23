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

const BookIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
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

const TrendingUpIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

interface JournalEntry {
  journal_entry_id: number;
  journal_number: string;
  journal_type: string;
  entry_date: string;
  reference: string | null;
  memo: string | null;
  created_at: string;
  user_id: number | null;
  created_by_name: string | null;
  total_debit: number;
  total_credit: number;
}

interface ChartOfAccount {
  account_id: number;
  parent_account_id: number | null;
  account_code: string;
  name: string;
  account_type: string;
  is_posting: number | boolean;
  currency: string | null;
  notes: string | null;
  is_active: number | boolean;
  created_at: string;
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

export function Accounting() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [entriesRes, accountsRes] = await Promise.all([
          fetch("/api/accounting/journal-entries"),
          fetch("/api/accounting/chart-of-accounts"),
        ]);

        const entriesData = await entriesRes.json();
        const accountsData = await accountsRes.json();

        if (!entriesRes.ok) {
          throw new Error(entriesData?.error || "Failed to fetch journal entries");
        }
        if (!accountsRes.ok) {
          throw new Error(accountsData?.error || "Failed to fetch chart of accounts");
        }

        if (isMounted) {
          setJournalEntries((Array.isArray(entriesData) ? entriesData : []) as JournalEntry[]);
          setChartOfAccounts((Array.isArray(accountsData) ? accountsData : []) as ChartOfAccount[]);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unexpected error loading accounting data",
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

  const accountingTotals = useMemo(() => {
    const totalEntries = journalEntries.length;
    const totalDebit = journalEntries.reduce(
      (acc, entry) => acc + Number(entry.total_debit || 0),
      0,
    );
    const totalCredit = journalEntries.reduce(
      (acc, entry) => acc + Number(entry.total_credit || 0),
      0,
    );
    const totalAccounts = chartOfAccounts.length;
    const activeAccounts = chartOfAccounts.filter(
      (account) => account.is_active === true || account.is_active === 1,
    ).length;

    return {
      totalEntries,
      totalDebit,
      totalCredit,
      totalAccounts,
      activeAccounts,
    };
  }, [journalEntries, chartOfAccounts]);

  const metrics: Metric[] = useMemo(() => {
    return [
      {
        title: "Journal Entries",
        value: accountingTotals.totalEntries.toString(),
        change: `${accountingTotals.totalAccounts} accounts`,
        isPositive: accountingTotals.totalEntries > 0,
        icon: BookIcon,
      },
      {
        title: "Total Debit",
        value: formatCurrency(accountingTotals.totalDebit),
        change: `${accountingTotals.totalCredit > 0 ? Math.round((accountingTotals.totalDebit / accountingTotals.totalCredit) * 100) : 0}% of credit`,
        isPositive: accountingTotals.totalDebit >= 0,
        icon: DollarIcon,
      },
      {
        title: "Total Credit",
        value: formatCurrency(accountingTotals.totalCredit),
        change: `${accountingTotals.totalDebit > 0 ? Math.round((accountingTotals.totalCredit / accountingTotals.totalDebit) * 100) : 0}% of debit`,
        isPositive: accountingTotals.totalCredit >= 0,
        icon: TrendingUpIcon,
      },
      {
        title: "Active Accounts",
        value: accountingTotals.activeAccounts.toString(),
        change: `${accountingTotals.totalAccounts} total accounts`,
        isPositive: accountingTotals.activeAccounts > 0,
        icon: FileTextIcon,
      },
    ];
  }, [accountingTotals]);

  const recentEntries = useMemo(() => {
    return [...journalEntries]
      .sort((a, b) => {
        const aDate = a.entry_date ? new Date(a.entry_date).getTime() : 0;
        const bDate = b.entry_date ? new Date(b.entry_date).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 10);
  }, [journalEntries]);

  const typeSummary = useMemo(() => {
    const byType = new Map<string, { count: number; totalDebit: number; totalCredit: number }>();
    journalEntries.forEach((entry) => {
      const type = entry.journal_type || "unknown";
      const data = byType.get(type) ?? { count: 0, totalDebit: 0, totalCredit: 0 };
      data.count += 1;
      data.totalDebit += Number(entry.total_debit || 0);
      data.totalCredit += Number(entry.total_credit || 0);
      byType.set(type, data);
    });
    return Array.from(byType.entries()).map(([type, data]) => ({
      type,
      ...data,
    }));
  }, [journalEntries]);

  const accountTypeSummary = useMemo(() => {
    const byType = new Map<string, number>();
    chartOfAccounts.forEach((account) => {
      const type = account.account_type || "unknown";
      byType.set(type, (byType.get(type) || 0) + 1);
    });
    return Array.from(byType.entries()).map(([type, count]) => ({
      type,
      count,
    }));
  }, [chartOfAccounts]);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Accounting</h1>
        <p className="mt-2 text-foreground/60">
          Manage journal entries, chart of accounts, and financial records.
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load accounting data</CardTitle>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Journal Type Summary</CardTitle>
            <CardDescription>
              Journal entries grouped by type.
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
                  <p className="text-xs text-foreground/50">
                    {entry.count} entries
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-foreground/60">
                    D: {formatCurrency(entry.totalDebit)}
                  </p>
                  <p className="text-xs text-foreground/60">
                    C: {formatCurrency(entry.totalCredit)}
                  </p>
                </div>
              </div>
            ))}
            {!typeSummary.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No journal entries recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Account Types</CardTitle>
            <CardDescription>
              Chart of accounts by type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountTypeSummary.map((entry) => (
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
            {!accountTypeSummary.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No accounts recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent Journal Entries</CardTitle>
          <CardDescription>
            Latest journal entries and transactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentEntries.map((entry) => (
            <div
              key={entry.journal_entry_id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {entry.journal_number}
                  </p>
                  <p className="text-xs text-foreground/60 mt-1">
                    {entry.memo || entry.reference || "No description"}
                    {entry.created_by_name ? ` • ${entry.created_by_name}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-1">
                    {entry.journal_type}
                  </Badge>
                  <div className="text-xs text-foreground/60 mt-1">
                    <p>D: {formatCurrency(entry.total_debit)}</p>
                    <p>C: {formatCurrency(entry.total_credit)}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-foreground/60">
                <span>
                  {entry.entry_date
                    ? new Date(entry.entry_date).toLocaleDateString()
                    : "No date"}
                </span>
                <span>
                  {entry.created_at
                    ? `Created: ${new Date(entry.created_at).toLocaleDateString()}`
                    : ""}
                </span>
              </div>
            </div>
          ))}
          {!recentEntries.length && !isLoading ? (
            <p className="text-sm text-foreground/50">No journal entries to display.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

