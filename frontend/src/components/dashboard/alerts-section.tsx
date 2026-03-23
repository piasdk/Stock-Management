"use client";

import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";

type IconProps = React.SVGAttributes<SVGSVGElement>;

const AlertIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0Z" />
  </svg>
);

const ClockIcon = ({ className, ...props }: IconProps) => (
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
    <circle cx={12} cy={12} r={10} />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export type DashboardAlert = {
  id?: string | number;
  title: string;
  description: string;
  severity: "error" | "warning" | "info";
  timestamp?: string;
};

interface AlertsSectionProps {
  alerts: DashboardAlert[];
}

export function AlertsSection({ alerts }: AlertsSectionProps) {
  const hasAlerts = alerts.length > 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Alerts & Notifications</CardTitle>
        <CardDescription>
          Stay informed about critical business events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasAlerts ? (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={alert.id ?? index}
                className="flex items-start gap-3 rounded-lg border border-border bg-card-foreground/5 p-3"
              >
                {alert.severity === "error" && (
                  <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                )}
                {alert.severity === "warning" && (
                  <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-chart-4" />
                )}
                {alert.severity === "info" && (
                  <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-chart-2" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {alert.title}
                  </p>
                  <p className="mt-1 text-xs text-foreground/60">
                    {alert.description}
                  </p>
                  {alert.timestamp && (
                    <p className="mt-2 text-xs text-foreground/40">
                      {alert.timestamp}
                    </p>
                  )}
                </div>
                {alert.severity === "info" && (
                  <Badge variant="outline" className="ml-2 shrink-0">
                    New
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 bg-card-foreground/5 p-6 text-center text-sm text-foreground/60">
            Your stock, invoices, and approvals look healthy.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

