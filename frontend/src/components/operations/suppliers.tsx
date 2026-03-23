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

interface Supplier {
  supplier_id: number;
  company_id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
  is_active: number | boolean;
  created_at: string | null;
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
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const TruckIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <rect width={7} height={13} x={1} y={3} />
    <polyline points="8 8 12 8 19 8 23 12 23 16 19 16" />
    <circle cx={5.5} cy={18.5} r={2.5} />
    <circle cx={18.5} cy={18.5} r={2.5} />
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

export function Suppliers() {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    notes: "",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = new URL("/api/suppliers", window.location.origin);
      if (companyId) {
        url.searchParams.set("companyId", String(companyId));
      }
      url.searchParams.set("isActive", "all"); // Show all suppliers (active and inactive)
      
      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch suppliers");
      }
      setSuppliers((Array.isArray(data) ? data : []) as Supplier[]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unexpected error loading suppliers",
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
      setFormError("Supplier name is required");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      company_id: companyId ?? null,
      name: formData.name,
      contact_name: formData.contact_name || null,
      phone: formData.phone || null,
      email: formData.email || null,
      address_line1: formData.address_line1 || null,
      address_line2: formData.address_line2 || null,
      city: formData.city || null,
      state: formData.state || null,
      postal_code: formData.postal_code || null,
      country: formData.country || null,
      notes: formData.notes || null,
      is_active: formData.is_active ? 1 : 0,
    };

    let response;
    if (editingSupplier) {
      response = await api.put(`/suppliers/${editingSupplier.supplier_id}`, payload);
    } else {
      response = await api.post("/suppliers", payload);
    }

    if (response.error) {
      setFormError(response.error);
      setIsSubmitting(false);
      return;
    }

