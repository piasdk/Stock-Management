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

const GridIcon = ({ className, ...props }: IconProps) => (
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
    <rect width={7} height={7} x={3} y={3} />
    <rect width={7} height={7} x={14} y={3} />
    <rect width={7} height={7} x={14} y={14} />
    <rect width={7} height={7} x={3} y={14} />
  </svg>
);

const TagIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M3 7V3h4" />
    <path d="M21 3v4h-4" />
    <path d="M3 17v4h4" />
    <path d="M21 21v-4h-4" />
    <circle cx={12} cy={12} r={3} />
  </svg>
);

const TrendingIcon = ({ className, ...props }: IconProps) => (
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
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  </svg>
);

const ArchiveIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
    <path d="m3 8 1.89 11.34A2 2 0 0 0 6.86 21h10.28a2 2 0 0 0 1.97-1.66L21 8" />
    <path d="M7 10h10" />
  </svg>
);

const metrics = [
  {
    title: "Active SKUs",
    value: "3,482",
    change: "+4.2%",
    isPositive: true,
    icon: GridIcon,
  },
  {
    title: "Pending Approval",
    value: "128",
    change: "+11.6%",
    isPositive: false,
    icon: TagIcon,
  },
  {
    title: "Avg. Margin",
    value: "32.4%",
    change: "+1.8%",
    isPositive: true,
    icon: TrendingIcon,
  },
  {
    title: "Discontinued Items",
    value: "54",
    change: "-6.1%",
    isPositive: true,
    icon: ArchiveIcon,
  },
];

const categoryMix = [
  { name: "Raw Materials", products: 842, contribution: "25%" },
  { name: "Finished Goods", products: 1762, contribution: "51%" },
  { name: "Services", products: 214, contribution: "6%" },
  { name: "Accessories", products: 664, contribution: "18%" },
];

const changeLog = [
  {
    action: "Price update",
    product: "Industrial Generator Model X",
    time: "15 mins ago",
    actor: "J. Mwangi",
  },
  {
    action: "New variant added",
    product: "Safety Helmet - Reflective",
    time: "1 hour ago",
    actor: "L. Wanjiru",
  },
  {
    action: "Description updated",
    product: "Warehouse Shelving Kit",
    time: "3 hours ago",
    actor: "K. Nyaga",
  },
];

const approvals = [
  {
    sku: "SKU-8821",
    title: "Premium Welding Gloves",
    submitted: "2h ago",
    owner: "Procurement",
    status: "Awaiting Approval",
  },
  {
    sku: "SKU-9934",
    title: "Hydraulic Pump Series A",
    submitted: "5h ago",
    owner: "Engineering",
    status: "Needs Pricing",
  },
  {
    sku: "SKU-3370",
    title: "Forklift Maintenance Kit",
    submitted: "1d ago",
    owner: "Operations",
    status: "Ready to Publish",
  },
];

const lifecycle = [
  {
    stage: "Concept",
    items: 42,
    description: "Awaiting market validation",
  },
  {
    stage: "In Development",
    items: 68,
    description: "Specifications under review",
  },
  {
    stage: "Active",
    items: 3_284,
    description: "Live and selling",
  },
  {
    stage: "End of Life",
    items: 118,
    description: "Scheduled for phase-out",
  },
];

export function CatalogOverview() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Catalog</h1>
        <p className="mt-2 text-foreground/60">
          Manage product data, lifecycle changes, and merchandising health.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Category Mix</CardTitle>
            <CardDescription>
              Distribution of items across catalog categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryMix.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {category.name}
                  </p>
                  <p className="text-xs text-foreground/50 mt-1">
                    {category.products} products
                  </p>
                </div>
                <Badge variant="outline">{category.contribution}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Add new products and manage catalog metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button>Add New Product</Button>
            <Button variant="secondary">Bulk Import Items</Button>
            <Button variant="ghost">Manage Categories</Button>
              <Button variant="ghost">Manage Attribute Sets</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Change Log</CardTitle>
            <CardDescription>
              Recent catalog updates and responsible teams.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {changeLog.map((entry) => (
              <div
                key={entry.product}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {entry.action}
                  </p>
                  <p className="text-xs text-foreground/60">{entry.product}</p>
                </div>
                <div className="text-right text-xs text-foreground/50">
                  <p>{entry.time}</p>
                  <p>By {entry.actor}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>
              Products awaiting pricing, data validation, or go-live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvals.map((item) => (
              <div
                key={item.sku}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <Badge variant="outline">{item.sku}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-foreground/60">
                  <span>{item.status}</span>
                  <span>{item.owner}</span>
                  <span>{item.submitted}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Product Lifecycle</CardTitle>
          <CardDescription>
            Track where each product sits in the commercialization pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          {lifecycle.map((stage) => (
            <div
              key={stage.stage}
              className="rounded-lg border border-border p-4 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                {stage.stage}
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {stage.items}
              </p>
              <p className="mt-2 text-xs text-foreground/60">
                {stage.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

