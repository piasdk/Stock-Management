"use client";

import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
  User,
  BookOpen,
  LogOut,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  X,
  Save
} from "lucide-react";
import { api } from "@/lib/api";
import { ROUTES, ROLE_CODES } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { clearAuth as clearAuthLib } from "@/lib/auth";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import { getDashboardRoute, shouldSeeDashboard } from "@/lib/dashboard-routes";
import { Purchases } from "@/components/transactions/purchases";
import { Reports } from "@/components/insights/reports";
import { Profile } from "@/components/operations/Profile";
import InvoicesPage from "@/app/(dashboard)/accounting/invoices/page";
import BillsPage from "@/app/(dashboard)/accounting/bills/page";
import PaymentsPage from "@/app/(dashboard)/accounting/payments/page";

interface FiscalPeriodStatus {
  fiscal_period_id: number;
  period_name: string;
  status: string;
  start_date: string;
  end_date: string;
  closesInDays: number | null;
}

interface CashTrendPoint {
  date: string;
  value: number;
}

interface ReceivablesSnapshot {
  totalOutstanding: number;
  overdueAmount: number;
  aging: Record<"current" | "1_30" | "31_60" | "61_90" | "90_plus", number>;
  dso: number | null;
}

interface PayablesSnapshot {
  totalOutstanding: number;
  overdueBills: number;
  dueThisWeek: number;
  dueNext30Days: number;
  dpo: number | null;
}

interface TaxSummary {
  totalLiability: number;
  salesTax: number;
  vatPayable: number;
  upcomingDeadlines: number;
  collectionStatus: {
    collected: number;
    paid: number;
  };
}

interface PeriodReadiness {
  completionPercent: number;
  outstandingItems: {
    unreconciledTransactions: number;
    unapprovedJournalEntries: number;
    inventoryVerified: boolean;
    missingReceipts: number;
  };
}

interface PerformanceSnapshot {
  revenue: { mtd: number; ytd: number };
  grossProfitMargin: number | null;
  netProfitMTD: number | null;
  inventory: {
    totalValue: number;
    slowMovingValue: number;
    pendingWriteOffs: number;
  };
}

interface ActionItems {
  approvals: {
    expenseReports: { count: number; amount: number };
    purchaseOrders: { count: number; amount: number };
    supplierPayments: { count: number; amount: number };
    destroyedItems: { count: number; amount: number };
    adjustmentJournals: number;
  };
  reconciliation: Array<{ accountId: number; name: string; unmatched: number }>;
  missingDocumentation: {
    expenseItems: number;
    supplierBills: number;
  };
  exceptions: {
    failedPayments: number;
  };
}

interface QuickStats {
  customersWithBalance: number;
  suppliersWithBalance: number;
  openPurchaseOrders: number;
  openSalesOrders: number;
  unpostedTransactions: number;
  lastBackupAt: string | null;
  exchangeRatesUpdatedAt: string | null;
  auditAlerts: number;
}

interface RecentActivityItem {
  type: string;
  description: string;
  amount?: number;
  event_date: string;
}

interface ExpenseReport {
  expense_report_id: number;
  report_number: string;
  title: string;
  status: string;
  total_amount: number;
  currency: string;
  submitted_at: string | null;
  submitted_by_name?: string | null;
}

interface AccountantOverview {
  currency: string;
  fiscalPeriod: FiscalPeriodStatus | null;
  criticalAlerts: {
    criticalAlertsCount: number;
    unreconciledTransactions: number;
    pendingApprovals: number;
  };
  cashPosition: {
    cashOnHand: number;
    bankBalance: number;
    totalAvailableFunds: number;
    totalCashOnHand: number;
    availableCash: number;
    changeVsYesterday: number;
    trend: CashTrendPoint[];
  };
  receivables: ReceivablesSnapshot;
  payables: PayablesSnapshot;
  taxSummary: TaxSummary;
  periodReadiness: PeriodReadiness;
  performanceSnapshot: PerformanceSnapshot;
  actionItems: ActionItems;
  quickStats: QuickStats;
  recentActivity: RecentActivityItem[];
}

type ActionTab = "expenses" | "stock" | "journal" | "other";
type StatusTone = "critical" | "warning" | "good" | "info";

type QuickAction = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  colorClass: string;
  onClick: () => void;
};

type AlertConfig = {
  severity: "critical" | "warning";
  text: string;
  ctaLabel: string;
  onClick: () => void;
};