    setFormSuccess(editingSupplier ? "Supplier updated successfully!" : "Supplier created successfully!");
    setFormData({
      name: "",
      contact_name: "",
      phone: "",
      email: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      notes: "",
      is_active: true,
    });
    setShowForm(false);
    setEditingSupplier(null);
    setIsSubmitting(false);
    loadSuppliers();
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_name: supplier.contact_name || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address_line1: supplier.address_line1 || "",
      address_line2: supplier.address_line2 || "",
      city: supplier.city || "",
      state: supplier.state || "",
      postal_code: supplier.postal_code || "",
      country: supplier.country || "",
      notes: supplier.notes || "",
      is_active: supplier.is_active === 1 || supplier.is_active === true,
    });
    setShowForm(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleDelete = async (supplierId: number) => {
    if (!confirm("Are you sure you want to delete this supplier?")) {
      return;
    }

    const response = await api.delete(`/suppliers/${supplierId}`);

    if (response.error) {
      setError(response.error);
      return;
    }

    loadSuppliers();
  };

  const handleToggleActive = async (supplier: Supplier) => {
    const newActiveStatus = supplier.is_active === 1 || supplier.is_active === true ? 0 : 1;
    const action = newActiveStatus === 1 ? "activate" : "deactivate";

    setIsSubmitting(true);
    setError(null);
    setFormSuccess(null);

    const payload = {
      name: supplier.name,
      contact_name: supplier.contact_name || null,
      phone: supplier.phone || null,
      email: supplier.email || null,
      address_line1: supplier.address_line1 || null,
      address_line2: supplier.address_line2 || null,
      city: supplier.city || null,
      state: supplier.state || null,
      postal_code: supplier.postal_code || null,
      country: supplier.country || null,
      notes: supplier.notes || null,
      is_active: newActiveStatus,
    };

    const response = await api.put(`/suppliers/${supplier.supplier_id}`, payload);

    if (response.error) {
      setError(`Failed to ${action} supplier: ${response.error}`);
      setIsSubmitting(false);
      return;
    }

    setFormSuccess(`Supplier ${action}d successfully!`);
    loadSuppliers();
    setTimeout(() => setFormSuccess(null), 3000);
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
    setFormData({
      name: "",
      contact_name: "",
      phone: "",
      email: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      notes: "",
      is_active: true,
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const totals = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((supplier) => supplier.is_active === true || supplier.is_active === 1).length;
    const onboarding = suppliers.filter((supplier) => {
      if (!supplier.created_at) return false;
      const createdAt = new Date(supplier.created_at);
      if (Number.isNaN(createdAt.getTime())) return false;
      const diffMs = Date.now() - createdAt.getTime();
      return diffMs <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    const withDocs = suppliers.filter((supplier) => supplier.notes && supplier.notes.trim().length > 0).length;
    const withContacts = suppliers.filter((supplier) => supplier.email || supplier.phone).length;

    return {
      total,
      active,
      onboarding,
      withDocs,
      withContacts,
      inactive: total - active,
    };
  }, [suppliers]);

  const metrics: Metric[] = useMemo(() => {
    const contactCoverage = totals.total
      ? Math.round((totals.withContacts / totals.total) * 100)
      : 0;

    return [
      {
        title: "Supplier Base",
        value: totals.total.toString(),
        change: `${totals.onboarding} added in 30 days`,
        isPositive: totals.total > 0,
        icon: UsersIcon,
        iconColor: "text-emerald-600",
        iconBgColor: "bg-emerald-100",
      },
      {
        title: "Active Vendors",
        value: totals.active.toString(),
        change: `${totals.inactive} inactive`,
        isPositive: totals.active >= totals.inactive,
        icon: ShieldIcon,
        iconColor: "text-purple-600",
        iconBgColor: "bg-purple-100",
      },
      {
        title: "Contact Coverage",
        value: `${contactCoverage}%`,
        change: `${totals.withContacts} suppliers with primary contact`,
        isPositive: contactCoverage >= 70,
        icon: TruckIcon,
        iconColor: "text-amber-600",
        iconBgColor: "bg-amber-100",
      },
      {
        title: "Documentation On File",
        value: totals.withDocs.toString(),
        change: `${totals.total ? Math.round((totals.withDocs / totals.total) * 100) : 0}% of suppliers`,
        isPositive: totals.withDocs >= totals.total * 0.5,
        icon: AlertIcon,
        iconColor: "text-orange-600",
        iconBgColor: "bg-orange-100",
      },
    ];
  }, [totals]);

  const supplierScorecards = useMemo(() => {
    return [...suppliers]
      .sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 5)
      .map((supplier) => {
        const contactScore = supplier.email || supplier.phone ? 100 : 60;
        const documentationScore = supplier.notes && supplier.notes.trim().length ? 95 : 70;
        const overallScore = Math.round((contactScore + documentationScore) / 2);

        return {
          supplier,
          score: overallScore,
          contact: supplier.contact_name || "No primary contact",
          contactScore: `${contactScore}% contact info`,
          documentationScore: `${documentationScore}% docs`,
        };
      });
  }, [suppliers]);

  const onboardingPipeline = useMemo(() => {
    return [...suppliers]
      .filter((supplier) => {
        if (!supplier.created_at) return false;
        const createdAt = new Date(supplier.created_at);
        if (Number.isNaN(createdAt.getTime())) return false;
        const diffMs = Date.now() - createdAt.getTime();
        return diffMs <= 60 * 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      })
      .map((supplier) => ({
        supplier,
        stage: supplier.notes && supplier.notes.trim().length > 0 ? "Documentation" : "Profile Setup",
      }));
  }, [suppliers]);

  const supplierSegments = useMemo(() => {
    const countryCounts = suppliers.reduce<Map<string, number>>((acc, supplier) => {
      const key = supplier.country?.toUpperCase() || "UNSPECIFIED";
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map());

    return Array.from(countryCounts.entries())
      .map(([country, count]) => ({
        title: country,
        owner: `${count} supplier${count === 1 ? "" : "s"}`,
        status: count >= 5 ? "Major base" : count >= 2 ? "Developing" : "Emerging",
        due: country === "UNSPECIFIED" ? "Needs update" : "",
      }))
      .slice(0, 6);
  }, [suppliers]);

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Suppliers</h1>
          <p className="mt-2 text-foreground/60">
            Track supplier performance, onboarding status, and risk indicators.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-emerald-500 hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
          onClick={() => {
            setShowForm(true);
            setEditingSupplier(null);
            setFormData({
              name: "",
              contact_name: "",
              phone: "",
              email: "",
              address_line1: "",
              address_line2: "",
              city: "",
              state: "",
              postal_code: "",
              country: "",
              notes: "",
              is_active: true,
            });
            setFormError(null);
            setFormSuccess(null);
          }}
          disabled={showForm}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {error && (
        <ErrorMessage
          error={error}
          title="Failed to Load Suppliers"
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
            <CardTitle>{editingSupplier ? "Edit Supplier" : "Create New Supplier"}</CardTitle>
            <CardDescription>
              {editingSupplier
                ? "Update the supplier details below"
                : "Fill in the details to create a new supplier"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Supplier Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., ABC Supplies Inc."
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
                    placeholder="supplier@example.com"
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
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  type="text"
                  placeholder="Street address"
                  value={formData.address_line1}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line1: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  type="text"
                  placeholder="Apartment, suite, etc."
                  value={formData.address_line2}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line2: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    type="text"
                    placeholder="ZIP/Postal code"
                    value={formData.postal_code}
                    onChange={(e) =>
                      setFormData({ ...formData, postal_code: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  type="text"
                  placeholder="Country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
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
                  placeholder="Additional notes about the supplier"
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
                  Mark supplier as active
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
                      {editingSupplier ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingSupplier ? (
                        <>
                          <Edit className="mr-2 h-4 w-4" />
                          Update Supplier
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Supplier
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Supplier Scorecards</CardTitle>
            <CardDescription>
              Summary of vendor readiness based on contact and documentation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {supplierScorecards.map((entry) => (
              <div
                key={entry.supplier.supplier_id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {entry.supplier.name}
                  </p>
                  <Badge variant="outline">Score {entry.score}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-foreground/60">
                  <div>
                    <p className="font-semibold text-foreground/70">Contact</p>
                    <p>{entry.contact}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground/70">Contact Info</p>
                    <p>{entry.contactScore}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground/70">Documentation</p>
                    <p>{entry.documentationScore}</p>
                  </div>
                </div>
              </div>
            ))}
            {!supplierScorecards.length && !isLoading ? (
              <p className="text-sm text-foreground/50">
                Supplier scorecards will appear once suppliers are added.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Onboarding Pipeline</CardTitle>
            <CardDescription>
              Keep new supplier onboarding on schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {onboardingPipeline.map(({ supplier, stage }) => (
              <div
                key={supplier.supplier_id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {supplier.name}
                  </p>
                  <p className="text-xs text-foreground/50">
                    Stage: {stage}
                  </p>
                </div>
                <div className="text-right text-xs text-foreground/50">
                  <p>{formatRelativeDate(supplier.created_at)}</p>
                  <p>{supplier.contact_name || "No contact"}</p>
                </div>
              </div>
            ))}
            {!onboardingPipeline.length && !isLoading ? (
              <p className="text-sm text-foreground/50">
                No suppliers currently in onboarding.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Supplier Footprint</CardTitle>
          <CardDescription>
            Geographic distribution of the supplier network.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {supplierSegments.map((segment) => (
            <div
              key={segment.title}
              className="rounded-lg border border-border p-4"
            >
              <p className="text-sm font-semibold text-foreground">
                {segment.title}
              </p>
              <p className="mt-2 text-xs text-foreground/60">
                {segment.owner}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-foreground/50">
                <span>{segment.status}</span>
                <span>{segment.due}</span>
              </div>
            </div>
          ))}
          {!supplierSegments.length && !isLoading ? (
            <p className="text-sm text-foreground/50">
              Supplier footprint will display once supplier records include country data.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <CardDescription>
            {suppliers.length === 0
              ? "No suppliers found. Click 'Add Supplier' to create your first supplier."
              : `Total: ${suppliers.length} supplier${suppliers.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
              <UsersIcon className="h-10 w-10 text-primary" />
              <p className="text-lg font-semibold text-foreground">No suppliers yet</p>
              <p className="text-sm">
                Create your first supplier to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.supplier_id}
                  className="flex items-start justify-between rounded-lg border border-border/60 bg-white/70 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-foreground">{supplier.name}</p>
                      {supplier.is_active === 1 || supplier.is_active === true ? (
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
                      {supplier.contact_name && (
                        <div>
                          <span className="font-medium">Contact:</span> {supplier.contact_name}
                        </div>
                      )}
                      {supplier.email && (
                        <div>
                          <span className="font-medium">Email:</span> {supplier.email}
                        </div>
                      )}
                      {supplier.phone && (
                        <div>
                          <span className="font-medium">Phone:</span> {supplier.phone}
                        </div>
                      )}
                      {supplier.city && (
                        <div>
                          <span className="font-medium">Location:</span> {supplier.city}
                          {supplier.country && `, ${supplier.country}`}
                        </div>
                      )}
                    </div>
                    {supplier.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {supplier.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(supplier)}
                      disabled={isSubmitting}
                      className={
                        supplier.is_active === 1 || supplier.is_active === true
                          ? "text-orange-600 hover:text-orange-700 hover:border-orange-300"
                          : "text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
                      }
                      title={supplier.is_active === 1 || supplier.is_active === true ? "Deactivate supplier" : "Activate supplier"}
                    >
                      {supplier.is_active === 1 || supplier.is_active === true ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(supplier)}
                      disabled={isSubmitting}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(supplier.supplier_id)}
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

