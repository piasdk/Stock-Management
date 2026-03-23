"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Package, Users, Factory, ShoppingCart, FileText, 
  TrendingUp, AlertTriangle, Calendar, Truck, 
  BarChart3, Settings, ClipboardCheck, Archive,
  ArrowUpDown, MapPin, Tag, CheckSquare, XCircle,
  PackageCheck, PackageX, RefreshCw, ChevronRight,
  TrendingDown, Clock, DollarSign, Zap, Activity, ClipboardList, ShieldCheck,
  Mail, Shield, User, LogOut
} from 'lucide-react';
import { api } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { clearAuth as clearAuthLib } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import dynamic from 'next/dynamic';

// Dynamically import Products page component to avoid SSR issues
const ProductsPage = dynamic(() => import('@/app/(dashboard)/products/page'), {
  ssr: false,
  loading: () => <LoadingSpinner size="lg" />
});
import { Suppliers } from "@/components/operations/suppliers";
import { Customers } from "@/components/operations/customers";
import { Purchases } from "@/components/transactions/purchases";
import { Sales } from "@/components/transactions/sales";
import PickAndPack from "@/components/operations/PickAndPack";
import { Invitations } from "@/components/operations/Invitations";
import { Roles } from "@/components/operations/Roles";
import { Profile } from "@/components/operations/Profile";
import AllInventory from "@/components/operations/AllInventory";
import StockByLocation from "@/components/operations/StockByLocation";
import StockMovements from "@/components/operations/StockMovements";
import ReceiveGoods from "@/components/operations/ReceiveGoods";
import PhysicalCounts from "@/components/operations/PhysicalCounts";
import InventoryReports from "@/components/operations/InventoryReports";

// Use dynamic imports to avoid SSR issues with large component file
const ShipOrders = dynamic(
  () => import("@/components/operations/ShipOrders").then((mod) => ({ default: mod.ShipOrders })),
  { 
    ssr: false,
    loading: () => <LoadingSpinner size="lg" />
  }
);

const ExpectedDeliveries = dynamic(
  () => import("@/components/operations/ShipOrders").then((mod) => ({ default: mod.ExpectedDeliveries })),
  { 
    ssr: false,
    loading: () => <LoadingSpinner size="lg" />
  }
);

const ReorderPointsSettings = dynamic(
  () => import("@/components/operations/ShipOrders").then((mod) => ({ default: mod.ReorderPointsSettings })),
  { 
    ssr: false,
    loading: () => <LoadingSpinner size="lg" />
  }
);
import StockAdjustments from "@/components/operations/StockAdjustments";
import { UnitsAndCategories } from "@/components/operations/UnitsAndCategories";
import { LocationsAndWarehouses } from "@/components/operations/LocationsAndWarehouses";

// Dynamically import CustomerReturnsPage to avoid SSR issues
const CustomerReturnsPage = dynamic(() => import('@/app/(dashboard)/returns/page'), {
  ssr: false,
  loading: () => <LoadingSpinner size="lg" />
});

type MetricItem = {
  current: number;
  previous: number | null;
};

type PipelineStages = Record<string, number>;

interface TransactionsOverview {
  metrics: {
    openPurchaseOrders: MetricItem;
    openSalesOrders: MetricItem;
    activeBatches: MetricItem;
    pendingApprovals: MetricItem;
  };
  pipeline: {
    purchasing: PipelineStages;
    sales: PipelineStages;
    manufacturing: PipelineStages;
  };
  financialSnapshot?: {
    monthlySpend: number;
    salesRevenue: number;
    outstandingInvoices: number;
    billsDue7Days: number;
    currency?: string;
  };
  recentActivity: Array<{
    description: string;
    created_at: string;
  }>;
  approvals: Array<{
    title: string;
    type: string;
    owner: string;
    age: string;
    severity: "Low" | "Medium" | "High" | string;
  }>;
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const formatMoney = (value: number, currency = "USD") =>
  `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`;

const quickActions = [
  {
    label: "Review purchase approvals",
    description: "Approve or reject pending purchase orders",
    target: ROUTES.PURCHASES,
  },
  {
    label: "Monitor sales pipeline",
    description: "Track open sales orders and reservations",
    target: ROUTES.SALES,
  },
  {
    label: "Inspect branch roles",
    description: "Check which staff are assigned to each role",
    target: "/branch/roles",
  },
];

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatStageLabel(stage: string) {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 1) return "just now";
  if (Math.abs(diffMinutes) < 60)
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24)
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
}