const formatMoney = (value: number, currency = "RWF") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value ?? 0);

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "recently";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const AccountantDashboard = () => {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [overview, setOverview] = useState<AccountantOverview | null>(null);
  const [expenses, setExpenses] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActionTab>("expenses");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [companyName, setCompanyName] = useState("Business OS");
  const [locationLabel, setLocationLabel] = useState("Location unavailable");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Core': true,
    'Finance & Accounting': true,
    'AP/AR': true,
    'Operations': true,
    'Period & Reports': true,
    'Settings': false,
  });

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
    // Ensure activeSection is always 'dashboard' on initial mount
    setActiveSection('dashboard');
    // Ensure loading state is true during initial mount
    setLoading(true);
  }, []);

  // Check authorization - only accountants should see this dashboard
  // NOTE: This should only run once on mount, not during section navigation
  useEffect(() => {
    if (!mounted || !user) return;
    
    // Check if user is accountant - prioritize accountant role over branch_admin
    const isAccountant = user.role_code === ROLE_CODES.ACCOUNTANT;
    
    // Only redirect if user is definitely NOT an accountant
    // Don't redirect during normal navigation between sections
    if (!isAccountant && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      // Only redirect if we're actually on the accountant dashboard route
      if (currentPath === '/dashboard/accountant') {
        const dashboardRoute = getDashboardRoute(user);
        router.replace(dashboardRoute);
        return;
      }
    }
    // If user is accountant, stay on this dashboard (don't redirect)
  }, [mounted, user]); // Removed router from dependencies to prevent re-runs

  const fetchData = async () => {
    // Safety check: don't fetch if user is not loaded or shouldn't see this dashboard
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const [overviewRes, expensesRes] = await Promise.all([
        api.get<AccountantOverview>("/accounting/dashboard-overview"),
        api.get<ExpenseReport[]>("/expenses"),
      ]);

      if (overviewRes.error) {
        setError(overviewRes.error || "Unable to load dashboard overview.");
        setLoading(false);
        return;
      }

      if (expensesRes.error) {
        setError(expensesRes.error || "Unable to load expenses.");
        setLoading(false);
        return;
      }

      setOverview(overviewRes.data ?? null);
      setExpenses(expensesRes.data ?? []);
      setNotificationsOpen(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounting data only for accountants. Use primitive deps (user_id, company_id) so
  // Profile's updateUser() doesn't change the user object reference and retrigger this effect (which caused ticking).
  useEffect(() => {
    if (!mounted || !user) return;
    if (!shouldSeeDashboard(user, "/dashboard/accountant")) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user?.user_id, user?.company_id]);

  // Show loading while waiting for mount, user, authorization, or initial data load
  // This prevents any dashboard content from showing during initial load
  const isInitialLoad = !mounted || !user || loading || !shouldSeeDashboard(user, "/dashboard/accountant");
  
  if (isInitialLoad) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only show error state after initial load is complete
  // During initial load, we show spinner above
  if (error || !overview) {
    // Only show error if we're past initial load (mounted, user loaded, etc.)
    // This prevents error from showing during the brief moment before data loads
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="space-y-4 p-8 max-w-md">
          <ErrorMessage error={error || "Unable to load accountant overview."} />
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" /> Retry fetching data
          </button>
        </div>
      </div>
    );
  }
  
  // Safely access user data with fallbacks
  const userData = (user && mounted) ? (user as Record<string, any>) : null;
  const userDisplayName = userData
    ? ([userData?.first_name, userData?.last_name].filter(Boolean).join(" ").trim() ||
       userData?.display_name ||
       userData?.email ||
       "Accountant")
    : "Accountant";
  
  // Determine role label: prefer role_name/role_code; Company Admin before Super Admin
  let userRoleLabel = "User";
  if (userData) {
    if (userData.role_name) {
      userRoleLabel = userData.role_name;
    } else if (userData.role_code) {
      userRoleLabel = userData.role_code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (userData.role) {
      userRoleLabel = userData.role;
    } else if (userData.is_company_admin && userData.company_id) {
      userRoleLabel = "Company Admin";
    } else if (userData.is_super_admin) {
      userRoleLabel = "Super Admin";
    } else if (userData.is_branch_admin) {
      userRoleLabel = "Branch Admin";
    }
  }
  
  const userBranchLabel = userData?.branch?.name || userData?.branch_name || userData?.branch_code || "All branches";

  // Sidebar navigation structure for Accountant
  const navigation = [
    {
      title: 'Core',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'profile', label: 'Profile', icon: User }
      ]
    },
    {
      title: 'Finance & Accounting',
      items: [
        { id: 'expenses', label: 'Expense Management', icon: Wallet },
        { id: 'command-center', label: 'Accountant Command Center', icon: BarChart3 },
        { id: 'bank-reconciliation', label: 'Bank Reconciliation', icon: CreditCard },
        { id: 'general-ledger', label: 'General Ledger', icon: BookOpen },
        { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'AP/AR',
      items: [
        { id: 'invoices', label: 'Invoices', icon: FileText },
        { id: 'bills', label: 'Bills', icon: Receipt },
        { id: 'payments', label: 'Payments', icon: DollarSign }
      ]
    },
    {
      title: 'Operations',
      items: [
        { id: 'purchases', label: 'Purchases', icon: Receipt }
      ]
    },
    {
      title: 'Period & Reports',
      items: [
        { id: 'period-close', label: 'Period Close', icon: Calendar },
        { id: 'financial-reports', label: 'Financial Reports', icon: TrendingUp },
        { id: 'reports-activity', label: 'Reports Activity', icon: Activity }
      ]
    },
    {
      title: 'Settings',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  const ExpenseManagementView = () => {
    const [expenseMetrics, setExpenseMetrics] = useState({
      missingReceipts: 0,
      glCodingStatus: true,
      policyExceptions: 0,
      pendingApproval: { count: 0, amount: 0 },
      pendingReimbursement: { count: 0, amount: 0 },
      monthlyComparison: { amount: 0, change: 0 },
      needsGLCoding: { count: 0, amount: 0 }
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
      // Fetch expense metrics
      const fetchExpenseMetrics = async () => {
        try {
          const expensesRes = await api.get<ExpenseReport[]>("/expenses");
          if (!expensesRes.error && expensesRes.data) {
            const expenses = expensesRes.data;
            const pendingApproval = expenses.filter(e => e.status === "submitted");
            const pendingReimbursement = expenses.filter(e => e.status === "approved");
            // For now, assume all expenses need GL coding if they don't have a specific status
            const needsCoding = expenses.filter(e => e.status !== "approved" && e.status !== "paid");

            setExpenseMetrics({
              missingReceipts: 0, // Could be calculated from expense items
              glCodingStatus: needsCoding.length === 0,
              policyExceptions: 0, // Could be calculated based on policy rules
              pendingApproval: {
                count: pendingApproval.length,
                amount: pendingApproval.reduce((sum, e) => sum + (e.total_amount || 0), 0)
              },
              pendingReimbursement: {
                count: pendingReimbursement.length,
                amount: pendingReimbursement.reduce((sum, e) => sum + (e.total_amount || 0), 0)
              },
              monthlyComparison: {
                amount: expenses.reduce((sum, e) => sum + (e.total_amount || 0), 0),
                change: 0
              },
              needsGLCoding: {
                count: needsCoding.length,
                amount: needsCoding.reduce((sum, e) => sum + (e.total_amount || 0), 0)
              }
            });
          }
        } catch (err) {
          console.error("Error fetching expense metrics:", err);
        }
      };
      fetchExpenseMetrics();
    }, []);

    const handleRefresh = async () => {
      setRefreshing(true);
      // Refresh logic here
      setTimeout(() => setRefreshing(false), 1000);
    };

    const handleExport = () => {
      // Export logic here
      console.log("Exporting expense data...");
    };

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
            <p className="text-sm text-gray-500 mt-1">Review, approve, and process expense reports</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Action Required Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Action Required</h2>
          
          {/* Missing Receipts */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Missing Receipts ({expenseMetrics.missingReceipts} reports)</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {expenseMetrics.missingReceipts === 0 
                    ? "All expense reports have receipts attached."
                    : `${expenseMetrics.missingReceipts} reports are missing receipts.`}
                </p>
              </div>
            </div>
          </div>

          {/* GL Account Coding Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${expenseMetrics.glCodingStatus ? 'bg-yellow-100' : 'bg-green-100'} flex items-center justify-center`}>
                {expenseMetrics.glCodingStatus ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">GL Account Coding Status</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {expenseMetrics.glCodingStatus 
                    ? "✓ All expenses are properly coded with GL accounts."
                    : "Some expenses need GL account coding."}
                </p>
              </div>
            </div>
          </div>

          {/* Policy Exceptions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Policy Exceptions ({expenseMetrics.policyExceptions} reports)</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {expenseMetrics.policyExceptions === 0 
                    ? "No policy violations detected."
                    : `${expenseMetrics.policyExceptions} reports violate company policies.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending Approval */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Approval</h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">{expenseMetrics.pendingApproval.count}</p>
              <p className="text-sm text-gray-600">{formatCurrency(expenseMetrics.pendingApproval.amount)}</p>
            </div>

            {/* Pending Reimbursement */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Reimbursement</h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">{expenseMetrics.pendingReimbursement.count}</p>
              <p className="text-sm text-gray-600">{formatCurrency(expenseMetrics.pendingReimbursement.amount)}</p>
            </div>

            {/* Monthly Comparison */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Monthly Comparison</h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(expenseMetrics.monthlyComparison.amount)}</p>
              <p className={`text-sm ${expenseMetrics.monthlyComparison.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {expenseMetrics.monthlyComparison.change >= 0 ? '+' : ''}
                {expenseMetrics.monthlyComparison.change.toFixed(1)}% vs last month
              </p>
            </div>

            {/* Needs GL Coding */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Needs GL Coding</h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">{expenseMetrics.needsGLCoding.count}</p>
              <p className="text-sm text-gray-600">{formatCurrency(expenseMetrics.needsGLCoding.amount)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CommandCenterView = () => {
    const [refreshing, setRefreshing] = useState(false);
    const currency = overview?.currency || "RWF";

    const handleRefresh = async () => {
      setRefreshing(true);
      await fetchData();
      setRefreshing(false);
    };

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accountant Command Center</h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive accounting overview and management</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {overview && (
          <>
            {/* Cash & Bank Position (top priority) */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cash & Bank Position</h2>
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Funds</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">
                  {formatMoney(overview.cashPosition.totalAvailableFunds ?? overview.cashPosition.availableCash ?? 0, currency)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Cash + Bank combined</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cash on Hand</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatMoney(overview.cashPosition.cashOnHand ?? overview.cashPosition.totalCashOnHand ?? 0, currency)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Physical cash only</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cash at Bank</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(overview.cashPosition.bankBalance ?? 0, currency)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">All bank accounts total</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveSection('chart-of-accounts')}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  View accounts
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(true)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Transfer money
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('bank-reconciliation')}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Reconcile bank
                </button>
              </div>
            </div>

            {/* Key Metrics - Receivables, Payables, Inventory */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Receivables</h3>
                <p className="text-2xl font-bold text-gray-900">{formatMoney(overview.receivables.totalOutstanding, currency)}</p>
                <p className="text-xs text-red-600 mt-1">Overdue: {formatMoney(overview.receivables.overdueAmount, currency)}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Payables</h3>
                <p className="text-2xl font-bold text-gray-900">{formatMoney(overview.payables.totalOutstanding, currency)}</p>
                <p className="text-xs text-red-600 mt-1">Overdue: {formatMoney(overview.payables.overdueBills, currency)}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Inventory Value</h3>
                <p className="text-2xl font-bold text-gray-900">{formatMoney(overview.performanceSnapshot.inventory.totalValue, currency)}</p>
                <p className="text-xs text-gray-500 mt-1">Pending write-offs: {formatMoney(overview.performanceSnapshot.inventory.pendingWriteOffs, currency)}</p>
              </div>
            </div>

            {/* Action Items */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h2>
              <div className="space-y-3">
                {overview.actionItems.approvals.expenseReports.count > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{overview.actionItems.approvals.expenseReports.count} Expense Reports</p>
                      <p className="text-sm text-gray-600">{formatMoney(overview.actionItems.approvals.expenseReports.amount, currency)} pending approval</p>
                    </div>
                    <button
                      onClick={() => setActiveSection('expenses')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Review
                    </button>
                  </div>
                )}
                {overview.actionItems.approvals.purchaseOrders.count > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{overview.actionItems.approvals.purchaseOrders.count} Purchase Orders</p>
                      <p className="text-sm text-gray-600">{formatMoney(overview.actionItems.approvals.purchaseOrders.amount, currency)} awaiting release</p>
                    </div>
                    <button
                      onClick={() => setActiveSection('purchases')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Review
                    </button>
                  </div>
                )}
                {overview.criticalAlerts.unreconciledTransactions > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{overview.criticalAlerts.unreconciledTransactions} Unreconciled Transactions</p>
                      <p className="text-sm text-gray-600">Bank reconciliation required</p>
                    </div>
                    <button
                      onClick={() => setActiveSection('bank-reconciliation')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Reconcile
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Period Status */}
            {overview.fiscalPeriod && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Fiscal Period</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Period</p>
                    <p className="text-xl font-bold text-gray-900">{overview.fiscalPeriod.period_name}</p>
                    <p className="text-sm text-gray-500 mt-1">Status: {overview.fiscalPeriod.status}</p>
                  </div>
                  {overview.fiscalPeriod.closesInDays !== null && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Closes in</p>
                      <p className="text-2xl font-bold text-blue-600">{overview.fiscalPeriod.closesInDays} days</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const BankReconciliationView = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [showAddAccountForm, setShowAddAccountForm] = useState(false);
    const [formData, setFormData] = useState({
      account_name: '',
      bank_name: '',
      account_number: '',
      account_type: 'checking',
      currency: overview?.currency || 'RWF',
      opening_balance: '',
      opening_date: new Date().toISOString().split('T')[0],
      routing_number: '',
      swift_code: '',
      iban: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const currency = overview?.currency || "RWF";

    useEffect(() => {
      const fetchAccounts = async () => {
        try {
          const response = await api.get("/accounting/bank-accounts");
          if (!response.error && response.data) {
            // Map API response to component format
            const mappedAccounts = (Array.isArray(response.data) ? response.data : []).map((account: any) => ({
              accountId: account.bank_account_id || account.accountId,
              name: account.account_name || account.name,
              balance: account.current_balance || account.balance || 0,
              lastReconciled: account.last_reconciled || account.lastReconciled || null,
              unmatchedTransactions: account.unmatched_transactions || account.unmatchedTransactions || 0,
              discrepancies: account.discrepancies || 0,
              account_number: account.account_number,
              bank_name: account.bank_name,
              account_type: account.account_type,
              currency: account.currency
            }));
            setAccounts(mappedAccounts);
          } else {
            // Fallback to empty array if API doesn't exist yet
            setAccounts([]);
          }
          setLoading(false);
        } catch (err) {
          console.error("Error fetching bank accounts:", err);
          // Fallback to empty array on error
          setAccounts([]);
          setLoading(false);
        }
      };
      fetchAccounts();
    }, []);

    const validateForm = () => {
      const errors: Record<string, string> = {};

      if (!formData.account_name.trim()) {
        errors.account_name = 'Account name is required';
      }

      if (!formData.bank_name.trim()) {
        errors.bank_name = 'Bank name is required';
      }

      if (!formData.account_number.trim()) {
        errors.account_number = 'Account number is required';
      }

      if (!formData.opening_date) {
        errors.opening_date = 'Opening date is required';
      }

      const openingBalance = parseFloat(formData.opening_balance);
      if (formData.opening_balance && isNaN(openingBalance)) {
        errors.opening_balance = 'Opening balance must be a valid number';
      }

      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) {
        return;
      }

      setSubmitting(true);
      try {
        // Helper to convert empty strings to null for optional fields
        const toNullIfEmpty = (value: string) => {
          if (!value || typeof value !== 'string') return null;
          const trimmed = value.trim();
          return trimmed === '' ? null : trimmed;
        };

        const payload = {
          account_name: formData.account_name.trim(),
          bank_name: formData.bank_name.trim(),
          account_number: formData.account_number.trim(),
          account_type: formData.account_type,
          currency: formData.currency,
          opening_balance: formData.opening_balance ? parseFloat(formData.opening_balance) : 0,
          opening_date: formData.opening_date,
          routing_number: toNullIfEmpty(formData.routing_number),
          swift_code: toNullIfEmpty(formData.swift_code),
          iban: toNullIfEmpty(formData.iban),
          contact_person: toNullIfEmpty(formData.contact_person),
          phone: toNullIfEmpty(formData.phone),
          email: toNullIfEmpty(formData.email),
          address: toNullIfEmpty(formData.address),
          notes: toNullIfEmpty(formData.notes)
        };

        // Debug: Log payload to help diagnose issues
        console.log('Bank Account Payload:', payload);

        const response = await api.post("/accounting/bank-accounts", payload);
        
        if (response.error) {
          setFormErrors({ submit: response.error || 'Failed to create bank account' });
        } else {
          // Reset form and close modal
          setFormData({
            account_name: '',
            bank_name: '',
            account_number: '',
            account_type: 'checking',
            currency: overview?.currency || 'RWF',
            opening_balance: '',
            opening_date: new Date().toISOString().split('T')[0],
            routing_number: '',
            swift_code: '',
            iban: '',
            contact_person: '',
            phone: '',
            email: '',
            address: '',
            notes: ''
          });
          setFormErrors({});
          setShowAddAccountForm(false);
          
          // Refresh accounts list
          const accountsRes = await api.get("/accounting/bank-accounts");
          if (!accountsRes.error && accountsRes.data) {
            // Map API response to component format
            const mappedAccounts = (Array.isArray(accountsRes.data) ? accountsRes.data : []).map((account: any) => ({
              accountId: account.bank_account_id || account.accountId,
              name: account.account_name || account.name,
              balance: account.current_balance || account.balance || 0,
              lastReconciled: account.last_reconciled || account.lastReconciled || null,
              unmatchedTransactions: account.unmatched_transactions || account.unmatchedTransactions || 0,
              discrepancies: account.discrepancies || 0,
              account_number: account.account_number,
              bank_name: account.bank_name,
              account_type: account.account_type,
              currency: account.currency
            }));
            setAccounts(mappedAccounts);
          }
        }
      } catch (err: any) {
        setFormErrors({ submit: err.message || 'Failed to create bank account' });
      } finally {
        setSubmitting(false);
      }
    };

    const handleCloseForm = () => {
      setShowAddAccountForm(false);
      setFormData({
        account_name: '',
        bank_name: '',
        account_number: '',
        account_type: 'checking',
        currency: overview?.currency || 'RWF',
        opening_balance: '',
        opening_date: new Date().toISOString().split('T')[0],
        routing_number: '',
        swift_code: '',
        iban: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
      });
      setFormErrors({});
    };

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h1>
            <p className="text-sm text-gray-500 mt-1">Match bank transactions with accounting records</p>
          </div>
          <button 
            onClick={() => setShowAddAccountForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Bank Account
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bank Accounts List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Bank Accounts</h2>
              {accounts.map((account) => (
                <div
                  key={account.accountId}
                  onClick={() => setSelectedAccount(account.accountId)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAccount === account.accountId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900">{account.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">Balance: {formatMoney(account.balance, currency)}</p>
                  {account.unmatchedTransactions > 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      {account.unmatchedTransactions} unmatched transactions
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Reconciliation Details */}
            <div className="lg:col-span-2">
              {selectedAccount ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Reconciliation Details</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Last Reconciled</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {accounts.find(a => a.accountId === selectedAccount)?.lastReconciled || "Never"}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">Unmatched Transactions</p>
                      <p className="text-2xl font-bold text-yellow-600 mt-2">
                        {accounts.find(a => a.accountId === selectedAccount)?.unmatchedTransactions || 0}
                      </p>
                      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                        Match Transactions
                      </button>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">Discrepancies</p>
                      <p className="text-2xl font-bold text-red-600 mt-2">
                        {accounts.find(a => a.accountId === selectedAccount)?.discrepancies || 0}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a bank account to view reconciliation details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Bank Account Form Modal */}
        {showAddAccountForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add New Bank Account</h2>
                <button
                  onClick={handleCloseForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.account_name}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, account_name: e.target.value }));
                          if (formErrors.account_name) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.account_name;
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="e.g., Main Operating Account"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.account_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.account_name && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.account_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bank_name}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, bank_name: e.target.value }));
                          if (formErrors.bank_name) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.bank_name;
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="e.g., First National Bank"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.bank_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.bank_name && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.bank_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.account_number}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, account_number: e.target.value }));
                          if (formErrors.account_number) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.account_number;
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="1234567890"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.account_number ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.account_number && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.account_number}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.account_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, account_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="money_market">Money Market</option>
                        <option value="credit_line">Credit Line</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="RWF">RWF - Rwandan Franc</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="KES">KES - Kenyan Shilling</option>
                        <option value="UGX">UGX - Ugandan Shilling</option>
                        <option value="TZS">TZS - Tanzanian Shilling</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opening Balance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.opening_balance}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, opening_balance: e.target.value }));
                          if (formErrors.opening_balance) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.opening_balance;
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="0.00"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.opening_balance ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.opening_balance && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.opening_balance}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opening Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.opening_date}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, opening_date: e.target.value }));
                          if (formErrors.opening_date) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.opening_date;
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.opening_date ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.opening_date && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.opening_date}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Banking Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Routing Number / Sort Code
                      </label>
                      <input
                        type="text"
                        value={formData.routing_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, routing_number: e.target.value }))}
                        placeholder="e.g., 123456789"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SWIFT Code
                      </label>
                      <input
                        type="text"
                        value={formData.swift_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, swift_code: e.target.value.toUpperCase() }))}
                        placeholder="e.g., CHASUS33"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength={11}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IBAN
                      </label>
                      <input
                        type="text"
                        value={formData.iban}
                        onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                        placeholder="e.g., GB82 WEST 1234 5698 7654 32"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={formData.contact_person}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                        placeholder="e.g., John Doe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="e.g., +1 (555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, email: e.target.value }));
                          if (formErrors.email) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.email;
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="e.g., contact@bank.com"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.email && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Address
                      </label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        rows={3}
                        placeholder="Enter bank address..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Additional notes about this bank account..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{formErrors.submit}</p>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Create Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const GeneralLedgerView = () => {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [showNewEntryForm, setShowNewEntryForm] = useState(false);
    const [viewingEntry, setViewingEntry] = useState<any>(null);
    const [chartAccounts, setChartAccounts] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
      entry_date: new Date().toISOString().split('T')[0],
      reference: '',
      memo: '',
      lines: [
        { account_id: '', account_name: '', debit_amount: '', credit_amount: '' }
      ]
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const currency = overview?.currency || "RWF";

    useEffect(() => {
      const fetchData = async () => {
        try {
          // Fetch journal entries
          const entriesRes = await api.get("/accounting/journal-entries");
          if (!entriesRes.error && entriesRes.data) {
            setEntries(Array.isArray(entriesRes.data) ? entriesRes.data : []);
          }

          // Fetch chart of accounts for the form
          const accountsRes = await api.get("/accounting/chart-of-accounts");
          if (!accountsRes.error && accountsRes.data) {
            setChartAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : []);
          }

          // Fetch bank accounts for the form
          const bankAccountsRes = await api.get("/accounting/bank-accounts");
          if (!bankAccountsRes.error && bankAccountsRes.data) {
            setBankAccounts(Array.isArray(bankAccountsRes.data) ? bankAccountsRes.data : []);
          }

          setLoading(false);
        } catch (err) {
          console.error("Error fetching data:", err);
          setLoading(false);
        }
      };
      fetchData();
    }, []);

    const handleAddLine = () => {
      setFormData(prev => ({
        ...prev,
        lines: [...prev.lines, { account_id: '', account_name: '', debit_amount: '', credit_amount: '' }]
      }));
    };

    const handleRemoveLine = (index: number) => {
      if (formData.lines.length > 1) {
        setFormData(prev => ({
          ...prev,
          lines: prev.lines.filter((_, i) => i !== index)
        }));
      }
    };

    const handleLineChange = (index: number, field: string, value: string) => {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.map((line, i) => {
          if (i === index) {
            if (field === 'account_id') {
              // Check if it's a bank account (starts with 'bank_')
              if (value.startsWith('bank_')) {
                const bankAccountId = Number(value.replace('bank_', ''));
                const bankAccount = bankAccounts.find(acc => acc.bank_account_id === bankAccountId);
                
                if (bankAccount) {
                  return {
                    ...line,
                    account_id: value,
                    account_name: bankAccount.account_name
                  };
                }
              } else {
                // It's a chart of accounts entry
                const account = chartAccounts.find(acc => acc.account_id === Number(value));
                if (account) {
                  return {
                    ...line,
                    account_id: value,
                    account_name: account.name
                  };
                }
              }
              return { ...line, account_id: value, account_name: '' };
            }
            // Clear the opposite field when one is filled
            if (field === 'debit_amount' && value) {
              return { ...line, [field]: value, credit_amount: '' };
            }
            if (field === 'credit_amount' && value) {
              return { ...line, [field]: value, debit_amount: '' };
            }
            return { ...line, [field]: value };
          }
          return line;
        })
      }));
      // Clear errors for this line
      if (formErrors[`line_${index}_${field}`]) {
        setFormErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`line_${index}_${field}`];
          return newErrors;
        });
      }
    };

    const validateForm = () => {
      const errors: Record<string, string> = {};

      if (!formData.entry_date) {
        errors.entry_date = 'Entry date is required';
      }

      if (!formData.reference.trim()) {
        errors.reference = 'Reference is required';
      }

      if (formData.lines.length < 2) {
        errors.lines = 'At least 2 lines are required';
      }

      let totalDebit = 0;
      let totalCredit = 0;

      formData.lines.forEach((line, index) => {
        if (!line.account_id) {
          errors[`line_${index}_account`] = 'Account is required';
        }

        const debit = parseFloat(line.debit_amount) || 0;
        const credit = parseFloat(line.credit_amount) || 0;

        if (debit === 0 && credit === 0) {
          errors[`line_${index}_amount`] = 'Either debit or credit amount is required';
        }

        if (debit > 0 && credit > 0) {
          errors[`line_${index}_amount`] = 'Cannot have both debit and credit';
        }

        totalDebit += debit;
        totalCredit += credit;
      });

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        errors.balance = `Debits (${formatMoney(totalDebit, currency)}) must equal Credits (${formatMoney(totalCredit, currency)})`;
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) {
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          entry_date: formData.entry_date,
          reference: formData.reference,
          memo: formData.memo,
          journal_type: 'manual',
          lines: formData.lines.map(line => {
            // Check if this is a bank account (value starts with 'bank_')
            const isBankAccount = String(line.account_id).startsWith('bank_');
            let accountId: number;
            
            if (isBankAccount) {
              // For bank accounts, we need to find or create a corresponding chart of accounts entry
              // For now, we'll use the bank account ID but the backend needs to handle this
              // TODO: Map bank accounts to chart of accounts entries
              accountId = Number(String(line.account_id).replace('bank_', ''));
            } else {
              accountId = Number(line.account_id);
            }
            
            return {
              account_id: accountId,
              bank_account_id: isBankAccount ? accountId : undefined,
              debit_amount: parseFloat(line.debit_amount) || 0,
              credit_amount: parseFloat(line.credit_amount) || 0
            };
          })
        };

        const response = await api.post("/accounting/journal-entries", payload);
        
        if (response.error) {
          setFormErrors({ submit: response.error || 'Failed to create journal entry' });
        } else {
          // Reset form and close modal
          setFormData({
            entry_date: new Date().toISOString().split('T')[0],
            reference: '',
            memo: '',
            lines: [{ account_id: '', account_name: '', debit_amount: '', credit_amount: '' }]
          });
          setFormErrors({});
          setShowNewEntryForm(false);
          
          // Refresh entries
          const entriesRes = await api.get("/accounting/journal-entries");
          if (!entriesRes.error && entriesRes.data) {
            setEntries(Array.isArray(entriesRes.data) ? entriesRes.data : []);
          }
        }
      } catch (err: any) {
        setFormErrors({ submit: err.message || 'Failed to create journal entry' });
      } finally {
        setSubmitting(false);
      }
    };

    const handleCloseForm = () => {
      setShowNewEntryForm(false);
      setFormData({
        entry_date: new Date().toISOString().split('T')[0],
        reference: '',
        memo: '',
        lines: [{ account_id: '', account_name: '', debit_amount: '', credit_amount: '' }]
      });
      setFormErrors({});
    };

    const totalDebit = formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
    const totalCredit = formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">General Ledger</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage all journal entries and transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={() => setShowNewEntryForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>
        </div>

        {/* Journal Entries Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Reference</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Debit</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Credit</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        No journal entries found. Create your first entry to get started.
                      </td>
                    </tr>
                  ) : (
                    entries.flatMap((entry, entryIdx) => {
                      const entryDate = entry.entry_date 
                        ? new Date(entry.entry_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit' 
                          })
                        : new Date().toLocaleDateString();
                      
                      // If entry has no lines, show one row with totals from header
                      if (!entry.lines || entry.lines.length === 0) {
                        return (
                          <tr key={entry.journal_entry_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entryDate}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.reference || entry.journal_number}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{entry.memo || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{entry.total_debit > 0 ? formatMoney(entry.total_debit, currency) : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{entry.total_credit > 0 ? formatMoney(entry.total_credit, currency) : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                Posted
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button type="button" onClick={() => setViewingEntry(entry)} className="p-1 hover:bg-gray-100 rounded" title="View entry">
                                  <Eye className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      
                      // Show one row per line item - all rows show date, reference, status
                      const description = entry.memo || entry.reference || entry.journal_number || 'Journal Entry';
                      const reference = entry.reference || entry.journal_number || '';
                      
                      return entry.lines.map((line: any, lineIdx: number) => (
                        <tr 
                          key={`${entry.journal_entry_id}-${line.journal_entry_line_id || lineIdx}`} 
                          className="hover:bg-gray-50"
                        >
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            {entryDate}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            {reference}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {description}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            {line.account_code && line.account_name
                              ? `${line.account_code} - ${line.account_name}`
                              : (line.account_name || line.account_code || 'Unknown Account')}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                            {line.debit_amount > 0 ? formatMoney(line.debit_amount, currency) : '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                            {line.credit_amount > 0 ? formatMoney(line.credit_amount, currency) : '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Posted
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button type="button" onClick={() => setViewingEntry(entry)} className="p-1 hover:bg-gray-100 rounded" title="View entry">
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View Entry Detail Modal */}
        {viewingEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden m-4 flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Journal Entry Details</h2>
                <button
                  type="button"
                  onClick={() => setViewingEntry(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</p>
                    <p className="text-sm text-gray-900 mt-0.5">
                      {viewingEntry.entry_date
                        ? new Date(viewingEntry.entry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</p>
                    <p className="text-sm text-gray-900 mt-0.5">{viewingEntry.reference || viewingEntry.journal_number || '-'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description / Memo</p>
                    <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{viewingEntry.memo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                    <p className="mt-0.5">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Posted</span>
                    </p>
                  </div>
                  {viewingEntry.created_by_name && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created by</p>
                      <p className="text-sm text-gray-900 mt-0.5">{viewingEntry.created_by_name}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Entry Lines</p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {viewingEntry.lines && viewingEntry.lines.length > 0 ? (
                          viewingEntry.lines.map((line: any, idx: number) => (
                            <tr key={line.journal_entry_line_id || idx}>
                              <td className="px-3 py-2 text-gray-900">
                                {line.account_code && line.account_name ? `${line.account_code} - ${line.account_name}` : (line.account_name || line.account_code || 'Unknown')}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-900 font-medium">
                                {line.debit_amount > 0 ? formatMoney(line.debit_amount, currency) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-900 font-medium">
                                {line.credit_amount > 0 ? formatMoney(line.credit_amount, currency) : '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-gray-500">No lines</td>
                          </tr>
                        )}
                      </tbody>
                      {(viewingEntry.lines?.length ?? 0) > 0 && (
                        <tfoot className="bg-gray-50 font-medium">
                          <tr>
                            <td className="px-3 py-2 text-gray-900">Total</td>
                            <td className="px-3 py-2 text-right text-gray-900">{formatMoney(viewingEntry.total_debit ?? 0, currency)}</td>
                            <td className="px-3 py-2 text-right text-gray-900">{formatMoney(viewingEntry.total_credit ?? 0, currency)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingEntry(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Entry Form Modal */}
        {showNewEntryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create New Journal Entry</h2>
                <button
                  onClick={handleCloseForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Header Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, entry_date: e.target.value }));
                        if (formErrors.entry_date) {
                          setFormErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.entry_date;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.entry_date ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {formErrors.entry_date && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.entry_date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, reference: e.target.value }));
                        if (formErrors.reference) {
                          setFormErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.reference;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="JE-001"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.reference ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {formErrors.reference && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.reference}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description / Memo
                  </label>
                  <textarea
                    value={formData.memo}
                    onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter description or memo for this journal entry..."
                  />
                </div>

                {/* Journal Entry Lines */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Entry Lines <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      <Plus className="w-4 h-4" />
                      Add Line
                    </button>
                  </div>

                  {formErrors.lines && (
                    <p className="text-sm text-red-600 mb-2">{formErrors.lines}</p>
                  )}

                  <div className="space-y-3">
                    {formData.lines.map((line, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-start p-4 bg-gray-50 rounded-lg">
                        <div className="col-span-12 md:col-span-4">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Account <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={line.account_id}
                            onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              formErrors[`line_${index}_account`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          >
                            <option value="">Select Account</option>
                            {/* Chart of Accounts */}
                            {chartAccounts.length > 0 && (
                              <optgroup label="Chart of Accounts">
                                {chartAccounts.map((account) => (
                                  <option key={account.account_id} value={account.account_id}>
                                    {account.account_code} - {account.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {/* Bank Accounts */}
                            {bankAccounts.length > 0 && (
                              <optgroup label="Bank Accounts">
                                {bankAccounts.map((bankAccount) => (
                                  <option key={`bank_${bankAccount.bank_account_id}`} value={`bank_${bankAccount.bank_account_id}`}>
                                    {bankAccount.account_name} ({bankAccount.bank_name})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          {formErrors[`line_${index}_account`] && (
                            <p className="text-xs text-red-600 mt-1">{formErrors[`line_${index}_account`]}</p>
                          )}
                        </div>

                        <div className="col-span-6 md:col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Debit
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit_amount}
                            onChange={(e) => handleLineChange(index, 'debit_amount', e.target.value)}
                            placeholder="0.00"
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              formErrors[`line_${index}_amount`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>

                        <div className="col-span-6 md:col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Credit
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit_amount}
                            onChange={(e) => handleLineChange(index, 'credit_amount', e.target.value)}
                            placeholder="0.00"
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              formErrors[`line_${index}_amount`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>

                        <div className="col-span-12 md:col-span-2 flex items-end">
                          {formData.lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              className="w-full px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {formErrors[`line_${index}_amount`] && (
                          <div className="col-span-12">
                            <p className="text-xs text-red-600">{formErrors[`line_${index}_amount`]}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Total Debit</p>
                      <p className="text-lg font-bold text-gray-900">{formatMoney(totalDebit, currency)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Total Credit</p>
                      <p className="text-lg font-bold text-gray-900">{formatMoney(totalCredit, currency)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Difference</p>
                      <p className={`text-lg font-bold ${
                        Math.abs(totalDebit - totalCredit) < 0.01 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatMoney(totalDebit - totalCredit, currency)}
                      </p>
                    </div>
                  </div>
                  {formErrors.balance && (
                    <p className="text-sm text-red-600 mt-2">{formErrors.balance}</p>
                  )}
                </div>

                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{formErrors.submit}</p>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || Math.abs(totalDebit - totalCredit) >= 0.01}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Create Entry
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ChartOfAccountsView = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [showNewAccountForm, setShowNewAccountForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any | null>(null);
    const [viewingAccount, setViewingAccount] = useState<any | null>(null);
    const [formData, setFormData] = useState({
      account_code: '',
      name: '',
      account_type: 'asset',
      account_category: '',
      parent_account_id: '',
      currency: overview?.currency || 'RWF',
      is_posting: true,
      notes: '',
      is_active: true
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const currency = overview?.currency || "RWF";

    useEffect(() => {
      const fetchAccounts = async () => {
        try {
          const response = await api.get("/accounting/chart-of-accounts");
          if (!response.error && response.data) {
            setAccounts(Array.isArray(response.data) ? response.data : []);
          }
          setLoading(false);
        } catch (err) {
          console.error("Error fetching chart of accounts:", err);
          setLoading(false);
        }
      };
      fetchAccounts();
    }, []);

    const validateForm = () => {
      const errors: Record<string, string> = {};

      if (!formData.account_code.trim()) {
        errors.account_code = 'Account code is required';
      }

      if (!formData.name.trim()) {
        errors.name = 'Account name is required';
      }

      if (!formData.account_type) {
        errors.account_type = 'Account type is required';
      }

      // Check if account code already exists (only for new accounts, not when editing)
      if (!editingAccount) {
        const codeExists = accounts.some(acc => 
          acc.account_code?.toLowerCase() === formData.account_code.trim().toLowerCase()
        );
        if (codeExists) {
          const existingAccount = accounts.find(acc => 
            acc.account_code?.toLowerCase() === formData.account_code.trim().toLowerCase()
          );
          const existingName = existingAccount?.name || existingAccount?.account_name || 'an existing account';
          errors.account_code = `Account code "${formData.account_code.trim()}" is already used by "${existingName}". Please use a different code.`;
        }
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) {
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          account_code: formData.account_code.trim(),
          name: formData.name.trim(),
          account_type: formData.account_type,
          account_category: formData.account_category?.trim() || null,
          parent_account_id: formData.parent_account_id ? Number(formData.parent_account_id) : null,
          currency: formData.currency,
          is_posting: formData.is_posting,
          notes: formData.notes.trim() || null,
          is_active: formData.is_active
        };

        console.log('Chart of Account Payload:', payload);

        let response;
        if (editingAccount) {
          // Update existing account
          response = await api.put(`/accounting/chart-of-accounts/${editingAccount.account_id}`, payload);
        } else {
          // Create new account
          response = await api.post("/accounting/chart-of-accounts", payload);
        }
        
        if (response.error) {
          setFormErrors({ submit: response.error || `Failed to ${editingAccount ? 'update' : 'create'} account` });
        } else {
          // Reset form and close modal
          setFormData({
            account_code: '',
            name: '',
            account_type: 'asset',
            account_category: '',
            parent_account_id: '',
            currency: overview?.currency || 'RWF',
            is_posting: true,
            notes: '',
            is_active: true
          });
          setFormErrors({});
          setShowNewAccountForm(false);
          setEditingAccount(null);
          
          // Refresh accounts list
          const accountsRes = await api.get("/accounting/chart-of-accounts");
          if (!accountsRes.error && accountsRes.data) {
            setAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : []);
          }
        }
      } catch (err: any) {
        setFormErrors({ submit: err.message || `Failed to ${editingAccount ? 'update' : 'create'} account` });
      } finally {
        setSubmitting(false);
      }
    };

    const handleCloseForm = () => {
      setShowNewAccountForm(false);
      setEditingAccount(null);
      setFormData({
        account_code: '',
        name: '',
        account_type: 'asset',
        account_category: '',
        parent_account_id: '',
        currency: overview?.currency || 'RWF',
        is_posting: true,
        notes: '',
        is_active: true
      });
      setFormErrors({});
    };

    // Account category options by account type (for Bank reconciliation, Cash dashboard, Inventory, etc.)
    const ACCOUNT_CATEGORY_OPTIONS: Record<string, { value: string; label: string }[]> = {
      asset: [
        { value: 'cash', label: 'Cash' },
        { value: 'bank', label: 'Bank' },
        { value: 'inventory', label: 'Inventory' },
        { value: 'receivable', label: 'Receivable' },
        { value: 'other', label: 'Other' },
      ],
      liability: [
        { value: 'payable', label: 'Payable' },
        { value: 'loan', label: 'Loan' },
        { value: 'tax', label: 'Tax' },
        { value: 'other', label: 'Other' },
      ],
      equity: [
        { value: 'capital', label: 'Capital' },
        { value: 'retained_earnings', label: 'Retained Earnings' },
        { value: 'other', label: 'Other' },
      ],
      revenue: [
        { value: 'sales', label: 'Sales' },
        { value: 'service', label: 'Service' },
        { value: 'other', label: 'Other' },
      ],
      expense: [
        { value: 'purchase', label: 'Purchase' },
        { value: 'salary', label: 'Salary' },
        { value: 'rent', label: 'Rent' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'other', label: 'Other' },
      ],
    };
    const accountCategoryOptions = ACCOUNT_CATEGORY_OPTIONS[formData.account_type] || [];

    const accountCategories = [
      { id: 'assets', label: 'Assets', accounts: accounts.filter(a => a.account_type === 'asset') },
      { id: 'liabilities', label: 'Liabilities', accounts: accounts.filter(a => a.account_type === 'liability') },
      { id: 'equity', label: 'Equity', accounts: accounts.filter(a => a.account_type === 'equity') },
      { id: 'revenue', label: 'Revenue', accounts: accounts.filter(a => a.account_type === 'revenue') },
      { id: 'expenses', label: 'Expenses', accounts: accounts.filter(a => a.account_type === 'expense') },
    ];

    // Get parent account options (filtered by account type for better UX)
    const getParentAccountOptions = () => {
      if (!formData.account_type) return accounts;
      // Return accounts of the same type or all accounts if no type selected
      return accounts.filter(acc => 
        acc.account_id && 
        acc.account_type === formData.account_type &&
        acc.is_active !== false
      );
    };

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your accounting structure and account codes</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={() => setShowNewAccountForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Account
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search accounts by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Accounts by Category */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {accountCategories.map((category) => {
              const isExpanded = expandedCategories[category.id] ?? true;
              const filteredAccounts = category.accounts.filter(account =>
                searchTerm === "" ||
                (account.name || account.account_name || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                account.account_code?.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (filteredAccounts.length === 0 && searchTerm !== "") return null;

              return (
                <div key={category.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedCategories(prev => ({
                      ...prev,
                      [category.id]: !prev[category.id]
                    }))}
                    className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      )}
                      <h2 className="text-lg font-semibold text-gray-900">{category.label}</h2>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                        {filteredAccounts.length}
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-200">
                      {filteredAccounts.length === 0 ? (
                        <div className="px-6 py-8 text-center text-gray-500">
                          No accounts found in this category.
                        </div>
                      ) : (
                        filteredAccounts.map((account, idx) => (
                          <div key={idx} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-900">{account.account_code || 'N/A'}</span>
                                <span className="text-sm text-gray-700">{account.name || account.account_name || 'Unnamed Account'}</span>
                              </div>
                              {account.description && (
                                <p className="text-xs text-gray-500 mt-1">{account.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {formatMoney(account.balance || 0, currency)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {account.account_type || 'N/A'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setViewingAccount(account)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="View Account Details"
                                >
                                  <Eye className="w-4 h-4 text-gray-600" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingAccount(account);
                                    setFormData({
                                      account_code: account.account_code || '',
                                      name: account.name || account.account_name || '',
                                      account_type: account.account_type || 'asset',
                                      account_category: account.account_category || '',
                                      parent_account_id: account.parent_account_id ? String(account.parent_account_id) : '',
                                      currency: account.currency || overview?.currency || 'RWF',
                                      is_posting: account.is_posting !== undefined ? Boolean(account.is_posting) : true,
                                      notes: account.notes || '',
                                      is_active: account.is_active !== undefined ? Boolean(account.is_active) : true
                                    });
                                    setShowNewAccountForm(true);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Edit Account"
                                >
                                  <Edit className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* View Account Modal */}
        {viewingAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Account Details</h2>
                <button
                  onClick={() => setViewingAccount(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Code</label>
                    <p className="text-sm text-gray-900 font-mono">{viewingAccount.account_code || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <p className="text-sm text-gray-900">{viewingAccount.name || viewingAccount.account_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                    <p className="text-sm text-gray-900 capitalize">{viewingAccount.account_type || 'N/A'}</p>
                  </div>
                  {viewingAccount.account_category && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Category</label>
                      <p className="text-sm text-gray-900 capitalize">{viewingAccount.account_category.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <p className="text-sm text-gray-900">{viewingAccount.currency || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
                    <p className="text-sm text-gray-900 font-semibold">
                      {formatMoney(viewingAccount.balance || 0, viewingAccount.currency || currency)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <p className="text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        viewingAccount.is_active !== false 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {viewingAccount.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Posting Account</label>
                    <p className="text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        viewingAccount.is_posting !== false 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {viewingAccount.is_posting !== false ? 'Yes' : 'No'}
                      </span>
                    </p>
                  </div>
                  {viewingAccount.parent_account_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parent Account</label>
                      <p className="text-sm text-gray-900">
                        {(() => {
                          const parent = accounts.find(a => a.account_id === viewingAccount.parent_account_id);
                          return parent ? `${parent.account_code} - ${parent.name || parent.account_name}` : 'N/A';
                        })()}
                      </p>
                    </div>
                  )}
                  {viewingAccount.notes && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingAccount.notes}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                    <p className="text-sm text-gray-900">
                      {viewingAccount.created_at ? new Date(viewingAccount.created_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setViewingAccount(null);
                      setEditingAccount(viewingAccount);
                      setFormData({
                        account_code: viewingAccount.account_code || '',
                        name: viewingAccount.name || viewingAccount.account_name || '',
                        account_type: viewingAccount.account_type || 'asset',
                        account_category: viewingAccount.account_category || '',
                        parent_account_id: viewingAccount.parent_account_id ? String(viewingAccount.parent_account_id) : '',
                        currency: viewingAccount.currency || overview?.currency || 'RWF',
                        is_posting: viewingAccount.is_posting !== undefined ? Boolean(viewingAccount.is_posting) : true,
                        notes: viewingAccount.notes || '',
                        is_active: viewingAccount.is_active !== undefined ? Boolean(viewingAccount.is_active) : true
                      });
                      setShowNewAccountForm(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Account
                  </button>
                  <button
                    onClick={() => setViewingAccount(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New/Edit Account Form Modal */}
        {showNewAccountForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAccount ? 'Edit Account' : 'Create New Account'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.account_code}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, account_code: e.target.value.toUpperCase() }));
                          if (formErrors.account_code) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.account_code;
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="e.g., 1000, 2000, 4000"
                        disabled={!!editingAccount}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.account_code ? 'border-red-500' : 'border-gray-300'
                        } ${editingAccount ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        required
                      />
                      {formErrors.account_code && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.account_code}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {editingAccount ? 'Account code cannot be changed' : 'Unique code to identify this account'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, name: e.target.value }));
                          if (formErrors.name) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.name;
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="e.g., Cash, Accounts Receivable, Sales Revenue"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {formErrors.name && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.account_type}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, account_type: e.target.value, parent_account_id: '', account_category: '' }));
                          if (formErrors.account_type) {
                            setFormErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.account_type;
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.account_type ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      >
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="equity">Equity</option>
                        <option value="revenue">Revenue</option>
                        <option value="expense">Expense</option>
                      </select>
                      {formErrors.account_type && (
                        <p className="text-sm text-red-600 mt-1">{formErrors.account_type}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Category
                      </label>
                      <select
                        value={formData.account_category}
                        onChange={(e) => setFormData(prev => ({ ...prev, account_category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">None</option>
                        {accountCategoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">e.g. Bank (reconciliation), Cash (dashboard), Inventory (stock), Sales</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parent Account
                      </label>
                      <select
                        value={formData.parent_account_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, parent_account_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">None (Top-level account)</option>
                        {getParentAccountOptions().map((account) => (
                          <option key={account.account_id} value={account.account_id}>
                            {account.account_code} - {account.name || account.account_name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Optional: Group this account under a parent account</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="RWF">RWF - Rwandan Franc</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="KES">KES - Kenyan Shilling</option>
                        <option value="UGX">UGX - Ugandan Shilling</option>
                        <option value="TZS">TZS - Tanzanian Shilling</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <div className="flex items-center h-full pt-8">
                        <input
                          type="checkbox"
                          id="is_posting"
                          checked={formData.is_posting}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_posting: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="is_posting" className="ml-2 text-sm font-medium text-gray-700">
                          Posting Account
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-8 ml-2">Allow transactions to be posted to this account</p>
                    </div>

                    <div className="flex items-center">
                      <div className="flex items-center h-full pt-8">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                          Active Account
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-8 ml-2">Account is active and can be used in transactions</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Additional notes or description for this account..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{formErrors.submit}</p>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {editingAccount ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingAccount ? 'Update Account' : 'Create Account'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Purchases view wrapper
  const PurchasesView = () => {
    return (
      <div className="h-full">
        <Purchases />
      </div>
    );
  };

  // Reports view wrapper with view parameter support
  const ReportsView = ({ view }: { view?: string }) => {
    return (
      <div className="h-full">
        <Reports />
      </div>
    );
  };

  const renderContent = () => {
    // Handle Expense Management section
    if (activeSection === 'expenses') {
      return <ExpenseManagementView />;
    }

    // Handle Command Center section
    if (activeSection === 'command-center') {
      return <CommandCenterView />;
    }

    // Handle Bank Reconciliation section
    if (activeSection === 'bank-reconciliation') {
      return <BankReconciliationView />;
    }

    // Handle General Ledger section
    if (activeSection === 'general-ledger') {
      return <GeneralLedgerView />;
    }

    // Handle Chart of Accounts section
    if (activeSection === 'chart-of-accounts') {
      return <ChartOfAccountsView />;
    }

    // Handle Purchases section
    if (activeSection === 'purchases') {
      return <PurchasesView />;
    }

    // Handle Reports sections
    if (activeSection === 'period-close') {
      return <ReportsView view="close" />;
    }

    if (activeSection === 'reports-activity') {
      return <ReportsView view="activity" />;
    }

    if (activeSection === 'financial-reports') {
      return <ReportsView />;
    }

    // Handle Profile section
    if (activeSection === 'profile') {
      return <Profile />;
    }

    // Handle AP/AR sections
    if (activeSection === 'invoices') {
      return <InvoicesPage />;
    }
    if (activeSection === 'bills') {
      return <BillsPage />;
    }
    if (activeSection === 'payments') {
      return <PaymentsPage />;
    }

    // Handle Settings section
    if (activeSection === 'settings') {
      return (
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
          <p className="text-gray-600">Settings configuration coming soon.</p>
        </div>
      );
    }

    if (activeSection !== 'dashboard') {
      // For now, show placeholder for other sections
      return (
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {navigation.flatMap(s => s.items).find(item => item.id === activeSection)?.label || 'Section'}
          </h2>
          <p className="text-gray-600">This section is coming soon.</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (error || !overview) {
      return (
        <div className="space-y-4 p-8">
          <ErrorMessage error={error || "Unable to load accountant overview."} />
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" /> Retry fetching data
          </button>
        </div>
      );
    }

    // Use currency from component level scope
    const pendingExpenses = expenses.filter((expense) => expense.status === "submitted");
    const userData = (user && mounted) ? (user as Record<string, any>) : null;
    const userDisplayName = userData
      ? ([userData?.first_name, userData?.last_name].filter(Boolean).join(" ").trim() ||
         userData?.display_name ||
         userData?.email ||
         "Accountant")
      : "Accountant";

    const metricCards = buildMetricCards(overview, currency, router, setActiveSection);
    const alerts = buildAlertConfigs(overview, currency, router, setActiveSection);
    const quickActions = buildQuickActions(router, setActiveSection);
    const quickStats = buildQuickStats(overview, currency, router, setActiveSection);
    const approvalTabs = buildApprovalTabs(overview, pendingExpenses.length);

    return (
      <div className="space-y-4 sm:space-y-6 bg-slate-50 p-3 sm:p-4 md:p-6">
        <AlertBar alerts={alerts} />

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <PeriodStatus overview={overview} router={router} setActiveSection={setActiveSection} />
          <TaxCompliance overview={overview} currency={currency} router={router} setActiveSection={setActiveSection} />
        </section>

        <ApprovalQueue
          tabs={approvalTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          pendingExpenses={pendingExpenses}
          overview={overview}
          currency={currency}
          router={router}
          setActiveSection={setActiveSection}
        />

        <QuickActionsGrid actions={quickActions} />

        <QuickStatsGrid stats={quickStats} />

        <RecentActivitySection activity={overview.recentActivity} currency={currency} router={router} setActiveSection={setActiveSection} />
      </div>
    );
  };

  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only check authorization - don't use shouldSeeDashboard which might redirect
  const isAccountant = user.role_code === ROLE_CODES.ACCOUNTANT;
  if (!isAccountant) {
    // For non-accountants, redirect will be handled by useEffect above
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Note: isInitialLoad is already defined above and handles all loading states
  // No need for duplicate definition here

  // Calculate alerts at component level for top bar (use empty alerts if overview not loaded yet)
  const currency = overview?.currency || "USD";
  const alerts = overview ? buildAlertConfigs(overview, currency, router, setActiveSection) : [];

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
            <p className="text-sm text-gray-500">{locationLabel}</p>
          </div>

          <nav className="p-2">
            {navigation.map((section, idx) => {
              const isExpanded = expandedSections[section.title] ?? true;
              const toggleSection = () => {
                setExpandedSections(prev => ({
                  ...prev,
                  [section.title]: !prev[section.title]
                }));
              };

              return (
                <div key={idx} className="mb-2">
                  <button
                    type="button"
                    onClick={toggleSection}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span>{section.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isExpanded && (
                    section.items.map((item) => {
                      const Icon = item.icon;
                  // Determine icon background color based on section
                  const getIconBgColor = () => {
                    if (activeSection === item.id) {
                      return 'bg-blue-100';
                    }
                    switch (section.title) {
                      case 'Core':
                        return 'bg-blue-50';
                      case 'Finance & Accounting':
                        return 'bg-green-50';
                      case 'AP/AR':
                        return 'bg-purple-50';
                      case 'Operations':
                        return 'bg-orange-50';
                      case 'Period & Reports':
                        return 'bg-indigo-50';
                      case 'Settings':
                        return 'bg-gray-50';
                      default:
                        return 'bg-gray-50';
                    }
                  };
                  
                  const getIconTextColor = () => {
                    if (activeSection === item.id) {
                      return 'text-blue-600';
                    }
                    switch (section.title) {
                      case 'Core':
                        return 'text-blue-600';
                      case 'Finance & Accounting':
                        return 'text-green-600';
                      case 'AP/AR':
                        return 'text-purple-600';
                      case 'Operations':
                        return 'text-orange-600';
                      case 'Period & Reports':
                        return 'text-indigo-600';
                      case 'Settings':
                        return 'text-gray-600';
                      default:
                        return 'text-gray-600';
                    }
                  };

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveSection(item.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                        activeSection === item.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${getIconBgColor()}`}>
                        <Icon className={`w-4 h-4 ${getIconTextColor()}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div>{item.label}</div>
                      </div>
                    </button>
                  );
                    })
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar with Notifications and Sign Out */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              {activeSection === 'dashboard' && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h2>
                  <p className="text-sm text-gray-500">Financial overview and accounting operations</p>
                </>
              )}
              {activeSection !== 'dashboard' && (
                <h2 className="text-2xl font-bold text-gray-900">
                  {navigation.flatMap(s => s.items).find(item => item.id === activeSection)?.label || 'Section'}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Notifications Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {alerts.length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600"></span>
                  )}
                </button>
                {notificationsOpen && alerts.length > 0 && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {alerts.slice(0, 5).map((alert, idx) => (
                        <div key={idx} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={alert.onClick}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                              {alert.severity === 'critical' ? (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{alert.text}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert.onClick();
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
                              >
                                {alert.ctaLabel} →
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Transfer Money (Cash ↔ Bank) Modal */}
      {showTransferModal && (
        <TransferMoneyModal
          currency={currency}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            fetchData();
          }}
        />
      )}
    </ErrorBoundary>
  );
};

function TransferMoneyModal({
  currency,
  onClose,
  onSuccess,
}: {
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [accounts, setAccounts] = useState<{ account_id: number; account_code: string; name: string; account_category: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ from_account_id: "", to_account_id: "", amount: "", memo: "Transfer between cash and bank" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ account_id: number; account_code: string; name: string; account_category: string }[]>("/accounting/chart-of-accounts");
        const list = Array.isArray(res.data) ? res.data : [];
        const cashOrBank = list.filter(
          (a) => a.account_category && ["cash", "bank"].includes(String(a.account_category).toLowerCase())
        );
        if (!cancelled) setAccounts(cashOrBank);
      } catch (e) {
        if (!cancelled) setError("Failed to load accounts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fromId = Number(formData.from_account_id);
    const toId = Number(formData.to_account_id);
    const amount = parseFloat(formData.amount);
    if (!fromId || !toId || fromId === toId) {
      setError("Select different From and To accounts");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        entry_date: new Date().toISOString().split("T")[0],
        reference: `TRF-${Date.now()}`,
        memo: formData.memo.trim() || "Transfer between cash and bank",
        journal_type: "manual",
        lines: [
          { account_id: toId, debit_amount: amount, credit_amount: 0 },
          { account_id: fromId, debit_amount: 0, credit_amount: amount },
        ],
      };
      const res = await api.post("/accounting/journal-entries", payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Transfer between Cash & Bank</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading accounts…</div>
          ) : accounts.length < 2 ? (
            <div className="py-4 text-gray-600 text-sm">
              Add at least two accounts with category Cash or Bank in Chart of Accounts to use transfers.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From (credit)</label>
                <select
                  value={formData.from_account_id}
                  onChange={(e) => setFormData((p) => ({ ...p, from_account_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.account_code} – {a.name} ({a.account_category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (debit)</label>
                <select
                  value={formData.to_account_id}
                  onChange={(e) => setFormData((p) => ({ ...p, to_account_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.account_code} – {a.name} ({a.account_category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Memo (optional)</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData((p) => ({ ...p, memo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Transfer between cash and bank"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Transferring…" : "Transfer"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function Header({
  overview,
  userName,
  alertCount,
  notifications,
  notificationsOpen,
  onToggleNotifications,
  onRefresh,
}: {
  overview: AccountantOverview;
  userName: string;
  alertCount: number;
  notifications: AlertConfig[];
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  onRefresh: () => void;
}) {
  return (
    <header className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Welcome back, {userName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              className="relative rounded-full p-2 hover:bg-muted"
              aria-label="Notifications"
              onClick={onToggleNotifications}
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {alertCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-border bg-white p-4 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  <span className="text-xs text-muted-foreground">{alertCount} alerts</span>
                </div>
                <div className="max-h-60 space-y-2 overflow-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You are all caught up.</p>
                  ) : (
                    notifications.map((alert) => (
                      <AlertRow key={`notif-${alert.text}`} {...alert} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" /> Refresh Data
          </button>
        </div>
      </div>
    </header>
  );
}

function AlertBar({ alerts }: { alerts: AlertConfig[] }) {
  if (alerts.length === 0) return null;
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-red-900">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="text-sm font-semibold tracking-wide">ACTION REQUIRED</h2>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <AlertRow key={alert.text} {...alert} />
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  title,
  amount,
  subtitle,
  icon: Icon,
  tone,
  body,
  actions,
}: {
  title: string;
  amount: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: StatusTone;
  body: ReactNode;
  actions: Array<{ label: string; onClick: () => void }>;
}) {
  const toneClasses: Record<StatusTone, string> = {
    critical: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    good: "bg-emerald-100 text-emerald-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-3 flex items-center gap-3">
        <div className={cn("rounded-xl p-2", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-foreground">{amount}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-4 text-sm text-muted-foreground">{body}</div>
      <div className="mt-4 flex gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PeriodStatus({ overview, router, setActiveSection }: { overview: AccountantOverview; router: ReturnType<typeof useRouter>; setActiveSection: (section: string) => void }) {
  const readiness = overview.periodReadiness?.outstandingItems ?? null;
  const unreconciled = readiness?.unreconciledTransactions ?? 0;
  const unapprovedJournals = readiness?.unapprovedJournalEntries ?? 0;
  const inventoryVerified = readiness?.inventoryVerified ?? false;
  const missingReceipts = readiness?.missingReceipts ?? 0;
  const hasFiscalPeriod = overview.fiscalPeriod?.period_name != null;
  const completionPercent = overview.periodReadiness?.completionPercent ?? 0;
  const showCompletionBar = hasFiscalPeriod && completionPercent > 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-foreground">Period Close</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Status: {hasFiscalPeriod ? (overview.fiscalPeriod?.status ?? "—") : "Not started"}</span>
          {hasFiscalPeriod && overview.fiscalPeriod?.closesInDays != null && (
            <StatusBadge status="warning" text={`Closes in ${overview.fiscalPeriod.closesInDays} days`} />
          )}
        </div>
        {showCompletionBar && (
          <div>
            <div className="mb-1 flex items-center justify-between text-sm font-medium text-foreground">
              <span>Completion</span>
              <span>{completionPercent}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, completionPercent)}%` }}
              />
            </div>
          </div>
        )}
        <div className="space-y-1 text-sm text-foreground">
          <OutstandingItem
            icon={unreconciled > 0 ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
            text={`Unreconciled transactions: ${unreconciled}`}
          />
          <OutstandingItem
            icon={unreconciled > 0 ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
            text={unreconciled > 0 ? "Bank reconciliation: Pending" : "Bank reconciliation: Completed"}
          />
          <OutstandingItem
            icon={unapprovedJournals > 0 ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
            text={`Unapproved journal entries: ${unapprovedJournals}`}
          />
          <OutstandingItem
            icon={inventoryVerified ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
            text={inventoryVerified ? "Inventory count: Verified" : "Inventory count: Not started"}
          />
          <OutstandingItem
            icon={missingReceipts > 0 ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
            text={`Missing expense receipts: ${missingReceipts}`}
          />
        </div>
        <button
          type="button"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveSection('period-close');
          }}
        >
          View Close Checklist <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TaxCompliance({
  overview,
  currency,
  router,
  setActiveSection,
}: {
  overview: AccountantOverview;
  currency: string;
  router: ReturnType<typeof useRouter>;
  setActiveSection: (section: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Receipt className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-foreground">Tax Liabilities & Compliance</h3>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Total Tax Liability</p>
          <p className="text-3xl font-bold text-foreground">{formatMoney(overview.taxSummary.totalLiability, currency)}</p>
        </div>
        <div className="space-y-2">
          <TaxBreakdown label="Sales Tax" amount={overview.taxSummary.salesTax} currency={currency} dueLabel="Due soon" tone="critical" />
          <TaxBreakdown label="VAT Payable" amount={overview.taxSummary.vatPayable} currency={currency} dueLabel="Due within 30 days" tone="warning" />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <StatusBadge status="critical" text={`${overview.taxSummary.upcomingDeadlines || 0} filings within 7 days`} />
          <StatusBadge status="warning" text="Monitor compliance timeline" />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-muted/60 p-3 text-sm">
          <span>
            Collected: <strong>{formatMoney(overview.taxSummary.collectionStatus.collected, currency)}</strong>
          </span>
          <span>
            Paid: <strong>{formatMoney(overview.taxSummary.collectionStatus.paid, currency)}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window !== 'undefined') {
              setActiveSection('financial-reports');
            }
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          View Tax Reports <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ApprovalQueue({
  tabs,
  activeTab,
  onChange,
  pendingExpenses,
  overview,
  currency,
  router,
  setActiveSection,
}: {
  tabs: ReturnType<typeof buildApprovalTabs>;
  activeTab: ActionTab;
  onChange: (tab: ActionTab) => void;
  pendingExpenses: ExpenseReport[];
  overview: AccountantOverview;
  currency: string;
  router: ReturnType<typeof useRouter>;
  setActiveSection: (section: string) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-foreground">Items Requiring Your Approval</h3>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold",
              activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <div className="pt-4">{renderApprovalContent(activeTab, pendingExpenses, overview, currency, router, setActiveSection)}</div>
    </section>
  );
}

function QuickActionsGrid({ actions }: { actions: QuickAction[] }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5" />
        <h3 className="text-lg font-semibold text-foreground">Quick Actions - Common Accounting Tasks</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={action.onClick}
            className="group rounded-xl border border-border p-4 text-left transition hover:shadow-md"
          >
            <action.icon className={cn("mb-2 h-6 w-6", action.colorClass)} />
            <p className="font-semibold text-foreground">{action.title}</p>
            <p className="text-xs text-muted-foreground">{action.description}</p>
            <ChevronRight className="mt-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </button>
        ))}
      </div>
    </section>
  );
}

function QuickStatsGrid({
  stats,
}: {
  stats: Array<{ label: string; value: string; subvalue?: string; onClick: () => void }>;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-semibold text-foreground">Quick Stats</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            className="rounded-xl border border-border p-4 text-left transition hover:shadow-md"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="text-lg font-semibold text-foreground">{stat.value}</p>
            {stat.subvalue && <p className="text-xs text-muted-foreground">{stat.subvalue}</p>}
          </button>
        ))}
      </div>
    </section>
  );
}

function RecentActivitySection({
  activity,
  currency,
  router,
  setActiveSection,
}: {
  activity: RecentActivityItem[];
  currency: string;
  router: ReturnType<typeof useRouter>;
  setActiveSection: (section: string) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold text-foreground">Recent Financial Activity - Last 7 Days</h3>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-primary hover:underline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveSection('reports-activity');
          }}
        >
          View All Activity <ArrowRight className="ml-1 inline h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounting activity recorded yet.</p>
        ) : (
          activity.map((item, idx) => (
            <div key={`${item.type}-${idx}`} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-muted/40">
              <div className="rounded-lg bg-muted/60 p-2">
                <ActivityIcon type={item.type} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-foreground">{item.description || "Activity"}</p>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(item.event_date)}</span>
                </div>
                {item.amount != null && (
                  <p className="text-xs text-muted-foreground">Amount: {formatMoney(item.amount, currency)}</p>
                )}
                <button className="text-xs font-semibold text-primary hover:underline">View transaction →</button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AlertRow({ severity, text, ctaLabel, onClick }: AlertConfig) {
  const palette =
    severity === "critical"
      ? "border-l-red-500 bg-red-50 text-red-900"
      : "border-l-amber-500 bg-amber-50 text-amber-900";
  const Icon = severity === "critical" ? XCircle : AlertCircle;

  return (
    <div className={cn("flex items-center justify-between border-l-4 p-3", palette)}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <span className="text-sm font-semibold">{text}</span>
      </div>
      <button
        type="button"
        className="rounded-lg border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted"
        onClick={onClick}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

function StatusBadge({ status, text }: { status: StatusTone; text: string }) {
  const tone: Record<StatusTone, string> = {
    critical: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    good: "bg-emerald-100 text-emerald-700",
    info: "bg-blue-100 text-blue-700",
  };
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", tone[status])}>{text}</span>;
}

function OutstandingItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function TaxBreakdown({
  label,
  amount,
  currency,
  dueLabel,
  tone,
}: {
  label: string;
  amount: number;
  currency: string;
  dueLabel: string;
  tone: StatusTone;
}) {
  const background = tone === "critical" ? "bg-red-50" : "bg-amber-50";
  const color = tone === "critical" ? "text-red-600" : "text-amber-600";
  return (
    <div className={cn("flex items-center justify-between rounded-xl p-3", background)}>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className={cn("text-xs", color)}>{dueLabel}</p>
      </div>
      <p className="text-sm font-semibold text-foreground">{formatMoney(amount, currency)}</p>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, ReactNode> = {
    customer_payment: <DollarSign className="h-4 w-4 text-emerald-600" />,
    supplier_bill: <FileText className="h-4 w-4 text-blue-600" />,
    journal_entry: <FileSpreadsheet className="h-4 w-4 text-purple-600" />,
  };
  return map[type] ?? <Activity className="h-4 w-4 text-slate-600" />;
}

function renderApprovalContent(
  tab: ActionTab,
  pendingExpenses: ExpenseReport[],
  overview: AccountantOverview,
  currency: string,
  router: ReturnType<typeof useRouter>,
  setActiveSection: (section: string) => void,
) {
  if (tab === "expenses") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">
          Expense Reports ({pendingExpenses.length} pending) • Total:{" "}
          {formatMoney(
            pendingExpenses.reduce((sum, expense) => sum + (expense.total_amount || 0), 0),
            currency,
          )}
        </p>
        {pendingExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expense reports awaiting approval.</p>
        ) : (
          pendingExpenses.map((expense) => (
            <div key={expense.expense_report_id} className="rounded-xl border border-border p-4 hover:bg-muted/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{expense.report_number}</p>
                  <p className="text-sm font-semibold text-foreground">{expense.title || "Untitled report"}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {expense.submitted_at ? formatRelativeTime(expense.submitted_at) : "—"} by{" "}
                    {expense.submitted_by_name ?? "Unknown"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-foreground">
                    {formatMoney(expense.total_amount, expense.currency || currency)}
                  </p>
                  <button
                    type="button"
                    className="mt-2 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (typeof window !== 'undefined') {
                        setActiveSection('expenses');
                      }
                    }}
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  if (tab === "stock") {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-semibold text-foreground">Stock adjustments awaiting approval</p>
        <p className="text-muted-foreground">
          {overview.actionItems.approvals.destroyedItems.count} adjustments totaling{" "}
          {formatMoney(overview.actionItems.approvals.destroyedItems.amount, currency)}
        </p>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window !== 'undefined') {
              setActiveSection('command-center');
            }
          }}
        >
          Open inventory approvals
        </button>
      </div>
    );
  }

  if (tab === "journal") {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-semibold text-foreground">Journal entries awaiting review</p>
        <p className="text-muted-foreground">
          {overview.actionItems.approvals.adjustmentJournals} journal entries require attention.
        </p>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window !== 'undefined') {
              setActiveSection('general-ledger');
            }
          }}
        >
          Review journal entries
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-xl border border-border p-3">
        <p className="font-semibold text-foreground">Purchase orders awaiting release</p>
        <p className="text-muted-foreground">
          {overview.actionItems.approvals.purchaseOrders.count} orders •{" "}
          {formatMoney(overview.actionItems.approvals.purchaseOrders.amount, currency)}
        </p>
      </div>
      <div className="rounded-xl border border-border p-3">
        <p className="font-semibold text-foreground">Supplier payment runs</p>
        <p className="text-muted-foreground">
          {overview.actionItems.approvals.supplierPayments.count} batches •{" "}
          {formatMoney(overview.actionItems.approvals.supplierPayments.amount, currency)}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveSection('purchases');
          }}
        >
          View purchase approvals
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveSection('purchases');
          }}
        >
          View payment runs
        </button>
      </div>
    </div>
  );
}

function buildMetricCards(overview: AccountantOverview, currency: string, router: ReturnType<typeof useRouter>, setActiveSection: (section: string) => void) {
  const cashOnHand = overview.cashPosition.cashOnHand ?? overview.cashPosition.totalCashOnHand ?? 0;
  const bankBalance = overview.cashPosition.bankBalance ?? 0;
  const totalFunds = overview.cashPosition.totalAvailableFunds ?? overview.cashPosition.availableCash ?? 0;
  const cashDeltaPercent =
    (overview.cashPosition.totalCashOnHand ?? 0) === 0
      ? "0%"
      : `${(
          (overview.cashPosition.changeVsYesterday /
            Math.max((overview.cashPosition.totalCashOnHand ?? 0) - overview.cashPosition.changeVsYesterday, 1)) *
          100
        ).toFixed(1)}%`;

  return [
    {
      title: "Total Funds",
      amount: formatMoney(totalFunds, currency),
      subtitle: `Cash: ${formatMoney(cashOnHand, currency)} • Bank: ${formatMoney(bankBalance, currency)}`,
      icon: Wallet,
      tone: "good" as StatusTone,
      body: (
        <>
          <p>
            Cash on hand: <span className="font-semibold text-foreground">{formatMoney(cashOnHand, currency)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Cash at bank: {formatMoney(bankBalance, currency)}
          </p>
        </>
      ),
      actions: [
        { label: "View Accounts", onClick: (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setActiveSection('chart-of-accounts'); } },
        { label: "Reconcile", onClick: (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setActiveSection('bank-reconciliation'); } },
      ],
    },
    {
      title: "Receivables Outstanding",
      amount: formatMoney(overview.receivables.totalOutstanding, currency),
      subtitle: `⚠️ ${formatMoney(overview.receivables.overdueAmount, currency)} overdue`,
      icon: TrendingUp,
      tone: "warning" as StatusTone,
      body: (
        <>
          <p>
            DSO: <span className="font-semibold text-amber-600">{overview.receivables.dso ?? "—"} days</span>
          </p>
          <p className="text-xs text-muted-foreground">Target: 30 days</p>
        </>
      ),
      actions: [
        { label: "View Aging", onClick: (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setActiveSection('invoices'); } },
        { label: "Collections", onClick: (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setActiveSection('payments'); } },
      ],
    },
    {
      title: "Payables Outstanding",
      amount: formatMoney(overview.payables.totalOutstanding, currency),
      subtitle: `⚠️ ${formatMoney(overview.payables.overdueBills, currency)} overdue`,
      icon: TrendingDown,
      tone: "warning" as StatusTone,
      body: (
        <>
          <p>
            DPO: <span className="font-semibold text-emerald-600">{overview.payables.dpo ?? "—"} days</span>
          </p>
          <p className="text-xs text-muted-foreground">Due this week: {formatMoney(overview.payables.dueThisWeek, currency)}</p>
        </>
      ),
      actions: [
        { label: "Schedule Pay", onClick: (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setActiveSection('purchases'); } },
        { label: "View Bills", onClick: (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setActiveSection('bills'); } },
      ],
    },
    {
      title: "Inventory Valuation",
      amount: formatMoney(overview.performanceSnapshot.inventory.totalValue, currency),
      subtitle: `Slow-moving stock: ${formatMoney(overview.performanceSnapshot.inventory.slowMovingValue, currency)}`,
      icon: Package,
      tone: "info" as StatusTone,
      body: (
        <>
          <p>Pending write-offs: {formatMoney(overview.performanceSnapshot.inventory.pendingWriteOffs, currency)}</p>
          <p className="text-xs text-muted-foreground">Monitor valuation trends</p>
        </>
      ),
      actions: [
        { label: "View Details", onClick: (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setActiveSection('command-center'); } },
        { label: "Approve", onClick: (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setActiveSection('expenses'); } },
      ],
    },
  ];
}

function buildAlertConfigs(overview: AccountantOverview, currency: string, router: ReturnType<typeof useRouter>, setActiveSection: (section: string) => void): AlertConfig[] {
  const alerts: AlertConfig[] = [];

  if (overview.actionItems.approvals.expenseReports.count > 0) {
    alerts.push({
      severity: "critical",
      text: `${overview.actionItems.approvals.expenseReports.count} expense reports awaiting approval (${formatMoney(
        overview.actionItems.approvals.expenseReports.amount,
        currency,
      )})`,
      ctaLabel: "Review now",
      onClick: (e?: React.MouseEvent) => { 
        e?.preventDefault(); 
        e?.stopPropagation(); 
        setActiveSection('expenses');
      },
    });
  }

  if (overview.criticalAlerts.unreconciledTransactions > 0) {
    alerts.push({
      severity: "critical",
      text: `${overview.criticalAlerts.unreconciledTransactions} bank transactions need reconciliation`,
      ctaLabel: "Reconcile",
      onClick: (e?: React.MouseEvent) => { 
        e?.preventDefault(); 
        e?.stopPropagation(); 
        setActiveSection('expenses');
      },
    });
  }

  if (overview.actionItems.approvals.purchaseOrders.count > 0) {
    alerts.push({
      severity: "warning",
      text: `${overview.actionItems.approvals.purchaseOrders.count} purchase orders waiting release (${formatMoney(
        overview.actionItems.approvals.purchaseOrders.amount,
        currency,
      )})`,
      ctaLabel: "Open purchases",
      onClick: (e?: React.MouseEvent) => { 
        e?.preventDefault(); 
        e?.stopPropagation(); 
        setActiveSection('purchases');
      },
    });
  }

  if (overview.taxSummary.upcomingDeadlines > 0) {
    alerts.push({
      severity: "warning",
      text: `${overview.taxSummary.upcomingDeadlines} tax filings due soon`,
      ctaLabel: "View tax",
      onClick: (e?: React.MouseEvent) => { 
        e?.preventDefault(); 
        e?.stopPropagation(); 
        setActiveSection('financial-reports');
      },
    });
  }

  const outstandingClose =
    overview.periodReadiness.outstandingItems.unreconciledTransactions +
    overview.periodReadiness.outstandingItems.unapprovedJournalEntries +
    overview.periodReadiness.outstandingItems.missingReceipts;

  if ((overview.fiscalPeriod?.closesInDays ?? null) !== null && outstandingClose > 0) {
    alerts.push({
      severity: "warning",
      text: `Period closes in ${overview.fiscalPeriod?.closesInDays ?? "—"} days • ${outstandingClose} close tasks remaining`,
      ctaLabel: "View checklist",
      onClick: (e?: React.MouseEvent) => { 
        e?.preventDefault(); 
        e?.stopPropagation(); 
        setActiveSection('period-close');
      },
    });
  }

  return alerts;
}

function buildQuickActions(router: ReturnType<typeof useRouter>, setActiveSection: (section: string) => void): QuickAction[] {
  return [
    { icon: DollarSign, title: "Record Customer Payment", description: "Apply receipts", colorClass: "text-blue-600", onClick: () => { setActiveSection('payments'); } },
    { icon: CreditCard, title: "Record Supplier Payment", description: "Pay bills", colorClass: "text-emerald-600", onClick: () => { setActiveSection('purchases'); } },
    { icon: FileText, title: "Create Journal Entry", description: "Post adjustments", colorClass: "text-purple-600", onClick: () => { setActiveSection('general-ledger'); } },
    { icon: Building2, title: "Bank Reconciliation", description: "Match transactions", colorClass: "text-indigo-600", onClick: () => { setActiveSection('bank-reconciliation'); } },
    { icon: BarChart3, title: "View Financial Reports", description: "P&L, Balance Sheet", colorClass: "text-orange-600", onClick: () => { setActiveSection('financial-reports'); } },
    { icon: Receipt, title: "Tax Reports", description: "Compliance ready", colorClass: "text-red-600", onClick: () => { setActiveSection('financial-reports'); } },
    { icon: CheckCircle, title: "Approve Stock Adjustments", description: "Write-offs, etc", colorClass: "text-teal-600", onClick: () => { setActiveSection('expenses'); } },
    { icon: Wallet, title: "Review Expenses", description: "Pending approvals", colorClass: "text-amber-600", onClick: () => { setActiveSection('expenses'); } },
    { icon: Calendar, title: "Period-End Checklist", description: "Close tasks", colorClass: "text-pink-600", onClick: () => { setActiveSection('period-close'); } },
  ];
}

function buildQuickStats(overview: AccountantOverview, currency: string, router: ReturnType<typeof useRouter>, setActiveSection: (section: string) => void) {
  return [
    {
      label: "Customers with balance",
      value: `${overview.quickStats.customersWithBalance} customers`,
      subvalue: formatMoney(overview.receivables.totalOutstanding, currency),
      onClick: () => { setActiveSection('invoices'); },
    },
    {
      label: "Suppliers with balance",
      value: `${overview.quickStats.suppliersWithBalance} suppliers`,
      subvalue: formatMoney(overview.payables.totalOutstanding, currency),
      onClick: () => { setActiveSection('bills'); },
    },
    {
      label: "Open Purchase Orders",
      value: formatMoney(overview.quickStats.openPurchaseOrders, currency),
      subvalue: `${overview.actionItems.approvals.purchaseOrders.count} awaiting release`,
      onClick: (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        setActiveSection('purchases');
      },
    },
    {
      label: "Open Sales Orders",
      value: formatMoney(overview.quickStats.openSalesOrders, currency),
      onClick: () => { setActiveSection('invoices'); },
    },
    {
      label: "Unposted Transactions",
      value: formatNumber(overview.quickStats.unpostedTransactions),
      subvalue: "Review before close",
      onClick: () => { setActiveSection('general-ledger'); },
    },
    {
      label: "Last Backup",
      value: overview.quickStats.lastBackupAt ? formatRelativeTime(overview.quickStats.lastBackupAt) : "No backups yet",
      onClick: () => { setActiveSection('settings'); },
    },
    {
      label: "Exchange Rates Updated",
      value: overview.quickStats.exchangeRatesUpdatedAt
        ? formatRelativeTime(overview.quickStats.exchangeRatesUpdatedAt)
        : "Not updated",
      onClick: () => { setActiveSection('settings'); },
    },
    {
      label: "Audit Alerts",
      value: `${overview.quickStats.auditAlerts} events`,
      onClick: () => { setActiveSection('settings'); },
    },
  ];
}

function buildApprovalTabs(overview: AccountantOverview, pendingExpenses: number) {
  return [
    { id: "expenses", label: "Expenses", count: pendingExpenses },
    { id: "stock", label: "Stock Adj", count: overview.actionItems.approvals.destroyedItems.count },
    { id: "journal", label: "Journal Entries", count: overview.actionItems.approvals.adjustmentJournals },
    {
      id: "other",
      label: "Other",
      count:
        overview.actionItems.approvals.purchaseOrders.count + overview.actionItems.approvals.supplierPayments.count,
    },
  ] as const;
}


export default AccountantDashboard;
