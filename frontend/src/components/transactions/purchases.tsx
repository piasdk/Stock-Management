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
import { Plus, CheckCircle, Eye, Edit, X, CheckCircle2, XCircle, Package, MoreVertical, Calendar, Building2, Phone, Mail, FileText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { convertCurrency, formatCurrencyAmount, formatCurrency as formatCurrencyUtil } from "@/lib/currency";
import { ROLE_CODES } from "@/lib/constants";
import { Modal } from "@/components/common/Modal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

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

const CheckCircleIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ClockIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
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
    <circle cx={12} cy={12} r={10} />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

interface PurchaseOrder {
  po_id: number;
  po_number: string;
  expected_date: string | null;
  status: string;
  total_amount: number | null;
  currency: string | null;
  notes: string | null;
  created_at: string;
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  supplier_email: string | null;
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


interface Supplier {
  supplier_id: number;
  name: string;
}

interface Product {
  product_id: number;
  name: string;
  product_type: string;
  category_id: number | null;
  category_name?: string;
  sku: string | null;
  unit_id: number | null;
  unit_name?: string;
  unit_short_code?: string;
}

interface Category {
  category_id: number;
  name: string;
}

interface Unit {
  unit_id: number;
  name: string;
  short_code: string;
}

export function Purchases() {
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  
  // Determine user role
  const isAccountant = user?.role_code === ROLE_CODES.ACCOUNTANT;
  const isManager = !isAccountant && (user?.role_code === ROLE_CODES.MANAGER || user?.is_branch_admin);
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [companyCurrency, setCompanyCurrency] = useState<string>("RWF");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: "",
    expected_date: "",
    status: "draft",
    total_amount: "",
    currency: "USD",
    notes: "",
    product_id: "",
    product_name: "",
    product_type: "",
    category_id: "",
    category_name: "",
    quantity: "",
    unit_id: "",
    unit_name: "",
    unit_short_code: "",
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  
  // Modal states
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: "default" | "destructive";
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
    loadProducts();
    loadCategories();
    loadUnits();
    loadCompanyCurrency();
  }, [companyId]);

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

  const loadPurchases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<PurchaseOrder[]>("/purchases");
      if (response.error) {
        throw new Error(response.error);
      }
      setPurchaseOrders((Array.isArray(response.data) ? response.data : []) as PurchaseOrder[]);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unexpected error loading purchases",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const url = new URL("/api/suppliers", window.location.origin);
      if (companyId) {
        url.searchParams.set("companyId", String(companyId));
      }
      url.searchParams.set("isActive", "all");
      const response = await fetch(url.toString());
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setSuppliers(data.filter((s: any) => s.is_active === 1 || s.is_active === true));
      }
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get<any[]>("/catalog/products");
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data.filter((p: any) => p.is_active === 1 || p.is_active === true));
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  const loadCategories = async () => {
    try {
      const url = new URL("/api/catalog/categories", window.location.origin);
      if (companyId) {
        url.searchParams.set("companyId", String(companyId));
      }
      const response = await fetch(url.toString());
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadUnits = async () => {
    try {
      const url = `/units${companyId ? `?companyId=${companyId}` : ""}`;
      const response = await api.get<any>(url);
      if (response.data) {
        // Handle both array and object responses
        const unitsData = Array.isArray(response.data) ? response.data : (response.data.units || []);
        setUnits(unitsData);
      } else if (response.error) {
        console.error("Failed to load units:", response.error);
      }
    } catch (err) {
      console.error("Failed to load units:", err);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.product_id === Number(productId));
    if (product) {
      setSelectedProduct(product);
      const category = categories.find((c) => c.category_id === product.category_id);
      const unit = units.find((u) => u.unit_id === product.unit_id);
      setFormData({
        ...formData,
        product_id: productId,
        product_name: product.name,
        product_type: product.product_type || "",
        category_id: product.category_id ? String(product.category_id) : "",
        category_name: category?.name || "",
        unit_id: product.unit_id ? String(product.unit_id) : "",
        unit_name: unit?.name || "",
        unit_short_code: unit?.short_code || "",
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        ...formData,
        product_id: "",
        product_name: "",
        product_type: "",
        category_id: "",
        category_name: "",
        unit_id: "",
        unit_name: "",
        unit_short_code: "",
      });
    }
  };

  const handleUnitChange = (unitId: string) => {
    const unit = units.find((u) => u.unit_id === Number(unitId));
    if (unit) {
      setFormData({
        ...formData,
        unit_id: unitId,
        unit_name: unit.name,
        unit_short_code: unit.short_code,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    setIsSubmitting(true);

    const payload = {
      company_id: companyId ?? null,
      supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
      expected_date: formData.expected_date || null,
      status: formData.status || "draft",
      total_amount: formData.total_amount ? Number(formData.total_amount) : null,
      currency: formData.currency || "USD",
      notes: formData.notes || null,
      product_id: formData.product_id ? Number(formData.product_id) : null,
      product_name: formData.product_name || null,
      product_type: formData.product_type || null,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      category_name: formData.category_name || null,
      quantity: formData.quantity ? Number(formData.quantity) : null,
      unit_id: formData.unit_id ? Number(formData.unit_id) : null,
      unit_name: formData.unit_name || null,
      unit_short_code: formData.unit_short_code || null,
    };

    const response = await api.post("/purchases", payload);

    if (response.error) {
      setFormError(response.error);
      setIsSubmitting(false);
      return;
    }

    setFormSuccess("Purchase order created successfully!");
    setFormData({
      supplier_id: "",
      expected_date: "",
      status: "draft",
      total_amount: "",
      currency: "RWF",
      notes: "",
      product_id: "",
      product_name: "",
      product_type: "",
      category_id: "",
      category_name: "",
      quantity: "",
      unit_id: "",
      unit_name: "",
      unit_short_code: "",
    });
    setSelectedProduct(null);
    setShowForm(false);
    setIsSubmitting(false);
    loadPurchases();
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      supplier_id: "",
      expected_date: "",
      status: "draft",
      total_amount: "",
      currency: "USD",
      notes: "",
      product_id: "",
      product_name: "",
      product_type: "",
      category_id: "",
      category_name: "",
      quantity: "",
      unit_id: "",
      unit_name: "",
      unit_short_code: "",
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const purchasesTotals = useMemo(() => {
    const total = purchaseOrders.length;
    
    // Convert all amounts to company's base currency
    let totalSpendInBaseCurrency = 0;
    const spendByCurrency = new Map<string, number>();
    
    purchaseOrders.forEach((order) => {
      const orderCurrency = order.currency || "USD";
      const orderAmount = Number(order.total_amount || 0);
      
      // Add to currency breakdown
      const currentTotal = spendByCurrency.get(orderCurrency) || 0;
      spendByCurrency.set(orderCurrency, currentTotal + orderAmount);
      
      // Convert to base currency and add to total
      if (orderAmount > 0) {
        const convertedAmount = convertCurrency(
          orderAmount,
          orderCurrency,
          companyCurrency
        );
        totalSpendInBaseCurrency += convertedAmount;
      }
    });
    
    const spendBreakdown = Array.from(spendByCurrency.entries()).map(([currency, amount]) => ({
      currency,
      amount,
      convertedAmount: convertCurrency(amount, currency, companyCurrency),
    }));
    
    const currencies = Array.from(spendByCurrency.keys());
    const isMultiCurrency = currencies.length > 1;
    
    const pending = purchaseOrders.filter(
      (order) => order.status === "draft" || order.status === "submitted",
    ).length;
    const received = purchaseOrders.filter(
      (order) => order.status === "received",
    ).length;
    const partiallyReceived = purchaseOrders.filter(
      (order) => order.status === "partially_received",
    ).length;

    return {
      total,
      totalSpendInBaseCurrency,
      spendBreakdown,
      currencies,
      isMultiCurrency,
      baseCurrency: companyCurrency,
      pending,
      received,
      partiallyReceived,
    };
  }, [purchaseOrders, companyCurrency]);

  const metrics: Metric[] = useMemo(() => {
    const displayCurrency = purchasesTotals.baseCurrency === "FRW" ? "RWF" : purchasesTotals.baseCurrency;
    const spendValue = formatCurrencyUtil(purchasesTotals.totalSpendInBaseCurrency, displayCurrency);
    const spendChange = `${purchasesTotals.received} received`;

    return [
      {
        title: "Total Orders",
        value: purchasesTotals.total.toString(),
        change: `${purchasesTotals.received} received`,
        isPositive: purchasesTotals.total > 0,
        icon: ClipboardIcon,
        iconColor: "text-emerald-600",
        iconBgColor: "bg-emerald-100",
      },
      {
        title: "Total Spend",
        value: spendValue,
        change: spendChange,
        isPositive: purchasesTotals.totalSpendInBaseCurrency >= 0,
        icon: DollarIcon,
        iconColor: "text-purple-600",
        iconBgColor: "bg-purple-100",
      },
      {
        title: "Pending Orders",
        value: purchasesTotals.pending.toString(),
        change: `${purchasesTotals.total ? Math.round((purchasesTotals.pending / purchasesTotals.total) * 100) : 0}% of total`,
        isPositive: purchasesTotals.pending === 0,
        icon: ClockIcon,
        iconColor: "text-amber-600",
        iconBgColor: "bg-amber-100",
      },
      {
        title: "Partially Received",
        value: purchasesTotals.partiallyReceived.toString(),
        change: `${purchasesTotals.total ? Math.round((purchasesTotals.partiallyReceived / purchasesTotals.total) * 100) : 0}% of total`,
        isPositive: purchasesTotals.partiallyReceived > 0,
        icon: CheckCircleIcon,
        iconColor: "text-orange-600",
        iconBgColor: "bg-orange-100",
      },
    ];
  }, [purchasesTotals, purchasesTotals.baseCurrency]);

  const recentOrders = useMemo(() => {
    return [...purchaseOrders]
      .sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 10);
  }, [purchaseOrders]);

  const statusSummary = useMemo(() => {
    const byStatus = new Map<string, { count: number; totalsByCurrency: Map<string, number> }>();
    purchaseOrders.forEach((order) => {
      const status = order.status || "unknown";
      const entry = byStatus.get(status) ?? { count: 0, totalsByCurrency: new Map<string, number>() };
      entry.count += 1;
      const currency = order.currency || "USD";
      const currentTotal = entry.totalsByCurrency.get(currency) || 0;
      entry.totalsByCurrency.set(currency, currentTotal + Number(order.total_amount || 0));
      byStatus.set(status, entry);
    });
    return Array.from(byStatus.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      totalsByCurrency: Array.from(data.totalsByCurrency.entries()).map(([currency, amount]) => ({
        currency,
        amount,
      })),
    }));
  }, [purchaseOrders, companyCurrency]);

  // Get status color
  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'partially_received':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'received':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    const labels: Record<string, string> = {
      'draft': 'Draft',
      'submitted': 'Submitted',
      'approved': 'Approved',
      'partially_received': 'Partially Received',
      'received': 'Received',
      'rejected': 'Rejected',
      'cancelled': 'Cancelled'
    };
    return labels[statusLower] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Get allowed actions based on role and status
  const getAllowedActions = (status: string): Array<'view' | 'edit' | 'submit' | 'approve' | 'reject' | 'cancel' | 'receive'> => {
    const statusLower = status?.toLowerCase() || '';
    
    if (isManager) {
      switch (statusLower) {
        case 'draft':
          return ['view', 'edit', 'submit', 'cancel'];
        case 'submitted':
          return ['view'];
        case 'approved':
          return ['view', 'receive'];
        case 'partially_received':
          return ['view', 'receive'];
        case 'received':
        case 'rejected':
        case 'cancelled':
          return ['view'];
        default:
          return ['view'];
      }
    } else if (isAccountant) {
      switch (statusLower) {
        case 'draft':
          return ['view', 'approve', 'reject', 'cancel'];
        case 'submitted':
          return ['view', 'approve', 'reject', 'cancel'];
        case 'approved':
        case 'partially_received':
        case 'received':
        case 'rejected':
        case 'cancelled':
          return ['view'];
        default:
          return ['view'];
      }
    }
    
    // Default: view only for other roles
    return ['view'];
  };

  // Action handlers
  const handleViewOrder = (order: PurchaseOrder) => {
    setViewingOrder(order);
  };

  const handleEditOrder = (order: PurchaseOrder) => {
    console.log('Edit purchase order:', order.po_id);
    // TODO: Implement edit purchase order functionality
  };

  const showConfirmDialog = (
    title: string,
    message: string,
    confirmText: string,
    variant: "default" | "destructive",
    onConfirm: () => void
  ) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      confirmText,
      variant,
      onConfirm: () => {
        setConfirmDialog(null);
        onConfirm();
      },
    });
  };

  const handleSubmitOrder = (order: PurchaseOrder) => {
    showConfirmDialog(
      "Submit Purchase Order",
      `Are you sure you want to submit purchase order ${order.po_number}? This action cannot be undone.`,
      "Submit",
      "default",
      async () => {
        try {
          const response = await fetch(`/api/purchases/${order.po_id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'submitted' }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error || 'Failed to submit purchase order');
          } else {
            setFormSuccess(`Purchase order ${order.po_number} submitted successfully!`);
            loadPurchases();
            setTimeout(() => setFormSuccess(null), 3000);
          }
        } catch (err) {
          console.error('Error submitting purchase order:', err);
          setError('Failed to submit purchase order. Please try again.');
        }
      }
    );
  };

  const handleApproveOrder = (order: PurchaseOrder) => {
    showConfirmDialog(
      "Approve Purchase Order",
      `Are you sure you want to approve purchase order ${order.po_number}? This will allow the order to proceed to fulfillment.`,
      "Approve",
      "default",
      async () => {
        try {
          const response = await fetch(`/api/purchases/${order.po_id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'approved' }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error || 'Failed to approve purchase order');
          } else {
            setFormSuccess(`Purchase order ${order.po_number} approved successfully!`);
            loadPurchases();
            setTimeout(() => setFormSuccess(null), 3000);
          }
        } catch (err) {
          console.error('Error approving purchase order:', err);
          setError('Failed to approve purchase order. Please try again.');
        }
      }
    );
  };

  const handleRejectOrder = (order: PurchaseOrder) => {
    showConfirmDialog(
      "Reject Purchase Order",
      `Are you sure you want to reject purchase order ${order.po_number}? This action cannot be undone.`,
      "Reject",
      "destructive",
      async () => {
        try {
          const response = await fetch(`/api/purchases/${order.po_id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'rejected' }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error || 'Failed to reject purchase order');
          } else {
            setFormSuccess(`Purchase order ${order.po_number} rejected.`);
            loadPurchases();
            setTimeout(() => setFormSuccess(null), 3000);
          }
        } catch (err) {
          console.error('Error rejecting purchase order:', err);
          setError('Failed to reject purchase order. Please try again.');
        }
      }
    );
  };

  const handleCancelOrder = (order: PurchaseOrder) => {
    showConfirmDialog(
      "Cancel Purchase Order",
      `Are you sure you want to cancel purchase order ${order.po_number}? This action cannot be undone.`,
      "Cancel Order",
      "destructive",
      async () => {
        try {
          const response = await fetch(`/api/purchases/${order.po_id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'cancelled' }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error || 'Failed to cancel purchase order');
          } else {
            setFormSuccess(`Purchase order ${order.po_number} cancelled.`);
            loadPurchases();
            setTimeout(() => setFormSuccess(null), 3000);
          }
        } catch (err) {
          console.error('Error cancelling purchase order:', err);
          setError('Failed to cancel purchase order. Please try again.');
        }
      }
    );
  };

  const handleReceiveGoods = (order: PurchaseOrder) => {
    console.log('Receive goods for purchase order:', order.po_id);
    // TODO: Navigate to receive goods page or open modal
  };

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchases</h1>
          <p className="mt-2 text-foreground/60">
            Manage purchase orders, supplier transactions, and procurement.
          </p>
        </div>
        {user?.role_code !== ROLE_CODES.ACCOUNTANT && (
          <Button
            type="button"
            variant="ghost"
            className="text-emerald-500 hover:text-emerald-200 border-transparent hover:bg-transparent shadow-none cursor-pointer transition-colors duration-150 ease-in-out"
            onClick={() => {
              setShowForm(true);
              setFormData({
                supplier_id: "",
                expected_date: "",
                status: "draft",
                total_amount: "",
                currency: "USD",
                notes: "",
                product_id: "",
                product_name: "",
                product_type: "",
                category_id: "",
                category_name: "",
                quantity: "",
                unit_id: "",
                unit_name: "",
                unit_short_code: "",
              });
              setSelectedProduct(null);
              setFormError(null);
              setFormSuccess(null);
            }}
            disabled={showForm}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        )}
      </div>

      {error && (
        <ErrorMessage
          error={error}
          title="Failed to Load Purchases"
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
            <CardTitle>Create New Purchase Order</CardTitle>
            <CardDescription>
              Fill in the details to create a new purchase order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supplier_id">Supplier</Label>
                  <select
                    id="supplier_id"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.supplier_id}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_id: e.target.value })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.supplier_id} value={supplier.supplier_id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_date">Expected Date</Label>
                  <Input
                    id="expected_date"
                    type="date"
                    value={formData.expected_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_date: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-4">Product Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="product_id">Product *</Label>
                    <select
                      id="product_id"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.product_id}
                      onChange={(e) => handleProductChange(e.target.value)}
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.product_id} value={product.product_id}>
                          {product.name} {product.sku ? `(${product.sku})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity: e.target.value })
                        }
                        disabled={isSubmitting || !selectedProduct}
                        required
                        className="flex-1"
                      />
                      <select
                        id="unit_id"
                        className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.unit_id}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        disabled={isSubmitting || !selectedProduct}
                        required
                      >
                        <option value="">Unit</option>
                        {units.map((unit) => (
                          <option key={unit.unit_id} value={unit.unit_id}>
                            {unit.short_code || unit.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                {selectedProduct && (
                  <div className="grid gap-4 md:grid-cols-3 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="product_name">Product Name</Label>
                      <Input
                        id="product_name"
                        type="text"
                        value={formData.product_name}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product_type">Product Type</Label>
                      <Input
                        id="product_type"
                        type="text"
                        value={formData.product_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category_name">Category</Label>
                      <Input
                        id="category_name"
                        type="text"
                        value={formData.category_name || "N/A"}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="NGN">NGN</option>
                    <option value="FRW">FRW</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.total_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, total_amount: e.target.value })
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
                  placeholder="Additional notes about the purchase order"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  disabled={isSubmitting}
                />
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Purchase Order
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

      {isLoading ? (
        <Card className="border-border bg-card">
          <CardContent className="py-10 text-center text-sm text-foreground/60">
            Loading purchase metrics...
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
              Purchase orders grouped by status.
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
              <p className="text-sm text-foreground/50">No purchase orders recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            Manage purchase orders and supplier transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : !purchaseOrders.length ? (
            <p className="text-sm text-foreground/50 text-center py-12">No purchase orders to display.</p>
          ) : (
            <div className="overflow-x-auto">
              {/* Mobile: Card Layout */}
              <div className="block md:hidden space-y-3">
                {purchaseOrders.map((order) => {
                  const allowedActions = getAllowedActions(order.status);
                  const displayCurrency = companyCurrency === "FRW" ? "RWF" : companyCurrency;
                  const convertedAmount = convertCurrency(
                    Number(order.total_amount || 0),
                    order.currency || "USD",
                    companyCurrency
                  );
                  return (
                    <div key={order.po_id} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{order.po_number}</p>
                          <p className="text-xs text-foreground/60 mt-1">{order.supplier_name || "No supplier"}</p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-foreground/60">Amount</p>
                          <p className="font-semibold text-foreground">
                            {formatCurrencyUtil(convertedAmount, displayCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-foreground/60">Expected</p>
                          <p className="text-foreground">
                            {order.expected_date
                              ? new Date(order.expected_date).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                            {allowedActions.includes('view') && (
                              <button
                                onClick={() => handleViewOrder(order)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                            {allowedActions.includes('edit') && (
                              <button
                                onClick={() => handleEditOrder(order)}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                            )}
                            {allowedActions.includes('submit') && (
                              <button
                                onClick={() => handleSubmitOrder(order)}
                                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                title="Submit"
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            {allowedActions.includes('approve') && (
                              <button
                                onClick={() => handleApproveOrder(order)}
                                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            {allowedActions.includes('reject') && (
                              <button
                                onClick={() => handleRejectOrder(order)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                            {allowedActions.includes('cancel') && (
                              <button
                                onClick={() => handleCancelOrder(order)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                            {allowedActions.includes('receive') && (
                              <button
                                onClick={() => handleReceiveGoods(order)}
                                className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                                title="Receive Goods"
                              >
                                <Package className="w-4 h-4 text-purple-600" />
                              </button>
                            )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">PO ID</th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">Supplier</th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">Amount</th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">Status</th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">Expected</th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">Total</th>
                      <th className="px-4 xl:px-6 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {purchaseOrders.map((order) => {
                      const allowedActions = getAllowedActions(order.status);
                      const displayCurrency = companyCurrency === "FRW" ? "RWF" : companyCurrency;
                      const convertedAmount = convertCurrency(
                        Number(order.total_amount || 0),
                        order.currency || "USD",
                        companyCurrency
                      );
                      return (
                        <tr key={order.po_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {order.po_number}
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-foreground/80">
                            {order.supplier_name || "No supplier"}
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                            {formatCurrencyUtil(convertedAmount, displayCurrency)}
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-foreground/80">
                            {order.expected_date
                              ? new Date(order.expected_date).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                            {formatCurrencyUtil(convertedAmount, displayCurrency)}
                          </td>
                          <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-1">
                            {allowedActions.includes('view') && (
                              <button
                                onClick={() => handleViewOrder(order)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                            {allowedActions.includes('edit') && (
                              <button
                                onClick={() => handleEditOrder(order)}
                                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                            )}
                            {allowedActions.includes('submit') && (
                              <button
                                onClick={() => handleSubmitOrder(order)}
                                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                title="Submit"
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            {allowedActions.includes('approve') && (
                              <button
                                onClick={() => handleApproveOrder(order)}
                                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            {allowedActions.includes('reject') && (
                              <button
                                onClick={() => handleRejectOrder(order)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                            {allowedActions.includes('cancel') && (
                              <button
                                onClick={() => handleCancelOrder(order)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                            {allowedActions.includes('receive') && (
                              <button
                                onClick={() => handleReceiveGoods(order)}
                                className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                                title="Receive Goods"
                              >
                                <Package className="w-4 h-4 text-purple-600" />
                              </button>
                            )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Purchase Order Modal */}
      {viewingOrder && (
        <Modal
          open={!!viewingOrder}
          onClose={() => setViewingOrder(null)}
          title={`Purchase Order: ${viewingOrder.po_number}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(viewingOrder.status)}>
                {getStatusLabel(viewingOrder.status)}
              </Badge>
              <span className="text-sm text-foreground/60">
                Created: {new Date(viewingOrder.created_at).toLocaleString()}
              </span>
            </div>

            {/* Supplier Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Supplier Information
                </h3>
                <div className="space-y-2 pl-6">
                  <div>
                    <p className="text-xs text-foreground/60">Supplier Name</p>
                    <p className="text-sm font-medium text-foreground">
                      {viewingOrder.supplier_name || "N/A"}
                    </p>
                  </div>
                  {viewingOrder.supplier_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-foreground/40" />
                      <p className="text-sm text-foreground/80">{viewingOrder.supplier_phone}</p>
                    </div>
                  )}
                  {viewingOrder.supplier_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-foreground/40" />
                      <p className="text-sm text-foreground/80">{viewingOrder.supplier_email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Order Details
                </h3>
                <div className="space-y-2 pl-6">
                  <div>
                    <p className="text-xs text-foreground/60">Expected Date</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {viewingOrder.expected_date
                        ? new Date(viewingOrder.expected_date).toLocaleDateString()
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60">Currency</p>
                    <p className="text-sm font-medium text-foreground">
                      {viewingOrder.currency || "USD"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">Financial Summary</h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/60">Total Amount</span>
                  <span className="text-lg font-bold text-foreground">
                    {(() => {
                      const displayCurrency = companyCurrency === "FRW" ? "RWF" : companyCurrency;
                      const convertedAmount = convertCurrency(
                        Number(viewingOrder.total_amount || 0),
                        viewingOrder.currency || "USD",
                        companyCurrency
                      );
                      return formatCurrencyUtil(convertedAmount, displayCurrency);
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {viewingOrder.notes && (
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground/80 mb-2">Notes</h3>
                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-3">
                  {viewingOrder.notes}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText="Cancel"
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