function getSeverityVariant(severity: string) {
  switch (severity.toLowerCase()) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

const DEFAULT_NAME = "Business OS";
const DEFAULT_LOCATION = "Location unavailable";

const formatLocation = (
  city?: string | null,
  state?: string | null,
  country?: string | null,
) => {
  return [city, state, country].filter(Boolean).join(", ");
};

const ManagerDashboard = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, clearAuth } = useAuthStore();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [overview, setOverview] = useState<TransactionsOverview | null>(null);
  const [managerDashboardData, setManagerDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState(DEFAULT_NAME);
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION);
  const [companyDataLoading, setCompanyDataLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
    
    // Check for query parameters on initial mount
    const sectionParam = searchParams?.get('section');
    if (sectionParam) {
      setActiveSection(sectionParam);
    }
    
    // Ensure loading state is true during initial mount
    setLoading(true);
  }, []);

  // Handle query parameters for navigation
  // Read from URL directly and also listen to URL changes
  useEffect(() => {
    if (!mounted) return;
    
    const checkUrlParams = () => {
      if (typeof window === 'undefined') return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const sectionParam = urlParams.get('section');
      const addParam = urlParams.get('add');
      
      if (sectionParam) {
        // Always update activeSection when section param changes
        setActiveSection(sectionParam);
        
        // If add=true and section=products, store it in sessionStorage
        // so Products component can read it (since we'll clear URL params)
        if (addParam === 'true' && sectionParam === 'products') {
          sessionStorage.setItem('manager-dashboard-add-product', 'true');
        }
        
        // If edit=product_id and section=products, store it in sessionStorage
        const editParam = urlParams.get('edit');
        if (editParam && sectionParam === 'products') {
          sessionStorage.setItem('edit-product-id', editParam);
        }
        
        // Clear only the section param from URL (keep add/edit params if present for Products component)
        // Use setTimeout to ensure state update happens first
        // Use longer delay to ensure ProductsPage has time to read the params
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('section');
            // Keep 'add' and 'edit' params if they exist so ProductsPage can read them
            window.history.replaceState({}, '', url.toString());
          }
        }, 300);
      }
    };
    
    // Check immediately
    checkUrlParams();
    
    // Also listen to popstate events (back/forward navigation)
    // and check periodically for URL changes (in case router.push doesn't trigger effect)
    const handlePopState = () => {
      setTimeout(checkUrlParams, 50);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Also check on a small delay in case router.push updates URL but doesn't trigger effect
    const timeoutId = setTimeout(checkUrlParams, 200);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(timeoutId);
    };
  }, [mounted, searchParams]);

  // Clear URL params when leaving products section
  useEffect(() => {
    if (!mounted) return;
    
    if (activeSection !== 'products' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('add');
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.toString());
      sessionStorage.removeItem('edit-product-id');
      sessionStorage.removeItem('manager-dashboard-add-product');
    }
  }, [mounted, activeSection]);

  const isAuthorized =
    mounted && user ? (
      user?.is_super_admin || user?.is_company_admin || user?.is_branch_admin || user?.role_code === "manager"
    ) : false;

  const branchId = useMemo(() => {
    if (!mounted || !user) return null;
    
    // Super admin and company admin see all branches (no filter)
    // Super admin sees all branches across all companies
    // Company admin sees all branches within their company
    if (user.is_super_admin || (user.is_company_admin && !user.is_branch_admin)) {
      return null;
    }
    
    // Branch admin and manager see only their branch
    if (user.branch_id === null || user.branch_id === undefined) return null;
    const parsed = Number(user.branch_id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [mounted, user, user?.branch_id, user?.is_super_admin, user?.is_company_admin, user?.is_branch_admin]);

  // Load company/branch name
  useEffect(() => {
    if (!mounted || !user) return; // Wait for mount and user
    
    let cancelled = false;

    async function loadCompanyName(companyId: number) {
      setCompanyDataLoading(true);
      try {
        const response = await api.get<{
          company_id: number;
          name: string;
          city?: string;
          state?: string;
          country?: string;
        }>(`/companies/${companyId}`);

        if (cancelled) {
          setCompanyDataLoading(false);
          return;
        }

        if (response.error) {
          // Handle 500 errors gracefully - don't spam console
          if (response.details?.status === 500) {
            // Silently use defaults for backend errors
            setCompanyName(DEFAULT_NAME);
            setLocationLabel(DEFAULT_LOCATION);
            setCompanyDataLoading(false);
            return;
          }
          console.warn("Company lookup failed:", response.error);
          setCompanyName(DEFAULT_NAME);
          setLocationLabel(DEFAULT_LOCATION);
          setCompanyDataLoading(false);
        } else if (response.data) {
          setCompanyName(response.data.name || DEFAULT_NAME);
          setCompanyDataLoading(false);
        } else {
          setCompanyDataLoading(false);
        }
      } catch (error) {
        if (cancelled) {
          setCompanyDataLoading(false);
          return;
        }
        console.warn("Company fetch error:", error);
        setCompanyName(DEFAULT_NAME);
        setLocationLabel(DEFAULT_LOCATION);
        setCompanyDataLoading(false);
      }
    }

    async function loadBranchLocation(companyId: number, branch: number) {
      setCompanyDataLoading(true);
      try {
        const response = await api.get<
          Array<{
            branch_id: number;
            name: string;
            city?: string;
            state?: string;
            country?: string;
          }>
        >(`/companies/${companyId}/branches`);

        if (!response.data) {
          if (response.error) {
            // Handle 500 errors gracefully
            if (response.details?.status === 500) {
              setLocationLabel(DEFAULT_LOCATION);
              return;
            }
            console.warn("Branch lookup failed:", response.error);
          }
          setLocationLabel(DEFAULT_LOCATION);
          setCompanyDataLoading(false);
          return;
        }

        const match = response.data.find((item) => item.branch_id === branch);
        if (match) {
          setCompanyName(match.name || DEFAULT_NAME);
          const branchLocation = formatLocation(
            match.city,
            match.state,
            match.country,
          );
          setLocationLabel(branchLocation || DEFAULT_LOCATION);
        } else {
          setLocationLabel(DEFAULT_LOCATION);
        }
        setCompanyDataLoading(false);
      } catch (error) {
        console.warn("Branch fetch error:", error);
        setLocationLabel(DEFAULT_LOCATION);
        setCompanyDataLoading(false);
      }
    }

    if (user?.company_id) {
      // For super admin and company admin: show company name, all branches
      // For branch admin and manager: show branch-specific info
      if (user.is_super_admin || (user.is_company_admin && !user.is_branch_admin)) {
        // Super admin or company admin - just show company name
        loadCompanyName(user.company_id);
      } else if (branchId) {
        // Branch admin or manager - show branch-specific info
        loadCompanyName(user.company_id);
        loadBranchLocation(user.company_id, branchId);
      } else {
        // Fallback
        loadCompanyName(user.company_id);
      }
    } else {
      setCompanyName(DEFAULT_NAME);
      setLocationLabel(DEFAULT_LOCATION);
    }

    return () => {
      cancelled = true;
    };
  }, [mounted, user, user?.company_id, branchId]);

  useEffect(() => {
    if (!mounted || !user || !isAuthorized) return; // Wait for mount, user, and authorization
    if (activeSection === 'dashboard') {
      fetchOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, mounted, user, isAuthorized]);

  const fetchOverview = async () => {
    if (!mounted || !user) return; // Safety check
    
    setLoading(true);
    setError(null);
    
    // Fetch both transactions overview and manager dashboard data
    const branchIdParam = branchId ? `?branchId=${branchId}` : "";
    const [transactionsResponse, managerResponse] = await Promise.all([
      api.get<TransactionsOverview>(`/transactions/overview${branchIdParam}`),
      api.get<any>(`/dashboard/manager-overview${branchIdParam}`),
    ]);

    if (transactionsResponse.error && transactionsResponse.details?.status !== 500) {
      setError(transactionsResponse.error);
    }

    // Store manager dashboard data separately
    if (managerResponse.data && !managerResponse.error) {
      setManagerDashboardData(managerResponse.data);
    }

    setOverview(transactionsResponse.data || null);
    setLoading(false);
  };

  // Sidebar navigation structure
  const navigation = [
    {
      title: 'Core',
      items: [
        { id: 'dashboard', label: 'Manager Dashboard', icon: BarChart3 },
        { id: 'invitations', label: 'Invitations', icon: Mail },
        { id: 'roles', label: 'Roles', icon: Shield },
        { id: 'profile', label: 'Profile', icon: User }
      ]
    },
    {
      title: 'Catalog Management',
      items: [
        { id: 'products', label: 'Products', icon: Package },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'suppliers', label: 'Suppliers', icon: Factory }
      ]
    },
    {
      title: 'Inventory Management',
      items: [
        { id: 'inventory', label: 'All Inventory', icon: Archive },
        { id: 'stock-locations', label: 'Stock by Location', icon: MapPin },
        { id: 'stock-movements', label: 'Stock Movements', icon: ArrowUpDown },
        { id: 'inventory-reports', label: 'Inventory Reports', icon: FileText }
      ]
    },
    {
      title: 'Sales & Fulfillment',
      items: [
        { id: 'sales', label: 'Sales Orders', icon: ShoppingCart },
        { id: 'pick-pack', label: 'Pick & Pack', icon: PackageCheck },
        { id: 'ship-orders', label: 'Ship Orders', icon: Truck },
        { id: 'returns', label: 'Customer Returns', icon: RefreshCw }
      ]
    },
    {
      title: 'Purchasing & Receiving',
      items: [
        { id: 'purchases', label: 'Purchase Orders', icon: FileText },
        { id: 'receive-goods', label: 'Receive Goods', icon: PackageCheck },
        { id: 'expected-deliveries', label: 'Expected Deliveries', icon: Calendar }
      ]
    },
    {
      title: 'Stock Adjustments & Counts',
      items: [
        { id: 'stock-adjustments', label: 'Stock Adjustments', icon: ClipboardCheck },
        { id: 'physical-counts', label: 'Physical Counts', icon: ClipboardCheck }
      ]
    },
    {
      title: 'Settings',
      items: [
        { id: 'reorder-points', label: 'Reorder Points', icon: Settings },
        { id: 'categories', label: 'Units & Categories', icon: Tag },
        { id: 'locations', label: 'Locations & Warehouses', icon: MapPin },
        { id: 'alerts', label: 'Alert Thresholds', icon: AlertTriangle }
      ]
    }
  ];

  const controlCards = useMemo(() => {
    const metrics = overview?.metrics ?? {
      openPurchaseOrders: { current: 0, previous: null },
      openSalesOrders: { current: 0, previous: null },
      activeBatches: { current: 0, previous: null },
      pendingApprovals: { current: 0, previous: null },
    };

    const financialSnapshot = overview?.financialSnapshot;
    const snapshotCurrency = financialSnapshot?.currency || "USD";

    return [
      {
        key: "openPurchaseOrders",
        title: "Open Purchase Orders",
        value: formatMoney(metrics.openPurchaseOrders.current, snapshotCurrency),
        description: "Awaiting procurement",
      },
      {
        key: "openSalesOrders",
        title: "Open Sales Orders",
        value: formatMoney(metrics.openSalesOrders.current, snapshotCurrency),
        description: "Awaiting fulfillment",
      },
      {
        key: "activeBatches",
        title: "Active Batches",
        value: formatMoney(metrics.activeBatches.current, snapshotCurrency),
        description: "In-transit or awaiting allocation",
      },
      {
        key: "pendingApprovals",
        title: "Pending Approvals",
        value: formatMoney(metrics.pendingApprovals.current, snapshotCurrency),
        description: "Needing your sign-off",
      },
    ];
  }, [overview]);

  const pipelineGroups = useMemo(() => {
    const pipeline = overview?.pipeline ?? {
      purchasing: {},
      sales: {},
      manufacturing: {},
    };

    return Object.entries(pipeline);
  }, [overview]);

  const financialSnapshot = overview?.financialSnapshot;
  const snapshotCurrency = financialSnapshot?.currency || "USD";
  const approvals = overview?.approvals ?? [];
  const recentActivity = overview?.recentActivity ?? [];

  const renderContent = () => {
    switch (activeSection) {
      case 'products': {
        // Always show ProductsPage for consistent format
        // ProductsPage handles both viewing and adding/editing products
        return <ProductsPage />;
      }
      case 'suppliers':
        return <Suppliers />;
      case 'customers':
        return <Customers />;
      case 'purchases':
        return <Purchases />;
      case 'sales':
        return <Sales />;
      case 'pick-pack':
        return <PickAndPack />;
      case 'invitations':
        return <Invitations />;
      case 'roles':
        return <Roles />;
      case 'profile':
        return <Profile />;
      case 'inventory':
        return <AllInventory />;
      case 'stock-locations':
        return <StockByLocation />;
      case 'stock-movements':
        return <StockMovements />;
      case 'receive-goods':
        return <ReceiveGoods />;
      case 'expected-deliveries':
        return <ExpectedDeliveries />;
      case 'physical-counts':
        return <PhysicalCounts />;
      case 'inventory-reports':
        return <InventoryReports />;
      case 'ship-orders':
        return <ShipOrders />;
      case 'reorder-points':
        return <ReorderPointsSettings />;
      case 'stock-adjustments':
        return <StockAdjustments />;
      case 'returns':
        return <CustomerReturnsPage />;
      case 'categories':
        return <UnitsAndCategories />;
      case 'locations':
        return <LocationsAndWarehouses />;
      case 'dashboard':
      default:
        // Use real data from API, fallback to empty arrays if not loaded
        const criticalAlerts = managerDashboardData?.criticalAlerts || [];
        const keyMetrics = managerDashboardData?.keyMetrics || [];
        const outOfStockItems = managerDashboardData?.outOfStockItems || [];
        const stockByCategory = managerDashboardData?.stockByCategory || [];
        const purchaseOrders = managerDashboardData?.purchaseOrdersStatus || [];
        const pendingAdjustments = managerDashboardData?.pendingAdjustments || [];
        const operationsKPIs = managerDashboardData?.performanceMetrics || [];

        return (
          <div className="p-6 space-y-6">
            {/* Critical Alerts */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">URGENT ACTION REQUIRED</h3>
                  <div className="space-y-1">
                    {criticalAlerts.map((alert, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-red-800">
                          <span className="font-medium">{alert.type}:</span> {alert.message}
                        </span>
                        <ChevronRight className="w-4 h-4 text-red-600" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {keyMetrics.map((metric, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                    {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                    {metric.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                  <p className="text-sm text-gray-600 mb-3">{metric.change}</p>
                  <p className="text-xs text-gray-500 mb-3">{metric.subtitle}</p>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Navigate to appropriate section based on action
                      if (metric.action === 'View Inventory') {
                        setActiveSection('inventory');
                      } else if (metric.action === 'Pick & Pack') {
                        setActiveSection('pick-pack');
                      } else if (metric.action === 'Receive Goods') {
                        setActiveSection('receive-goods');
                      } else if (metric.action === 'Review Issues') {
                        setActiveSection('stock-adjustments');
                      }
                    }}
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {metric.action} →
                  </button>
                </div>
              ))}
            </div>

            {/* Out of Stock Alert */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-gray-900">Out of Stock (CRITICAL)</h3>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                    {outOfStockItems.length} item{outOfStockItems.length !== 1 ? 's' : ''} cannot fulfill orders
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveSection('inventory');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Item Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Orders Affected</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Reorder Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {outOfStockItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.orders} orders</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status.includes('Not ordered') 
                              ? 'bg-red-100 text-red-700'
                              : item.status.includes('tomorrow')
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button className="text-blue-600 hover:text-blue-700 font-medium">
                            Create PO
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stock by Category */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Stock by Category</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Items</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Units</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Turnover</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stockByCategory.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cat.items}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cat.units.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{cat.value}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{cat.turnover}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            cat.status === 'healthy' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {cat.status === 'healthy' ? '✓ Healthy' : '⚠ Slow'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Orders Pipeline */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Purchase Orders Status</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                {purchaseOrders.map((po, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">{po.status}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{po.count}</p>
                    <p className="text-sm text-gray-600 mb-3">{po.value}</p>
                    {po.action !== '-' && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Navigate to appropriate section based on action
                          if (po.action === 'Release Now' || po.action === 'Track Deliveries' || po.action === 'Receive Remaining') {
                            setActiveSection('purchases');
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {po.action}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Adjustments */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Stock Adjustments - Pending Your Approval</h3>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    ✓ Approve Selected
                  </button>
                  <button className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                    ✗ Reject Selected
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 w-12">
                        <input type="checkbox" className="rounded" />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Age</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingAdjustments.map((adj, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{adj.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{adj.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{adj.qty}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{adj.value}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{adj.age}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button className="text-green-600 hover:text-green-700">✓</button>
                            <button className="text-red-600 hover:text-red-700">✗</button>
                            <button className="text-blue-600 hover:text-blue-700">👁</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operations KPIs */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Performance Metrics (This Month)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Metric</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Actual</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Target</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {operationsKPIs.map((kpi, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{kpi.metric}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{kpi.actual}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{kpi.target}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            kpi.status === 'poor' 
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {kpi.status === 'poor' ? '🔴 Poor' : '⚠️ Below'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                          {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                          {kpi.trend === 'neutral' && <span className="text-gray-400">→</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions - Common Tasks</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Receive Purchase Order', icon: PackageCheck },
                  { label: 'Pick Sales Order', icon: PackageCheck },
                  { label: 'Record Stock Adjustment', icon: ClipboardCheck },
                  { label: 'Schedule Physical Count', icon: Calendar },
                  { label: 'View Items to Reorder', icon: AlertTriangle },
                  { label: 'Process Customer Return', icon: RefreshCw },
                  { label: 'Create Purchase Order', icon: FileText },
                  { label: 'Ship Orders', icon: Truck }
                ].map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={idx}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
    }
  };

  // Show loading while waiting for mount, user, authorization, or initial data load
  const isInitialLoad = !mounted || !user || loading || !isAuthorized;
  
  if (isInitialLoad) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          {companyDataLoading ? (
            <>
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
              <p className="text-sm text-gray-500">{locationLabel}</p>
            </>
          )}
        </div>

        <nav className="p-2">
          {navigation.map((section, idx) => (
            <div key={idx} className="mb-4">
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeSection === item.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {activeSection === 'dashboard' ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">Manager Dashboard</h2>
                  <p className="text-sm text-gray-500">Monitor inventory, orders, and supply chain operations</p>
                </>
              ) : (
                <h2 className="text-2xl font-bold text-gray-900">
                  {navigation.flatMap(s => s.items).find(item => item.id === activeSection)?.label || 'Section'}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeSection === 'dashboard' && (
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={fetchOverview}
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Data
                </button>
              )}
              {/* Sign Out Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearAuth();
                  clearAuthLib();
                  if (typeof window !== 'undefined') {
                    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
                    window.location.replace(ROUTES.LOGIN);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Sign Out"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default ManagerDashboard;

