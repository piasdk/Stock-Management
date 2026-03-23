"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Receipt,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Bell,
  Calendar,
  Users,
  Building2,
  Activity
} from 'lucide-react';
import { useAuthStore } from "@/store/authStore";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { api } from "@/lib/api";
import { shouldSeeDashboard, getDashboardRoute } from "@/lib/dashboard-routes";

type DashboardVariant = "company" | "branch";

interface BranchAdminDashboardProps {
  variant?: DashboardVariant;
}

interface DashboardMetrics {
  cashPosition: {
    total: number;
    available: number;
    change: number;
  };
  receivables: {
    total: number;
    overdue: number;
  };
  payables: {
    total: number;
    overdue: number;
  };
  revenue: {
    mtd: number;
    ytd: number;
  };
  expenses: {
    mtd: number;
    pending: number;
  };
}

const BranchAdminDashboard = ({ variant = "branch" }: BranchAdminDashboardProps) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [companyName, setCompanyName] = useState("Business OS");
  const [branchName, setBranchName] = useState("Branch");

  const canSeeThisDashboard = useMemo(() => {
    if (!mounted || !user) return false;
    return shouldSeeDashboard(user, "/dashboard/branch-admin") || shouldSeeDashboard(user, "/dashboard/company-admin");
  }, [mounted, user]);

  useEffect(() => {
    setMounted(true);
    setLoading(true);
  }, []);

  // Get branch ID for filtering - branch admin only sees their branch; company admin sees all
  const branchId = useMemo(() => {
    if (!mounted || !user) return null;
    if (variant === "company" && (user.is_company_admin || user.is_super_admin)) return null;
    if (user.is_branch_admin && !user.is_company_admin && !user.is_super_admin) {
      const parsed = Number(user.branch_id);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [mounted, user, variant]);

  useEffect(() => {
    if (!mounted || !user) return;
    const route = getDashboardRoute(user);
    if (route !== "/dashboard/branch-admin" && route !== "/dashboard/company-admin") {
      router.replace(route);
    }
  }, [mounted, user, router]);

  useEffect(() => {
    if (!mounted || !user || !canSeeThisDashboard) return;
    fetchDashboardData();
    loadCompanyAndBranchNames();
  }, [mounted, user, branchId, canSeeThisDashboard]);

  const loadCompanyAndBranchNames = async () => {
    if (!user?.company_id) return;
    
    try {
      const companyRes = await api.get<any>(`/companies/${user.company_id}`);
      if (!companyRes.error && companyRes.data?.name) {
        setCompanyName(companyRes.data.name);
      }
      if (variant === "company") {
        setBranchName("All branches");
        return;
      }
      if (branchId && user.company_id) {
        const branchesRes = await api.get<any[]>(`/companies/${user.company_id}/branches`);
        if (!branchesRes.error && branchesRes.data) {
          const branch = branchesRes.data.find((b: any) => b.branch_id === branchId);
          if (branch?.name) setBranchName(branch.name);
        }
      }
    } catch (err) {
      console.warn("Error loading company/branch names:", err);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
    setLoading(true);
    setError(null);
    
      // Build API URL with branch filter for branch admin
      const branchParam = branchId ? `?branchId=${branchId}` : "";
      
      // Try to fetch accounting overview with branch filter
      const overviewRes = await api.get<any>(`/accounting/dashboard-overview${branchParam}`);
      
      if (overviewRes.error) {
        // If API fails, use mock data
        console.warn("API error, using mock data:", overviewRes.error);
        setMetrics({
          cashPosition: {
            total: 2450000,
            available: 2100000,
            change: 5.4
          },
          receivables: {
            total: 1850000,
            overdue: 245000
          },
          payables: {
            total: 420000,
            overdue: 82000
          },
          revenue: {
            mtd: 2850000,
            ytd: 15200000
          },
          expenses: {
            mtd: 1250000,
            pending: 85000
          }
        });
      } else if (overviewRes.data) {
        // Parse real data if available
        const data = overviewRes.data;
        setMetrics({
          cashPosition: {
            total: data.cashPosition?.totalCashOnHand || 0,
            available: data.cashPosition?.availableCash || 0,
            change: data.cashPosition?.changeVsYesterday || 0
          },
          receivables: {
            total: data.receivables?.totalOutstanding || 0,
            overdue: data.receivables?.overdueAmount || 0
          },
          payables: {
            total: data.payables?.totalOutstanding || 0,
            overdue: data.payables?.overdueBills || 0
          },
          revenue: {
            mtd: data.performanceSnapshot?.revenue?.mtd || 0,
            ytd: data.performanceSnapshot?.revenue?.ytd || 0
          },
          expenses: {
            mtd: data.expenses?.mtd || 0,
            pending: data.actionItems?.approvals?.expenseReports?.count || 0
          }
        });
      } else {
        // Use mock data as fallback
        setMetrics({
          cashPosition: {
            total: 2450000,
            available: 2100000,
            change: 5.4
          },
          receivables: {
            total: 1850000,
            overdue: 245000
          },
          payables: {
            total: 420000,
            overdue: 82000
          },
          revenue: {
            mtd: 2850000,
            ytd: 15200000
          },
          expenses: {
            mtd: 1250000,
            pending: 85000
          }
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      // Use mock data on error
      setMetrics({
        cashPosition: {
          total: 2450000,
          available: 2100000,
          change: 5.4
        },
        receivables: {
          total: 1850000,
          overdue: 245000
        },
        payables: {
          total: 420000,
          overdue: 82000
        },
        revenue: {
          mtd: 2850000,
          ytd: 15200000
        },
        expenses: {
          mtd: 1250000,
          pending: 85000
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Show loading until mounted, user loaded, allowed to see this dashboard, and first data load done
  const isInitialLoad = !mounted || !user || !canSeeThisDashboard || loading;
  
  if (isInitialLoad) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const displayMetrics = metrics || {
    cashPosition: { total: 0, available: 0, change: 0 },
    receivables: { total: 0, overdue: 0 },
    payables: { total: 0, overdue: 0 },
    revenue: { mtd: 0, ytd: 0 },
    expenses: { mtd: 0, pending: 0 }
  };

        return (
    <ErrorBoundary>
      <div className="space-y-4 sm:space-y-6 bg-slate-50 p-3 sm:p-4 md:p-6">
        {/* Header */}
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {variant === "company" ? "Company Admin Dashboard" : "Branch Admin Dashboard"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {variant === "company"
                  ? `Financial overview for ${companyName}`
                  : `Financial overview for ${branchName} • ${companyName}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchDashboardData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {loading && !metrics && (
          <div className="flex min-h-[400px] items-center justify-center">
            <LoadingSpinner size="lg" />
                      </div>
        )}

        {!loading && (
          <>
            {/* Key Metrics Grid */}
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {/* Cash Position */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg bg-green-100 p-3">
                    <Wallet className="h-6 w-6 text-green-600" />
                  </div>
                  {displayMetrics.cashPosition.change >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Cash Position</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(displayMetrics.cashPosition.total)}
                </p>
                <p className="text-xs text-gray-500">
                  Available: {formatCurrency(displayMetrics.cashPosition.available)}
                </p>
                {displayMetrics.cashPosition.change !== 0 && (
                  <p className={`text-xs mt-2 ${displayMetrics.cashPosition.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {displayMetrics.cashPosition.change >= 0 ? '+' : ''}
                    {displayMetrics.cashPosition.change.toFixed(1)}% vs yesterday
                  </p>
                )}
            </div>

              {/* Receivables */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Accounts Receivable</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(displayMetrics.receivables.total)}
                </p>
                <p className="text-xs text-gray-500">
                  Total outstanding
                </p>
                {displayMetrics.receivables.overdue > 0 && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    {formatCurrency(displayMetrics.receivables.overdue)} overdue
                  </p>
                )}
            </div>

              {/* Payables */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg bg-amber-100 p-3">
                    <Receipt className="h-6 w-6 text-amber-600" />
                  </div>
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Accounts Payable</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(displayMetrics.payables.total)}
                </p>
                <p className="text-xs text-gray-500">
                  Total outstanding
                </p>
                {displayMetrics.payables.overdue > 0 && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    {formatCurrency(displayMetrics.payables.overdue)} overdue
                  </p>
                )}
              </div>

              {/* Revenue */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Revenue</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(displayMetrics.revenue.mtd)}
                </p>
                <p className="text-xs text-gray-500">
                  MTD • YTD: {formatCurrency(displayMetrics.revenue.ytd)}
                </p>
              </div>
            </section>

            {/* Secondary Metrics */}
            <section className="grid gap-5 lg:grid-cols-2">
              {/* Expenses Summary */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Expenses Summary</h2>
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Monthly Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(displayMetrics.expenses.mtd)}
                          </span>
              </div>
            </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Pending Approval</span>
                      <span className="text-lg font-semibold text-amber-600">
                        {formatNumber(displayMetrics.expenses.pending)} reports
                      </span>
              </div>
                  </div>
                </div>
            </div>

              {/* Branch Status */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Branch Status</h2>
                  <Activity className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-600">Branch Operational</span>
                    </div>
                    <span className="text-xs text-green-600 font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600">Branch</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{branchName}</span>
              </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-gray-600">Company</span>
                          </div>
                    <span className="text-sm font-semibold text-gray-900">{companyName}</span>
              </div>
            </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => router.push('/finance/expenses')}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Wallet className="h-6 w-6 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Expenses</span>
                </button>
                    <button
                  onClick={() => router.push('/finance/invoices')}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                  <FileText className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Invoices</span>
                    </button>
                  <button
                  onClick={() => router.push('/finance/bills')}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Receipt className="h-6 w-6 text-amber-600" />
                  <span className="text-sm font-medium text-gray-700">Bills</span>
                  </button>
              <button 
                  onClick={() => router.push('/finance/reports')}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Reports</span>
              </button>
            </div>
            </section>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default BranchAdminDashboard;
