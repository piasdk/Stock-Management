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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Plus, CheckCircle, Edit, Trash2, Power, PowerOff } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";

type IconProps = React.SVGAttributes<SVGSVGElement>;

const UsersIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx={12} cy={7} r={4} />
  </svg>
);

const StarIcon = ({ className, ...props }: IconProps) => (
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
    <polygon points="12 2 15 8.5 22 9.3 17 14 18.3 21 12 17.7 5.7 21 7 14 2 9.3 9 8.5 12 2" />
  </svg>
);

const ActivityIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const TicketIcon = ({ className, ...props }: IconProps) => (
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
    <path d="M2 9h20" />
    <path d="M2 15h20" />
    <path d="M5 9v12" />
    <path d="M19 3v6" />
    <path d="M9 9v12" />
    <path d="M15 9v12" />
    <path d="M19 15v6" />
    <path d="M5 3v6" />
  </svg>
);

interface Customer {
  customer_id: number;
  company_id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  tax_id: string | null;
  notes: string | null;
  is_active: boolean | number;
  created_at: string | null;
}

interface Metric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ComponentType<IconProps>;
  iconColor?: string;
  iconBgColor?: string;
}

interface SegmentSummary {
  name: string;
  count: number;
  value: string;
}

const formatRelativeDate = (input?: string | null) => {
  if (!input) return "No date";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "No date";
  }
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

