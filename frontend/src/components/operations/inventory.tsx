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
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const BoxesIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1={12} y1={22.08} x2={12} y2={12} />
  </svg>
);

const AlertIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0Z" />
    <line x1={12} y1={9} x2={12} y2={13} />
    <line x1={12} y1={17} x2={12.01} y2={17} />
  </svg>
);

const TransferIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <polyline points="5 12 9 16 5 20" />
    <polyline points="19 4 15 8 19 12" />
    <line x1={9} y1={16} x2={19} y2={16} />
    <line x1={5} y1={8} x2={15} y2={8} />
  </svg>
);

const ClipboardIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <rect width={8} height={4} x={8} y={2} rx={1} />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <line x1={9} y1={12} x2={15} y2={12} />
    <line x1={9} y1={16} x2={13} y2={16} />
  </svg>
);

const ShieldIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

interface StockLevel {
  stock_level_id: number;
  company_id: number;
  product_id: number;
  variant_id: number | null;
  location_id: number;
  quantity: number;
  safety_stock: number | null;
  product_name?: string;
  location_name?: string;
}

interface Location {
  location_id: number;
  company_id: number;
  name: string;
  code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_default: number | boolean;
  is_active: number | boolean;
}

interface Metric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ComponentType<React.SVGAttributes<SVGSVGElement>>;
  iconColor?: string;
  iconBgColor?: string;
}

