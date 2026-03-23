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

const BarChartIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <line x1={12} y1={20} x2={12} y2={10} />
    <line x1={18} y1={20} x2={18} y2={4} />
    <line x1={6} y1={20} x2={6} y2={16} />
  </svg>
);

const CalendarIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <rect width={18} height={18} x={3} y={4} rx={2} ry={2} />
    <line x1={16} y1={2} x2={16} y2={6} />
    <line x1={8} y1={2} x2={8} y2={6} />
    <line x1={3} y1={10} x2={21} y2={10} />
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

interface Report {
  report_id: number;
  report_name: string;
  report_type: string;
  report_period: string;
  start_date: string | null;
  end_date: string | null;
  parameters: string | null;
  file_url: string | null;
  created_at: string;
  user_id: number | null;
  generated_by_name: string | null;
  branch_id: number | null;
  branch_name: string | null;
}

interface Metric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ComponentType<React.SVGAttributes<SVGSVGElement>>;
}

export function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/reports");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch reports");
        }
        if (isMounted) {
          setReports((Array.isArray(data) ? data : []) as Report[]);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unexpected error loading reports",
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

  const reportsTotals = useMemo(() => {
    const total = reports.length;
    const byType = new Map<string, number>();
    const byPeriod = new Map<string, number>();
    
    reports.forEach((report) => {
      byType.set(report.report_type, (byType.get(report.report_type) || 0) + 1);
      byPeriod.set(report.report_period, (byPeriod.get(report.report_period) || 0) + 1);
    });

    const mostCommonType = Array.from(byType.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const mostCommonPeriod = Array.from(byPeriod.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return {
      total,
      byType: Array.from(byType.entries()).length,
      mostCommonType,
      mostCommonPeriod,
    };
  }, [reports]);

  const metrics: Metric[] = useMemo(() => {
    return [
      {
        title: "Total Reports",
        value: reportsTotals.total.toString(),
        change: `${reportsTotals.byType} types`,
        isPositive: reportsTotals.total > 0,
        icon: FileTextIcon,
      },
      {
        title: "Report Types",
        value: reportsTotals.byType.toString(),
        change: `Most common: ${reportsTotals.mostCommonType}`,
        isPositive: reportsTotals.byType > 0,
        icon: BarChartIcon,
      },
      {
        title: "Most Common Period",
        value: reportsTotals.mostCommonPeriod,
        change: "Frequently generated",
        isPositive: true,
        icon: CalendarIcon,
      },
      {
        title: "Insights",
        value: reportsTotals.total > 0 ? "Active" : "None",
        change: `${reportsTotals.total} reports available`,
        isPositive: reportsTotals.total > 0,
        icon: TrendingUpIcon,
      },
    ];
  }, [reportsTotals]);

  const recentReports = useMemo(() => {
    return [...reports]
      .sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 10);
  }, [reports]);

  const typeSummary = useMemo(() => {
    const byType = new Map<string, number>();
    reports.forEach((report) => {
      const type = report.report_type || "unknown";
      byType.set(type, (byType.get(type) || 0) + 1);
    });
    return Array.from(byType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [reports]);

  const periodSummary = useMemo(() => {
    const byPeriod = new Map<string, number>();
    reports.forEach((report) => {
      const period = report.report_period || "unknown";
      byPeriod.set(period, (byPeriod.get(period) || 0) + 1);
    });
    return Array.from(byPeriod.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => b.count - a.count);
  }, [reports]);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="mt-2 text-foreground/60">
          View and manage generated reports and analytics.
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load reports</CardTitle>
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
            <CardTitle>Report Types</CardTitle>
            <CardDescription>
              Reports grouped by type.
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
              <p className="text-sm text-foreground/50">No reports recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Report Periods</CardTitle>
            <CardDescription>
              Reports grouped by period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {periodSummary.map((entry) => (
              <div
                key={entry.period}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {entry.period}
                  </p>
                </div>
                <Badge variant="outline">{entry.count}</Badge>
              </div>
            ))}
            {!periodSummary.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No reports recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            Latest generated reports and analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentReports.map((report) => (
            <div
              key={report.report_id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {report.report_name}
                  </p>
                  <p className="text-xs text-foreground/60 mt-1">
                    {report.generated_by_name || "System"}
                    {report.branch_name ? ` • ${report.branch_name}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-1">
                    {report.report_type}
                  </Badge>
                  <p className="text-xs text-foreground/60 capitalize">
                    {report.report_period}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-foreground/60">
                <span>
                  {report.start_date && report.end_date
                    ? `${new Date(report.start_date).toLocaleDateString()} - ${new Date(report.end_date).toLocaleDateString()}`
                    : report.created_at
                    ? `Generated: ${new Date(report.created_at).toLocaleDateString()}`
                    : "No date"}
                </span>
                {report.file_url ? (
                  <a
                    href={report.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Download
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          {!recentReports.length && !isLoading ? (
            <p className="text-sm text-foreground/50">No reports to display.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

