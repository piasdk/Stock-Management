"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, Users, Factory, ShoppingCart, FileText, 
  TrendingUp, AlertTriangle, Calendar, Truck, 
  BarChart3, Settings, ClipboardCheck, Archive,
  ArrowUpDown, MapPin, Tag, CheckSquare, XCircle,
  PackageCheck, PackageX, RefreshCw, ChevronRight,
  TrendingDown, Clock, DollarSign, Zap, Activity, ClipboardList, ShieldCheck,
  Mail, Shield, User
} from 'lucide-react';
import { api } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
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
import { Catalog } from "@/components/operations/catalog";
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
import { ShipOrders, ExpectedDeliveries, ReorderPointsSettings } from "@/components/operations/ShipOrders";
import StockAdjustments from "@/components/operations/StockAdjustments";
import { UnitsAndCategories } from "@/components/operations/UnitsAndCategories";
import { LocationsAndWarehouses } from "@/components/operations/LocationsAndWarehouses";

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

const CompanyAdminDashboard = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [overview, setOverview] = useState<TransactionsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState(DEFAULT_NAME);
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

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
      try {
        const response = await api.get<{
          company_id: number;
          name: string;
          city?: string;
          state?: string;
          country?: string;
        }>(`/companies/${companyId}`);

        if (cancelled) return;

        if (response.error) {
          // Handle 500 errors gracefully - don't spam console
          if (response.details?.status === 500) {
            // Silently use defaults for backend errors
            setCompanyName(DEFAULT_NAME);
            setLocationLabel(DEFAULT_LOCATION);
            return;
          }
          console.warn("Company lookup failed:", response.error);
          setCompanyName(DEFAULT_NAME);
          setLocationLabel(DEFAULT_LOCATION);
        }
      } catch (error) {
        if (cancelled) return;
        console.warn("Company fetch error:", error);
        setCompanyName(DEFAULT_NAME);
        setLocationLabel(DEFAULT_LOCATION);
      }
    }

    async function loadBranchLocation(companyId: number, branch: number) {
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
      } catch (error) {
        console.warn("Branch fetch error:", error);
        setLocationLabel(DEFAULT_LOCATION);
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
    
    const branchIdParam = branchId ? `?branchId=${branchId}` : "";
    const response = await api.get<TransactionsOverview>(
      `/transactions/overview${branchIdParam}`,
    );

    if (response.error) {
      // Handle 500 errors gracefully - don't show error for backend issues
      if (response.details?.status === 500) {
        // Silently fail for backend errors
        setOverview(null);
        setLoading(false);
        return;
      }
      setError(response.error);
      setLoading(false);
      return;
    }

    setOverview(response.data || null);
    setLoading(false);
  };

  // Sidebar navigation structure
  const navigation = [
    {
      title: 'Core',
      items: [
        { id: 'dashboard', label: 'Company Admin Dashboard', icon: BarChart3 },
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
      case 'products':
        return <Catalog />;
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
      case 'categories':
        return <UnitsAndCategories />;
      case 'locations':
        return <LocationsAndWarehouses />;
      case 'dashboard':
      default:
        // Mock data for Company Admin Dashboard
        const criticalAlerts = [
          { type: 'OUT OF STOCK', message: '5 items cannot fulfill orders', severity: 'critical' },
          { type: 'OVERDUE SHIPMENT', message: '3 shipments expected 2+ days ago', severity: 'critical' },
          { type: 'QUALITY FAILURE', message: '2 inspections failed - awaiting decision', severity: 'warning' },
          { type: 'PO APPROVAL', message: '1 purchase order needs release (RWF 82,000)', severity: 'warning' }
        ];

        const keyMetrics = [
          {
            title: 'Total Stock Value',
            value: 'RWF 2,450,000',
            change: '+5.4%',
            trend: 'up',
            subtitle: 'Stock Turnover: 4.2x (Target: 5.0x)',
            action: 'View Inventory'
          },
          {
            title: 'Orders to Process',
            value: '23 sales orders',
            change: 'RWF 1,850,000',
            trend: 'neutral',
            subtitle: 'Ready to Ship: 15 | Awaiting Stock: 8',
            action: 'Pick & Pack'
          },
          {
            title: 'Open Purchase Orders',
            value: '8 POs pending',
            change: 'RWF 420,000',
            trend: 'neutral',
            subtitle: 'Expected This Week: 3 deliveries',
            action: 'Receive Goods'
          },
          {
            title: 'Quality Alerts',
            value: '2 failed inspections',
            change: 'RWF 45,000',
            trend: 'down',
            subtitle: 'Damaged: 3 items | Returns: 5 items',
            action: 'Review Issues'
          }
        ];

        const outOfStockItems = [
          { sku: 'SKU-00123', name: 'Widget A Premium', orders: 3, status: 'PO submitted' },
          { sku: 'SKU-00567', name: 'Connector B Standard', orders: 1, status: 'Not ordered' },
          { sku: 'SKU-00892', name: 'Cable C Heavy Duty', orders: 2, status: 'Delivery tomorrow' },
          { sku: 'SKU-01245', name: 'Adapter D Universal', orders: 1, status: 'Not ordered' },
          { sku: 'SKU-01678', name: 'Mount E Adjustable', orders: 2, status: 'PO pending' }
        ];

        const stockByCategory = [
          { category: 'Raw Materials', items: 145, units: 2340, value: 'RWF 800K', turnover: '6.2x', status: 'healthy' },
          { category: 'Finished Goods', items: 89, units: 1560, value: 'RWF 1.2M', turnover: '3.8x', status: 'slow' },
          { category: 'Packaging Materials', items: 34, units: 5890, value: 'RWF 180K', turnover: '8.1x', status: 'healthy' },
          { category: 'WIP (Manufacturing)', items: 12, units: 450, value: 'RWF 270K', turnover: '5.5x', status: 'healthy' }
        ];

        const purchaseOrders = [
          { status: 'Awaiting Release', count: 1, value: 'RWF 82,000', action: 'Release Now' },
          { status: 'Approved, Not Received', count: 5, value: 'RWF 245,000', action: 'Track Deliveries' },
          { status: 'Partially Received', count: 2, value: 'RWF 95,000', action: 'Receive Remaining' },
          { status: 'Fully Received', count: 0, value: 'RWF 0', action: '-' }
        ];

        const pendingAdjustments = [
          { type: 'Write-off', description: 'Damaged goods - Warehouse A', qty: 12, value: 'RWF 3,200', age: '2 days' },
          { type: 'Damage', description: 'Water damage - Flood incident', qty: 25, value: 'RWF 18,000', age: '1 day' },
          { type: 'Shrinkage', description: 'Physical count variance', qty: 8, value: 'RWF 1,500', age: '5 days' },
          { type: 'Quality', description: 'Failed QC inspection', qty: 15, value: 'RWF 8,900', age: '1 day' },
          { type: 'Goods Var.', description: 'Received 95, ordered 100', qty: 5, value: 'RWF 4,200', age: '3 days' }
        ];

        const operationsKPIs = [
          { metric: 'Inventory Turnover', actual: '4.2x', target: '5.0x', status: 'below', trend: 'up' },
          { metric: 'Stock Accuracy', actual: '96.5%', target: '98%', status: 'below', trend: 'down' },
          { metric: 'Order Fill Rate', actual: '92%', target: '95%', status: 'below', trend: 'up' },
          { metric: 'On-Time Delivery', actual: '87%', target: '95%', status: 'poor', trend: 'down' },
          { metric: 'Avg Fulfillment Time', actual: '2.3 days', target: '2 days', status: 'below', trend: 'neutral' }
        ];

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
                  <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
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
                    5 items cannot fulfill orders
                  </span>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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

  // Show loading while waiting for mount or user
  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check authorization
  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorMessage error="You are not authorized to access the Company Admin Dashboard." />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 bg-slate-50 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Company Admin Dashboard</h2>
            <p className="text-sm text-gray-500">Monitor inventory, orders, and supply chain operations</p>
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={fetchOverview}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default CompanyAdminDashboard;