export function Customers() {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
    billing_address: "",
    shipping_address: "",
    tax_id: "",
    notes: "",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL("/api/customers", window.location.origin);
      if (companyId) {
        url.searchParams.set("companyId", String(companyId));
      }
      url.searchParams.set("isActive", "all"); // Show all customers (active and inactive)
      
      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch customers");
      }
      setCustomers((Array.isArray(data) ? data : []) as Customer[]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unexpected error loading customers",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.name.trim()) {
      setFormError("Customer name is required");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      company_id: companyId ?? null,
      name: formData.name,
      contact_name: formData.contact_name || null,
      phone: formData.phone || null,
      email: formData.email || null,
      billing_address: formData.billing_address || null,
      shipping_address: formData.shipping_address || null,
      tax_id: formData.tax_id || null,
      notes: formData.notes || null,
      is_active: formData.is_active ? 1 : 0,
    };

    let response;
    if (editingCustomer) {
      response = await api.put(`/customers/${editingCustomer.customer_id}`, payload);
    } else {
      response = await api.post("/customers", payload);
    }

    if (response.error) {
      setFormError(response.error);
      setIsSubmitting(false);
      return;
    }

    setFormSuccess(editingCustomer ? "Customer updated successfully!" : "Customer created successfully!");
    setFormData({
      name: "",
      contact_name: "",
      phone: "",
      email: "",
      billing_address: "",
      shipping_address: "",
      tax_id: "",
      notes: "",
      is_active: true,
    });
    setShowForm(false);
    setEditingCustomer(null);
    setIsSubmitting(false);
    loadCustomers();
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      contact_name: customer.contact_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      billing_address: customer.billing_address || "",
      shipping_address: customer.shipping_address || "",
      tax_id: customer.tax_id || "",
      notes: customer.notes || "",
      is_active: customer.is_active === 1 || customer.is_active === true,
    });
    setShowForm(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleDelete = async (customerId: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) {
      return;
    }

    const response = await api.delete(`/customers/${customerId}`);

    if (response.error) {
      setError(response.error);
      return;
    }

    loadCustomers();
  };

  const handleToggleActive = async (customer: Customer) => {
    const newActiveStatus = customer.is_active === 1 || customer.is_active === true ? 0 : 1;
    const action = newActiveStatus === 1 ? "activate" : "deactivate";

    setIsSubmitting(true);
    setError(null);
    setFormSuccess(null);

    const payload = {
      name: customer.name,
      contact_name: customer.contact_name || null,
      phone: customer.phone || null,
      email: customer.email || null,
      billing_address: customer.billing_address || null,
      shipping_address: customer.shipping_address || null,
      tax_id: customer.tax_id || null,
      notes: customer.notes || null,
      is_active: newActiveStatus,
    };

    const response = await api.put(`/customers/${customer.customer_id}`, payload);

    if (response.error) {
      setError(`Failed to ${action} customer: ${response.error}`);
      setIsSubmitting(false);
      return;
    }

    setFormSuccess(`Customer ${action}d successfully!`);
    loadCustomers();
    setTimeout(() => setFormSuccess(null), 3000);
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setFormData({
      name: "",
      contact_name: "",
      phone: "",
      email: "",
      billing_address: "",
      shipping_address: "",
      tax_id: "",
      notes: "",
      is_active: true,
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const totals = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.is_active === true || c.is_active === 1).length;
    const inactive = total - active;
    const newWithin30Days = customers.filter((c) => {
      if (!c.created_at) return false;
      const createdAt = new Date(c.created_at);
      if (Number.isNaN(createdAt.getTime())) return false;
      const diffMs = Date.now() - createdAt.getTime();
      return diffMs <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    const withTaxId = customers.filter((c) => c.tax_id && c.tax_id.trim().length > 0).length;

    return {
      total,
      active,
      inactive,
      newWithin30Days,
      withTaxId,
    };
  }, [customers]);

  const metrics: Metric[] = useMemo(() => {
    const avgTenure = (() => {
      if (!customers.length) return 0;
      const totalDays = customers.reduce((acc, customer) => {
        if (!customer.created_at) return acc;
        const createdAt = new Date(customer.created_at);
        if (Number.isNaN(createdAt.getTime())) return acc;
        const diffMs = Date.now() - createdAt.getTime();
        return acc + diffMs / (1000 * 60 * 60 * 24);
      }, 0);
      return Math.round(totalDays / customers.length);
    })();

    const healthyPercentage = totals.total
      ? Math.round((totals.active / totals.total) * 100)
      : 0;

    return [
      {
        title: "Total Customers",
        value: totals.total.toString(),
        change: `+${totals.newWithin30Days}`,
        isPositive: true,
        icon: UsersIcon,
        iconColor: "text-emerald-600",
        iconBgColor: "bg-emerald-100",
      },
      {
        title: "Active Customers",
        value: totals.active.toString(),
        change: `-${totals.inactive}`,
        isPositive: true,
        icon: StarIcon,
        iconColor: "text-purple-600",
        iconBgColor: "bg-purple-100",
      },
      {
        title: "Average Tenure",
        value: `${avgTenure} days`,
        change: healthyPercentage ? `${healthyPercentage}% active` : "0%",
        isPositive: healthyPercentage >= 50,
        icon: ActivityIcon,
        iconColor: "text-amber-600",
        iconBgColor: "bg-amber-100",
      },
      {
        title: "Tax ID On File",
        value: totals.withTaxId.toString(),
        change: `${totals.total ? Math.round((totals.withTaxId / totals.total) * 100) : 0}%`,
        isPositive: totals.withTaxId >= totals.inactive,
        icon: TicketIcon,
        iconColor: "text-orange-600",
        iconBgColor: "bg-orange-100",
      },
    ];
  }, [customers, totals]);

  const segmentSummary: SegmentSummary[] = useMemo(() => {
    if (!totals.total) return [];
    const total = totals.total;
    const percentage = (count: number) => `${Math.round((count / total) * 100)}%`;

    return [
      {
        name: "Active accounts",
        count: totals.active,
        value: percentage(totals.active),
      },
      {
        name: "Inactive accounts",
        count: totals.inactive,
        value: percentage(totals.inactive),
      },
      {
        name: "With tax ID",
        count: totals.withTaxId,
        value: percentage(totals.withTaxId),
      },
      {
        name: "Without tax ID",
        count: totals.total - totals.withTaxId,
        value: percentage(totals.total - totals.withTaxId),
      },
    ];
  }, [totals]);

  const recentCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [customers]);

  const activityFeed = useMemo(
    () =>
      recentCustomers.slice(0, 5).map((customer) => ({
        event: customer.name,
        detail: customer.contact_name
          ? `Primary contact: ${customer.contact_name}`
          : "Primary contact not recorded",
        time: formatRelativeDate(customer.created_at),
      })),
    [recentCustomers],
  );

  const accountHighlights = useMemo(
    () =>
      recentCustomers.slice(0, 6).map((customer) => ({
        title: customer.name,
        owner: customer.contact_name || "No contact",
        due: customer.email || "No email",
        status: customer.is_active === true || customer.is_active === 1 ? "Active" : "Inactive",
      })),
    [recentCustomers],
  );

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers</h1>
          <p className="mt-2 text-foreground/60">
            Understand customer engagement, account health, and upcoming touchpoints.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-emerald-500 hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
          onClick={() => {
            setShowForm(true);
            setEditingCustomer(null);
            setFormData({
              name: "",
              contact_name: "",
              phone: "",
              email: "",
              billing_address: "",
              shipping_address: "",
              tax_id: "",
              notes: "",
              is_active: true,
            });
            setFormError(null);
            setFormSuccess(null);
          }}
          disabled={showForm}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Customer
        </Button>
      </div>

      {error && (
        <ErrorMessage
          error={error}
          title="Failed to Load Customers"
          onDismiss={() => setError(null)}
        />
      )}
      {formSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {formSuccess}
          </div>
        </div>
      )}

      {showForm && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>{editingCustomer ? "Edit Customer" : "Create New Customer"}</CardTitle>
            <CardDescription>
              {editingCustomer
                ? "Update the customer details below"
                : "Fill in the details to create a new customer"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Customer Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., ABC Corporation"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input
                    id="contact_name"
                    type="text"
                    placeholder="e.g., John Doe"
                    value={formData.contact_name}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_name: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_address">Billing Address</Label>
                <textarea
                  id="billing_address"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Billing address"
                  value={formData.billing_address}
                  onChange={(e) =>
                    setFormData({ ...formData, billing_address: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_address">Shipping Address</Label>
                <textarea
                  id="shipping_address"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Shipping address"
                  value={formData.shipping_address}
                  onChange={(e) =>
                    setFormData({ ...formData, shipping_address: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID</Label>
                <Input
                  id="tax_id"
                  type="text"
                  placeholder="Tax identification number"
                  value={formData.tax_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_id: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Additional notes about the customer"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center gap-2 text-sm">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border border-input"
                  disabled={isSubmitting}
                />
                <Label htmlFor="is_active" className="text-sm font-normal">
                  Mark customer as active
                </Label>
              </div>

              {formError && (
                <ErrorMessage
                  error={formError}
                  title="Validation Error"
                  onDismiss={() => setFormError(null)}
                />
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="ghost"
                  className="text-emerald-500 font-semibold hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {editingCustomer ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingCustomer ? (
                        <>
                          <Edit className="mr-2 h-4 w-4" />
                          Update Customer
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Customer
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-300 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
            <CardTitle>Account Breakdown</CardTitle>
            <CardDescription>
              Snapshot of customer distribution across key attributes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {segmentSummary.map((segment) => (
              <div
                key={segment.name}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {segment.name}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {segment.count} accounts
                  </p>
                </div>
                <Badge variant="outline">{segment.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Recently Added</CardTitle>
            <CardDescription>
              Latest customer records with contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCustomers.slice(0, 5).map((customer) => (
              <div
                key={customer.customer_id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {customer.name}
                  </p>
                  <Badge variant="outline">
                    {customer.is_active === true || customer.is_active === 1
                      ? "Active"
                      : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-foreground/60">
                  <span>{customer.email || "Email not provided"}</span>
                  <span>{formatRelativeDate(customer.created_at)}</span>
                </div>
                <p className="mt-2 text-xs text-foreground/50">
                  {customer.contact_name || "No primary contact"}
                </p>
              </div>
            ))}
            {!recentCustomers.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No customers found.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Customer Activity</CardTitle>
            <CardDescription>
              Updates and engagement across the customer lifecycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityFeed.map((item) => (
              <div
                key={`${item.event}-${item.time}`}
                className="rounded-lg border border-border px-4 py-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  {item.event}
                </p>
                <p className="mt-1 text-xs text-foreground/60">{item.detail}</p>
                <p className="mt-2 text-xs text-foreground/40">{item.time}</p>
              </div>
            ))}
            {!activityFeed.length && !isLoading ? (
              <p className="text-sm text-foreground/50">No recent activity recorded.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Account Highlights</CardTitle>
          <CardDescription>
            Key customer contacts and communication details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {accountHighlights.map((entry) => (
            <div
              key={entry.title}
              className="rounded-lg border border-border p-4"
            >
              <p className="text-sm font-semibold text-foreground">
                {entry.title}
              </p>
              <p className="mt-2 text-xs text-foreground/60">
                Contact: {entry.owner}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-foreground/50">
                <span>Email: {entry.due}</span>
                <span>{entry.status}</span>
              </div>
            </div>
          ))}
          {!accountHighlights.length && !isLoading ? (
            <p className="text-sm text-foreground/50">
              No customer highlights available yet.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            {customers.length === 0
              ? "No customers found. Click 'Add New Customer' to create your first customer."
              : `Total: ${customers.length} customer${customers.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <UsersIcon className="h-10 w-10 text-primary" />
              <p className="text-lg font-semibold text-foreground">No customers yet</p>
              <p className="text-sm">
                Create your first customer to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.customer_id}
                  className="flex items-start justify-between rounded-lg border border-border/60 bg-white/70 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-foreground">{customer.name}</p>
                      {customer.is_active === 1 || customer.is_active === true ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                      {customer.contact_name && (
                        <div>
                          <span className="font-medium">Contact:</span> {customer.contact_name}
                        </div>
                      )}
                      {customer.email && (
                        <div>
                          <span className="font-medium">Email:</span> {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div>
                          <span className="font-medium">Phone:</span> {customer.phone}
                        </div>
                      )}
                      {customer.tax_id && (
                        <div>
                          <span className="font-medium">Tax ID:</span> {customer.tax_id}
                        </div>
                      )}
                    </div>
                    {(customer.billing_address || customer.shipping_address) && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {customer.billing_address && (
                          <div>
                            <span className="font-medium">Billing:</span> {customer.billing_address}
                          </div>
                        )}
                        {customer.shipping_address && (
                          <div>
                            <span className="font-medium">Shipping:</span> {customer.shipping_address}
                          </div>
                        )}
                      </div>
                    )}
                    {customer.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {customer.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(customer)}
                      disabled={isSubmitting}
                      className={
                        customer.is_active === 1 || customer.is_active === true
                          ? "text-orange-600 hover:text-orange-700 hover:border-orange-300"
                          : "text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
                      }
                      title={customer.is_active === 1 || customer.is_active === true ? "Deactivate customer" : "Activate customer"}
                    >
                      {customer.is_active === 1 || customer.is_active === true ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                      disabled={isSubmitting}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(customer.customer_id)}
                      disabled={isSubmitting}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

