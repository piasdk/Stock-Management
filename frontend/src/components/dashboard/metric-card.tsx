"use client";

import React from "react";

import { Card, CardContent } from "../ui/card";

type SvgComponent = React.ComponentType<
  React.SVGProps<SVGSVGElement>
>;

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: SvgComponent;
  iconColor?: string;
  iconBgColor?: string;
}

const ArrowUpRightIcon: SvgComponent = ({ className, ...props }) => (
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
    <line x1={7} y1={17} x2={17} y2={7} />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

const ArrowDownRightIcon: SvgComponent = ({ className, ...props }) => (
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
    <line x1={7} y1={7} x2={17} y2={17} />
    <polyline points="17 7 17 17 7 17" />
  </svg>
);

export function MetricCard({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  iconColor = "text-foreground/40",
  iconBgColor = "bg-card-foreground/10",
}: MetricCardProps) {
  const showTrend = typeof change === "string" && change.length > 0;

  return (
    <Card className="border-border bg-card transition-colors hover:border-border/80">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="mb-2 text-sm text-foreground/60">{title}</p>
            <p className="mb-3 text-2xl font-bold text-foreground">{value}</p>
            {showTrend && (
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <ArrowUpRightIcon className="h-4 w-4 text-chart-1" />
                ) : (
                  <ArrowDownRightIcon className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    isPositive ? "text-chart-1" : "text-destructive"
                  }`}
                >
                  {change}
                </span>
                <span className="text-xs text-foreground/50">
                  vs last month
                </span>
              </div>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBgColor}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { ArrowDownRightIcon, ArrowUpRightIcon };

