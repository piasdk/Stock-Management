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
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Plus, CheckCircle, ShoppingBag, DollarSign, Clock, Edit } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { convertCurrency, formatCurrencyAmount, formatCurrency as formatCurrencyUtil } from "@/lib/currency";
import SmartSalesOrderForm from "./SmartSalesOrderForm";

interface SalesOrder {
  so_id: number;
  so_number: string;
  order_date: string | null;
  status: string;
  total_amount: number | null;
  currency: string | null;
  notes: string | null;
  created_at: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
}

export function Sales() {
  const { user } = useAuthStore();
  const companyId = user?.company_id;

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [companyCurrency, setCompanyCurrency] = useState<string>("RWF");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
    loadCompanyCurrency();
  }, [companyId]);

  useEffect(() => {
    if (formSuccess) {
      // Reload sales after successful creation
      loadSales();
      // Clear success message after 3 seconds
      const timer = setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [formSuccess]);

  const loadCompanyCurrency = async () => {
    if (!companyId) {
      setCompanyCurrency("RWF");
      return;
    }
    
    try {
      const response = await api.get<any>(`/companies/${companyId}`);
      if (response.data && response.data.currency) {
        setCompanyCurrency(response.data.currency);
      }
    } catch (err) {
      console.error("Failed to load company currency:", err);
      setCompanyCurrency("RWF"); // Default fallback
    }
  };

  const loadSales = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<SalesOrder[]>("/sales");
      if (response.error) {
        throw new Error(response.error);
      }
      setSalesOrders((Array.isArray(response.data) ? response.data : []) as SalesOrder[]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unexpected error loading sales",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setFormSuccess("Sales order created successfully!");
    setShowForm(false);
    loadSales();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingOrderId(null);
  };

  const handleEditOrder = (orderId: number) => {
    setEditingOrderId(orderId);
    setShowForm(true);
    setFormSuccess(null);
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const displayCurrency = companyCurrency === "FRW" ? "RWF" : companyCurrency;
    
    const totalSales = salesOrders.reduce((sum, order) => {
      if (!order.total_amount || !order.currency) return sum;
      return sum + convertCurrency(
        Number(order.total_amount),
        order.currency,
        companyCurrency
      );
    }, 0);

    const confirmedOrders = salesOrders.filter(
      (order) => order.status === "confirmed"
    ).length;

    const completedOrders = salesOrders.filter(
      (order) => order.status === "completed"
    ).length;

    const draftOrders = salesOrders.filter(
      (order) => order.status === "draft"
    ).length;

    return [
      {
        title: "Total Sales",
        value: formatCurrencyUtil(totalSales, displayCurrency),
        change: undefined,
        isPositive: true,
        icon: DollarSign,
        iconColor: "text-emerald-500",
        iconBgColor: "bg-emerald-50",
      },
      {
        title: "Confirmed Orders",
        value: String(confirmedOrders),
        change: undefined,
        isPositive: true,
        icon: ShoppingBag,
        iconColor: "text-blue-500",
        iconBgColor: "bg-blue-50",
      },
      {
        title: "Completed Orders",
        value: String(completedOrders),
        change: undefined,
        isPositive: true,
        icon: CheckCircle,
        iconColor: "text-green-500",
        iconBgColor: "bg-green-50",
      },
      {
        title: "Draft Orders",
        value: String(draftOrders),
        change: undefined,
        isPositive: false,
        icon: Clock,
        iconColor: "text-yellow-500",
        iconBgColor: "bg-yellow-50",
      },
    ];
  }, [salesOrders, companyCurrency]);

  // Status summary
  const statusSummary = useMemo(() => {
    const statusGroups = salesOrders.reduce((acc, order) => {
      const status = order.status || "unknown";
      if (!acc[status]) {
        acc[status] = {
          status,
          count: 0,
          totalsByCurrency: [] as Array<{ currency: string; amount: number }>,
        };
      }
      acc[status].count++;
      if (order.total_amount && order.currency) {
        const existing = acc[status].totalsByCurrency.find(
          (t) => t.currency === order.currency
        );
        if (existing) {
          existing.amount += Number(order.total_amount);
        } else {
          acc[status].totalsByCurrency.push({
            currency: order.currency,
            amount: Number(order.total_amount),
          });
        }
      }
      return acc;
    }, {} as Record<string, { status: string; count: number; totalsByCurrency: Array<{ currency: string; amount: number }> }>);

    return Object.values(statusGroups);
  }, [salesOrders]);

  // Recent orders (last 10)
  const recentOrders = useMemo(() => {
    return [...salesOrders]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.order_date || 0).getTime();
        const dateB = new Date(b.created_at || b.order_date || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [salesOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sales Orders
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Manage sales orders, customer transactions, and fulfillment.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-emerald-500 hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
          onClick={() => {
            setEditingOrderId(null);
            setShowForm(true);
            setFormSuccess(null);
          }}
          disabled={showForm}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Sales Order
        </Button>
      </div>

      {error && (
        <ErrorMessage
          error={error}
          title="Failed to Load Sales"
          onDismiss={() => setError(null)}
        />
      )}
      {formSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {formSuccess ?? 'Success'}
          </div>
        </div>
      )}

      {showForm && (
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {editingOrderId ? 'Edit Sales Order' : 'Create New Sales Order'}
                </CardTitle>
                <CardDescription>
                  {editingOrderId 
                    ? 'Update the details of this sales order'
                    : 'Fill in the details to create a new sales order'}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:text-red-300"
                onClick={handleFormCancel}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <SmartSalesOrderForm 
              orderId={editingOrderId}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card className="border-border bg-card">
          <CardContent className="py-10 text-center text-sm text-foreground/60">
            <LoadingSpinner size="lg" />
            <p className="mt-4">Loading sales metrics...</p>
          </CardContent>
        </Card>
      ) : (
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
      )}

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Status Summary</CardTitle>
            <CardDescription>
              Sales orders grouped by status.
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
                    {entry.count} orders
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {(() => {
                    const displayCurrency = companyCurrency === "FRW" ? "RWF" : companyCurrency;
                    const totalInBaseCurrency = entry.totalsByCurrency.reduce(
                      (sum, t) => sum + convertCurrency(t.amount, t.currency, companyCurrency),
                      0
                    );
                    return (
                      <Badge variant="default" className="text-sm">
                        {formatCurrencyUtil(totalInBaseCurrency, displayCurrency)}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            ))}
            {!statusSummary.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No sales orders recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            Latest sales orders and customer transactions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentOrders.map((order) => (
            <div
              key={order.so_id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {order.so_number}
                  </p>
                  <p className="text-xs text-foreground/60 mt-1">
                    {order.customer_name || "No customer"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {(() => {
                      const displayCurrency = companyCurrency === "FRW" ? "RWF" : companyCurrency;
                      const convertedAmount = convertCurrency(
                        Number(order.total_amount || 0),
                        order.currency || "USD",
                        companyCurrency
                      );
                      return formatCurrencyUtil(convertedAmount, displayCurrency);
                    })()}
                  </p>
                  <Badge
                    variant={
                      order.status === "completed"
                        ? "default"
                        : order.status === "confirmed"
                        ? "secondary"
                        : "outline"
                    }
                    className="mt-1"
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-foreground/60">
                  <span>
                    {order.order_date
                      ? `Order Date: ${new Date(order.order_date).toLocaleDateString()}`
                      : "No order date"}
                  </span>
                  <span className="ml-4">
                    {order.customer_phone || order.customer_email || ""}
                  </span>
                </div>
                {order.status === 'draft' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditOrder(order.so_id)}
                    className="h-8"
                  >
                    <Edit className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!recentOrders.length && !isLoading ? (
            <p className="text-sm text-foreground/50">No sales orders to display.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default Sales;
