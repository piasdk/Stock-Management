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

interface Product {
  product_id: number;
  name: string;
  product_type: "finished_good" | "raw_material" | "semi_finished" | "service" | "consumable";
  is_active: number | boolean;
  updated_at: string | null;
}

interface Supplier {
  supplier_id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  notes: string | null;
  is_active: number | boolean;
  created_at: string | null;
}

interface Customer {
  customer_id: number;
  name: string;
  created_at: string | null;
}

interface StockLevel {
  stock_level_id: number;
  product_id: number;
  location_id: number;
  location_name?: string;
  product_name?: string;
  quantity: number;
  safety_stock: number | null;
}

interface Metric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ComponentType<React.SVGAttributes<SVGSVGElement>>;
}

const GridIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <rect width={7} height={7} x={3} y={3} />
    <rect width={7} height={7} x={14} y={3} />
    <rect width={7} height={7} x={14} y={14} />
    <rect width={7} height={7} x={3} y={14} />
  </svg>
);

const UsersIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx={9} cy={7} r={4} />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ActivityIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
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

export function OperationsOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [productsRes, suppliersRes, customersRes, stockRes] = await Promise.all([
          fetch("/api/catalog/products"),
          fetch("/api/suppliers"),
          fetch("/api/customers"),
          fetch("/api/inventory/stock-levels"),
        ]);

        const [productsData, suppliersData, customersData, stockData] = await Promise.all([
          productsRes.json(),
          suppliersRes.json(),
          customersRes.json(),
          stockRes.json(),
        ]);

        if (!productsRes.ok) {
          throw new Error(productsData?.error || "Failed to fetch products");
        }
        if (!suppliersRes.ok) {
          throw new Error(suppliersData?.error || "Failed to fetch suppliers");
        }
        if (!customersRes.ok) {
          throw new Error(customersData?.error || "Failed to fetch customers");
        }
        if (!stockRes.ok) {
          throw new Error(stockData?.error || "Failed to fetch stock levels");
        }

        if (isMounted) {
          setProducts((Array.isArray(productsData) ? productsData : []) as Product[]);
          setSuppliers((Array.isArray(suppliersData) ? suppliersData : []) as Supplier[]);
          setCustomers((Array.isArray(customersData) ? customersData : []) as Customer[]);
          setStockLevels((Array.isArray(stockData) ? stockData : []) as StockLevel[]);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unexpected error loading operations overview",
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

  const metrics: Metric[] = useMemo(() => {
    const activeProducts = products.filter((product) => product.is_active === true || product.is_active === 1).length;
    const activeSuppliers = suppliers.filter((supplier) => supplier.is_active === true || supplier.is_active === 1).length;
    const totalStockLines = stockLevels.length;
    const lowStockLines = stockLevels.filter((level) => {
      if (level.safety_stock == null) return false;
      return level.quantity <= level.safety_stock;
    }).length;

    return [
      {
        title: "Catalog Items",
        value: products.length.toString(),
        change: `${activeProducts} active`,
        isPositive: activeProducts >= products.length / 2,
        icon: GridIcon,
      },
      {
        title: "Supplier Network",
        value: suppliers.length.toString(),
        change: `${activeSuppliers} active`,
        isPositive: activeSuppliers >= suppliers.length / 2,
        icon: UsersIcon,
      },
      {
        title: "Customer Accounts",
        value: customers.length.toString(),
        change: `${customers.filter((customer) => customer.created_at).length} with timeline`,
        isPositive: customers.length > 0,
        icon: ActivityIcon,
      },
      {
        title: "Inventory Lines",
        value: totalStockLines.toString(),
        change: `${lowStockLines} low stock`,
        isPositive: lowStockLines === 0,
        icon: ShieldIcon,
      },
    ];
  }, [customers, products, stockLevels, suppliers]);

  const operationalAlerts = useMemo(() => {
    const lowStockItems = stockLevels
      .filter((level) => level.safety_stock != null && level.quantity <= level.safety_stock)
      .slice(0, 4)
      .map((level) => ({
        title: level.product_name || `Product ${level.product_id}`,
        description: `Quantity ${level.quantity} at ${level.location_name || "location"}`,
        type: level.quantity === 0 ? "Critical" : "Warning",
      }));

    const inactiveSuppliers = suppliers
      .filter((supplier) => !(supplier.is_active === true || supplier.is_active === 1))
      .slice(0, 4)
      .map((supplier) => ({
        title: supplier.name,
        description: supplier.contact_name
          ? `Contact: ${supplier.contact_name}`
          : "No contact assigned",
        type: "Supplier",
      }));

    return [...lowStockItems, ...inactiveSuppliers].slice(0, 6);
  }, [stockLevels, suppliers]);

  const workflowSummary = useMemo(() => {
    const pendingProducts = products.filter((product) => product.is_active !== true && product.is_active !== 1).length;
    const onboardingSuppliers = suppliers.filter((supplier) => {
      if (!supplier.created_at) return false;
      const createdAt = new Date(supplier.created_at);
      if (Number.isNaN(createdAt.getTime())) return false;
      return Date.now() - createdAt.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    const lowStock = stockLevels.filter((level) => {
      if (level.safety_stock == null) return false;
      return level.quantity <= level.safety_stock;
    }).length;

    return [
      {
        label: "Products awaiting activation",
        value: pendingProducts,
      },
      {
        label: "Suppliers added in last 30 days",
        value: onboardingSuppliers,
      },
      {
        label: "Low stock lines",
        value: lowStock,
      },
    ];
  }, [products, stockLevels, suppliers]);

  const recentActivity = useMemo(() => {
    const events: Array<{ title: string; detail: string; time: string }> = [];

    products.slice(0, 5).forEach((product) => {
      if (!product.updated_at && !product.product_type) return;
      events.push({
        title: product.name,
        detail: `Product ${product.product_type}`,
        time: formatRelativeDate(product.updated_at),
      });
    });

    suppliers.slice(0, 5).forEach((supplier) => {
      events.push({
        title: supplier.name,
        detail: supplier.contact_name ? `Contact ${supplier.contact_name}` : "Supplier record",
        time: formatRelativeDate(supplier.created_at),
      });
    });

    return events.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);
  }, [products, suppliers]);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Operations</h1>
        <p className="mt-2 text-foreground/60">
          Monitor catalog health, supplier performance, and inventory workflows.
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load operations data</CardTitle>
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
            <CardTitle>Operational Alerts</CardTitle>
            <CardDescription>
              Data-driven exceptions requiring attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {operationalAlerts.map((alert, index) => (
              <div
                key={`${alert.title}-${index}`}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {alert.title}
                  </p>
                  <p className="text-xs text-foreground/60">
                    {alert.description}
                  </p>
                </div>
                <Badge variant={alert.type === "Critical" ? "destructive" : "secondary"}>
                  {alert.type}
                </Badge>
              </div>
            ))}
            {!operationalAlerts.length && !isLoading ? (
              <p className="text-sm text-foreground/50">
                No current operational alerts.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Workflow Summary</CardTitle>
            <CardDescription>
              Key counts across catalog, supplier, and inventory flows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workflowSummary.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <Badge variant="outline">{item.value}</Badge>
              </div>
            ))}
            {!workflowSummary.length && !isLoading ? (
              <p className="text-sm text-foreground/50">
                Workflow metrics will appear once data is available.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Combined feed across catalog, supplier, and inventory updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {recentActivity.map((event, index) => (
            <div
              key={`${event.title}-${index}`}
              className="rounded-lg border border-border p-4"
            >
              <p className="text-sm font-semibold text-foreground">
                {event.title}
              </p>
              <p className="mt-2 text-xs text-foreground/60">{event.detail}</p>
              <p className="mt-2 text-xs text-foreground/40">{event.time}</p>
            </div>
          ))}
          {!recentActivity.length && !isLoading ? (
            <p className="text-sm text-foreground/50">
              Activity updates will display once operational data changes.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