const formatRelativeDate = (input?: string | null) => {
  if (!input) return "No date";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "No date";
  const diffMs = Date.now() - parsed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? "Just now" : `${diffMinutes} mins ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "1 week ago";
  if (diffWeeks < 6) return `${diffWeeks} weeks ago`;
  return parsed.toLocaleDateString();
};

export function Inventory() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [levelsRes, locationsRes] = await Promise.all([
          api.get<StockLevel[]>("/inventory/stock-levels"),
          api.get<Location[]>("/inventory/locations"),
        ]);

        if (levelsRes.error) {
          throw new Error(levelsRes.error || "Failed to fetch stock levels");
        }
        if (locationsRes.error) {
          throw new Error(locationsRes.error || "Failed to fetch locations");
        }

        if (isMounted) {
          setStockLevels((Array.isArray(levelsRes.data) ? levelsRes.data : []) as StockLevel[]);
          setLocations((Array.isArray(locationsRes.data) ? locationsRes.data : []) as Location[]);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unexpected error loading inventory",
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

  const inventoryTotals = useMemo(() => {
    const totalLines = stockLevels.length;
    const totalQuantity = stockLevels.reduce((acc, level) => acc + Number(level.quantity || 0), 0);
    const distinctProducts = new Set(stockLevels.map((level) => level.product_id)).size;
    const locationsCovered = new Set(stockLevels.map((level) => level.location_id)).size;
    const lowStockLines = stockLevels.filter((level) => {
      if (level.safety_stock == null) return false;
      return level.quantity <= level.safety_stock;
    }).length;

    return {
      totalLines,
      totalQuantity,
      distinctProducts,
      locationsCovered,
      lowStockLines,
    };
  }, [stockLevels]);

  const metrics: Metric[] = useMemo(() => {
    return [
      {
        title: "Inventory Lines",
        value: inventoryTotals.totalLines.toString(),
        change: `${inventoryTotals.distinctProducts} products tracked`,
        isPositive: inventoryTotals.totalLines > 0,
        icon: BoxesIcon,
        iconColor: "text-emerald-600",
        iconBgColor: "bg-emerald-100",
      },
      {
        title: "Total Quantity",
        value: inventoryTotals.totalQuantity.toString(),
        change: `${inventoryTotals.locationsCovered} locations`,
        isPositive: inventoryTotals.totalQuantity >= 0,
        icon: ShieldIcon,
        iconColor: "text-purple-600",
        iconBgColor: "bg-purple-100",
      },
      {
        title: "Low Stock Lines",
        value: inventoryTotals.lowStockLines.toString(),
        change: `${inventoryTotals.totalLines ? Math.round((inventoryTotals.lowStockLines / inventoryTotals.totalLines) * 100) : 0}% of lines`,
        isPositive: inventoryTotals.lowStockLines === 0,
        icon: AlertIcon,
        iconColor: "text-amber-600",
        iconBgColor: "bg-amber-100",
      },
      {
        title: "Average Per Line",
        value: inventoryTotals.totalLines
          ? Math.round(inventoryTotals.totalQuantity / inventoryTotals.totalLines).toString()
          : "0",
        change: "Quantity per SKU/location",
        isPositive: true,
        icon: ClipboardIcon,
        iconColor: "text-orange-600",
        iconBgColor: "bg-orange-100",
      },
    ];
  }, [inventoryTotals]);

  const locationSummary = useMemo(() => {
    const byLocation = new Map<number, { name: string; quantity: number; lines: number }>();
    stockLevels.forEach((level) => {
      const entry = byLocation.get(level.location_id) ?? {
        name:
          locations.find((location) => location.location_id === level.location_id)?.name || "Unknown",
        quantity: 0,
        lines: 0,
      };
      entry.quantity += Number(level.quantity || 0);
      entry.lines += 1;
      byLocation.set(level.location_id, entry);
    });

    return Array.from(byLocation.values()).sort((a, b) => b.quantity - a.quantity);
  }, [locations, stockLevels]);

  const replenishmentWatch = useMemo(() => {
    return stockLevels
      .filter((level) => level.safety_stock != null && level.quantity <= level.safety_stock)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 6)
      .map((level) => ({
        level,
        deficit:
          level.safety_stock != null ? level.safety_stock - level.quantity : null,
      }));
  }, [stockLevels]);

  const balancedLocations = useMemo(() => {
    const averagePerLocation = locationSummary.length
      ? Math.round(
          locationSummary.reduce((acc, entry) => acc + entry.quantity, 0) /
            locationSummary.length,
        )
      : 0;

    return locationSummary.map((entry) => ({
      name: entry.name,
      quantity: entry.quantity,
      lines: entry.lines,
      balanced: entry.quantity >= averagePerLocation,
      average: averagePerLocation,
    }));
  }, [locationSummary]);

  const inventoryAlerts = useMemo(() => {
    return replenishmentWatch.slice(0, 3).map(({ level, deficit }) => ({
      title: level.product_name || `Product ${level.product_id}`,
      description: `Quantity ${level.quantity} at ${level.location_name || "location"}. ${
        deficit != null ? `Short ${deficit}` : "Safety stock not defined"
      }`,
      severity: level.quantity === 0 ? "Critical" : "Warning",
    }));
  }, [replenishmentWatch]);

  const cycleCountPlan = useMemo(() => {
    return balancedLocations.slice(0, 6).map((entry) => ({
      location: entry.name,
      progress: entry.lines
        ? Math.min(100, Math.round((entry.lines / inventoryTotals.distinctProducts || 1) * 100))
        : 0,
      nextCount: entry.balanced ? "Scheduled" : "Prioritize",
    }));
  }, [balancedLocations, inventoryTotals.distinctProducts]);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
        <p className="mt-2 text-foreground/60">
          Monitor stock levels, warehouse utilization, and movement across the network.
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load inventory</CardTitle>
            <CardDescription className="text-destructive">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard 
            key={metric.title} 
            title={metric.title}
            value={metric.value}
            change={metric.change}
            isPositive={metric.isPositive}
            icon={metric.icon}
            iconColor={metric.iconColor}
            iconBgColor={metric.iconBgColor}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Location Summary</CardTitle>
            <CardDescription>
              Stock distribution by facility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {locationSummary.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {entry.name}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {entry.lines} stock lines
                  </p>
                </div>
                <Badge variant="outline">{entry.quantity}</Badge>
              </div>
            ))}
            {!locationSummary.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No stock levels recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Replenishment Watchlist</CardTitle>
            <CardDescription>
              Items approaching safety stock thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {replenishmentWatch.map(({ level, deficit }) => (
              <div
                key={level.stock_level_id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {level.product_name || `Product ${level.product_id}`}
                  </p>
                  <Badge variant="outline">Qty {level.quantity}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-foreground/60">
                  <span>{level.location_name || "Location"}</span>
                  <span>
                    {level.safety_stock != null
                      ? `Safety ${level.safety_stock}`
                      : "No safety target"}
                  </span>
                </div>
                {deficit != null ? (
                  <p className="mt-2 text-xs text-foreground/50">
                    Short {deficit} units to reach safety stock.
                  </p>
                ) : null}
              </div>
            ))}
            {!replenishmentWatch.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No low stock alerts at the moment.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
            <CardDescription>
              Operational exceptions that need attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {inventoryAlerts.map((alert) => (
              <div
                key={alert.title}
                className="rounded-lg border border-border bg-card-foreground/5 p-4"
              >
                <p className="text-sm font-semibold text-foreground">
                  {alert.title}
                </p>
                <p className="mt-2 text-xs text-foreground/60">
                  {alert.description}
                </p>
                <Badge
                  variant={alert.severity === "Critical" ? "destructive" : "secondary"}
                  className="mt-3"
                >
                  {alert.severity}
                </Badge>
              </div>
            ))}
            {!inventoryAlerts.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No inventory alerts to display.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Cycle Count Schedule</CardTitle>
          <CardDescription>
            Coverage progress by location.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {cycleCountPlan.map((entry) => (
            <div
              key={entry.location}
              className="rounded-lg border border-border p-4"
            >
              <p className="text-sm font-semibold text-foreground">
                {entry.location}
              </p>
              <p className="mt-2 text-xs text-foreground/60">
                Progress: {entry.progress}%
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-foreground/50">
                <span>{entry.nextCount}</span>
                <Button size="sm" variant="ghost">
                  Details
                </Button>
              </div>
            </div>
          ))}
          {!cycleCountPlan.length && !isLoading ? (
            <p className="text-sm text-foreground/50">
              Cycle count scheduling will display once inventory data is available.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

