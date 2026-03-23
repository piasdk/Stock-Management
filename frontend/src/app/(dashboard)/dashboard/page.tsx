"use client";

import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
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
} from "lucide-react";
import { api } from "@/lib/api";
import { ROUTES, ROLE_CODES } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import { getDashboardRoute } from "@/lib/dashboard-routes";

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

const formatMoney = (value: number, currency = "USD") =>
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

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<AccountantOverview | null>(null);
  const [expenses, setExpenses] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActionTab>("expenses");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to role-specific dashboard when on /dashboard (so Company Admin etc. see their dashboard)
  useEffect(() => {
    if (!mounted || !user) return;
    const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
    const isOnRootDashboard = path === "/dashboard" || path === "/dashboard/";
    if (!isOnRootDashboard) return;
    const dashboardRoute = getDashboardRoute(user);
    if (dashboardRoute && dashboardRoute !== "/dashboard") {
      router.replace(dashboardRoute);
    }
  }, [mounted, user, pathname, router]);

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

  // Fetch accounting data only for users who should see this dashboard
  useEffect(() => {
    if (!mounted) return; // Wait for client-side mount
    if (!user) {
      return; // Wait for user to load
    }
    
    // Don't fetch if redirecting to operations dashboard
    const shouldRedirect = 
      user.role_code === ROLE_CODES.MANAGER || 
      (user.is_branch_admin && !user.is_company_admin && !user.is_super_admin);
    
    if (shouldRedirect) {
      return;
    }
    
    // Only fetch for super admins, company admins, and accountants
    const shouldShowAccountingDashboard = 
      user.is_super_admin || 
      user.is_company_admin || 
      user.role_code === ROLE_CODES.ACCOUNTANT;
    
    if (!shouldShowAccountingDashboard) {
      return;
    }
    
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user, user?.company_id]);

  // Show loading while waiting for mount, user, or redirecting
  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Wait for user to load
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // This page now only serves as a redirect handler
  // All users should be redirected to their role-specific dashboard
  const userDashboardRoute = getDashboardRoute(user);
  
  // Show loading while redirecting
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  const currency = overview?.currency || "USD";
  const pendingExpenses = expenses.filter((expense) => expense.status === "submitted");
  
  // Safely access user data with fallbacks
  const userData = (user && mounted) ? (user as Record<string, any>) : null;
  const userDisplayName = userData
    ? ([userData?.first_name, userData?.last_name].filter(Boolean).join(" ").trim() ||
       userData?.display_name ||
       userData?.email ||
       "Accountant")
    : "Accountant";
  
  // Determine role label: prefer role_name/role_code; Company Admin (one company) before Super Admin (platform-wide)
  let userRoleLabel = "User";
  if (userData) {
    if (userData?.role_name) {
      userRoleLabel = userData.role_name;
    } else if (userData?.role_code) {
      userRoleLabel = userData.role_code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (userData?.role) {
      userRoleLabel = userData.role;
    } else if (userData?.is_company_admin && userData?.company_id) {
      userRoleLabel = "Company Admin";
    } else if (userData?.is_super_admin) {
      userRoleLabel = "Super Admin";
    } else if (userData?.is_branch_admin) {
      userRoleLabel = "Branch Admin";
    }
  }
  
  const userBranchLabel = userData?.branch?.name || userData?.branch_name || userData?.branch_code || "All branches";

  const metricCards = buildMetricCards(overview, currency, router);
  const alerts = buildAlertConfigs(overview, currency, router);
  const quickActions = buildQuickActions(router);
  const quickStats = buildQuickStats(overview, currency, router);
  const approvalTabs = buildApprovalTabs(overview, pendingExpenses.length);

  return (
    <ErrorBoundary>
      <div className="space-y-4 sm:space-y-6 bg-slate-50 p-3 sm:p-4 md:p-6">
        <Header
          overview={overview}
          userName={userDisplayName}
          alertCount={alerts.length}
          notifications={alerts}
          notificationsOpen={notificationsOpen}
          onToggleNotifications={() => setNotificationsOpen((prev) => !prev)}
          onRefresh={fetchData}
        />

        <AlertBar alerts={alerts} />

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <PeriodStatus overview={overview} router={router} />
          <TaxCompliance overview={overview} currency={currency} router={router} />
        </section>

        <ApprovalQueue
          tabs={approvalTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          pendingExpenses={pendingExpenses}
          overview={overview}
          currency={currency}
          router={router}
        />

        <QuickActionsGrid actions={quickActions} />

        <QuickStatsGrid stats={quickStats} />

        <RecentActivitySection activity={overview.recentActivity} currency={currency} router={router} />
      </div>
    </ErrorBoundary>
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

function PeriodStatus({ overview, router }: { overview: AccountantOverview; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-foreground">Period Close: {overview.fiscalPeriod?.period_name ?? "—"}</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Status: {overview.fiscalPeriod?.status ?? "—"}</span>
          <StatusBadge status="warning" text={`Closes in ${overview.fiscalPeriod?.closesInDays ?? "—"} days`} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-sm font-medium text-foreground">
            <span>Completion</span>
            <span>{overview.periodReadiness.completionPercent}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${overview.periodReadiness.completionPercent}%` }}
            />
          </div>
        </div>
        <div className="space-y-1 text-sm text-foreground">
          <OutstandingItem
            icon={<XCircle className="h-4 w-4 text-red-500" />}
            text={`${overview.periodReadiness.outstandingItems.unreconciledTransactions} unreconciled transactions`}
          />
          <OutstandingItem
            icon={<XCircle className="h-4 w-4 text-red-500" />}
            text={`${overview.periodReadiness.outstandingItems.unapprovedJournalEntries} unapproved journal entries`}
          />
          <OutstandingItem icon={<CheckCircle className="h-4 w-4 text-emerald-500" />} text="Bank reconciliation completed" />
          <OutstandingItem
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            text={`Inventory count ${overview.periodReadiness.outstandingItems.inventoryVerified ? "verified" : "pending"}`}
          />
          <OutstandingItem
            icon={<XCircle className="h-4 w-4 text-red-500" />}
            text={`${overview.periodReadiness.outstandingItems.missingReceipts} missing expense receipts`}
          />
        </div>
        <button
          type="button"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          onClick={() => router.push(`${ROUTES.REPORTS}?view=close`)}
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
}: {
  overview: AccountantOverview;
  currency: string;
  router: ReturnType<typeof useRouter>;
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
          onClick={() => router.push(`${ROUTES.REPORTS}?view=tax`)}
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
}: {
  tabs: ReturnType<typeof buildApprovalTabs>;
  activeTab: ActionTab;
  onChange: (tab: ActionTab) => void;
  pendingExpenses: ExpenseReport[];
  overview: AccountantOverview;
  currency: string;
  router: ReturnType<typeof useRouter>;
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
      <div className="pt-4">{renderApprovalContent(activeTab, pendingExpenses, overview, currency, router)}</div>
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
}: {
  activity: RecentActivityItem[];
  currency: string;
  router: ReturnType<typeof useRouter>;
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
          onClick={() => router.push(`${ROUTES.REPORTS}?view=activity`)}
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
                    onClick={() => router.push(`${ROUTES.EXPENSES}?report=${expense.expense_report_id}`)}
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
          onClick={() => router.push(ROUTES.INVENTORY)}
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
          onClick={() => router.push(`${ROUTES.ACCOUNTING}/journal-entries`)}
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
          onClick={() => router.push(ROUTES.PURCHASES)}
        >
          View purchase approvals
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
          onClick={() => router.push(`${ROUTES.PURCHASES}?view=payments`)}
        >
          View payment runs
        </button>
      </div>
    </div>
  );
}

function buildMetricCards(overview: AccountantOverview, currency: string, router: ReturnType<typeof useRouter>) {
  const cashDeltaPercent =
    overview.cashPosition.totalCashOnHand === 0
      ? "0%"
      : `${(
          (overview.cashPosition.changeVsYesterday /
            Math.max(overview.cashPosition.totalCashOnHand - overview.cashPosition.changeVsYesterday, 1)) *
          100
        ).toFixed(1)}%`;

  return [
    {
      title: "Cash on Hand",
      amount: formatMoney(overview.cashPosition.totalCashOnHand, currency),
      subtitle: `↑ ${formatMoney(overview.cashPosition.changeVsYesterday, currency)} (${cashDeltaPercent}) vs yesterday`,
      icon: Wallet,
      tone: "good" as StatusTone,
      body: (
        <>
          <p>
            Available: <span className="font-semibold text-foreground">{formatMoney(overview.cashPosition.availableCash, currency)}</span>
          </p>
          <p className="text-xs text-muted-foreground">(after commitments)</p>
        </>
      ),
      actions: [
        { label: "View Accounts", onClick: () => router.push(ROUTES.SUPPLIERS) },
        { label: "Reconcile", onClick: () => router.push(ROUTES.EXPENSES) },
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
        { label: "View Aging", onClick: () => router.push(ROUTES.CUSTOMERS) },
        { label: "Collections", onClick: () => router.push(`${ROUTES.CUSTOMERS}?view=collections`) },
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
        { label: "Schedule Pay", onClick: () => router.push(ROUTES.PURCHASES) },
        { label: "View Bills", onClick: () => router.push(`${ROUTES.PURCHASES}?view=bills`) },
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
        { label: "View Details", onClick: () => router.push(ROUTES.INVENTORY) },
        { label: "Approve", onClick: () => router.push(`${ROUTES.INVENTORY}?view=approvals`) },
      ],
    },
  ];
}

function buildAlertConfigs(overview: AccountantOverview, currency: string, router: ReturnType<typeof useRouter>): AlertConfig[] {
  const alerts: AlertConfig[] = [];

  if (overview.actionItems.approvals.expenseReports.count > 0) {
    alerts.push({
      severity: "critical",
      text: `${overview.actionItems.approvals.expenseReports.count} expense reports awaiting approval (${formatMoney(
        overview.actionItems.approvals.expenseReports.amount,
        currency,
      )})`,
      ctaLabel: "Review now",
      onClick: () => router.push(ROUTES.EXPENSES),
    });
  }

  if (overview.criticalAlerts.unreconciledTransactions > 0) {
    alerts.push({
      severity: "critical",
      text: `${overview.criticalAlerts.unreconciledTransactions} bank transactions need reconciliation`,
      ctaLabel: "Reconcile",
      onClick: () => router.push(ROUTES.EXPENSES),
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
      onClick: () => router.push(ROUTES.PURCHASES),
    });
  }

  if (overview.taxSummary.upcomingDeadlines > 0) {
    alerts.push({
      severity: "warning",
      text: `${overview.taxSummary.upcomingDeadlines} tax filings due soon`,
      ctaLabel: "View tax",
      onClick: () => router.push(`${ROUTES.REPORTS}?view=tax`),
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
      onClick: () => router.push(`${ROUTES.REPORTS}?view=close`),
    });
  }

  return alerts;
}

function buildQuickActions(router: ReturnType<typeof useRouter>): QuickAction[] {
  return [
    { icon: DollarSign, title: "Record Customer Payment", description: "Apply receipts", colorClass: "text-blue-600", onClick: () => router.push(ROUTES.SALES) },
    { icon: CreditCard, title: "Record Supplier Payment", description: "Pay bills", colorClass: "text-emerald-600", onClick: () => router.push(ROUTES.PURCHASES) },
    { icon: FileText, title: "Create Journal Entry", description: "Post adjustments", colorClass: "text-purple-600", onClick: () => router.push(`${ROUTES.ACCOUNTING}/journal-entries`) },
    { icon: Building2, title: "Bank Reconciliation", description: "Match transactions", colorClass: "text-indigo-600", onClick: () => router.push(ROUTES.EXPENSES) },
    { icon: BarChart3, title: "View Financial Reports", description: "P&L, Balance Sheet", colorClass: "text-orange-600", onClick: () => router.push(ROUTES.REPORTS) },
    { icon: Receipt, title: "Tax Reports", description: "Compliance ready", colorClass: "text-red-600", onClick: () => router.push(`${ROUTES.REPORTS}?view=tax`) },
    { icon: CheckCircle, title: "Approve Stock Adjustments", description: "Write-offs, etc", colorClass: "text-teal-600", onClick: () => router.push(`${ROUTES.INVENTORY}?view=approvals`) },
    { icon: Wallet, title: "Review Expenses", description: "Pending approvals", colorClass: "text-amber-600", onClick: () => router.push(ROUTES.EXPENSES) },
    { icon: Calendar, title: "Period-End Checklist", description: "Close tasks", colorClass: "text-pink-600", onClick: () => router.push(`${ROUTES.REPORTS}?view=close`) },
  ];
}

function buildQuickStats(overview: AccountantOverview, currency: string, router: ReturnType<typeof useRouter>) {
  return [
    {
      label: "Customers with balance",
      value: `${overview.quickStats.customersWithBalance} customers`,
      subvalue: formatMoney(overview.receivables.totalOutstanding, currency),
      onClick: () => router.push(ROUTES.CUSTOMERS),
    },
    {
      label: "Suppliers with balance",
      value: `${overview.quickStats.suppliersWithBalance} suppliers`,
      subvalue: formatMoney(overview.payables.totalOutstanding, currency),
      onClick: () => router.push(ROUTES.SUPPLIERS),
    },
    {
      label: "Open Purchase Orders",
      value: formatMoney(overview.quickStats.openPurchaseOrders, currency),
      subvalue: `${overview.actionItems.approvals.purchaseOrders.count} awaiting release`,
      onClick: () => router.push(ROUTES.PURCHASES),
    },
    {
      label: "Open Sales Orders",
      value: formatMoney(overview.quickStats.openSalesOrders, currency),
      onClick: () => router.push(ROUTES.SALES),
    },
    {
      label: "Unposted Transactions",
      value: formatNumber(overview.quickStats.unpostedTransactions),
      subvalue: "Review before close",
      onClick: () => router.push(`${ROUTES.ACCOUNTING}/journal-entries`),
    },
    {
      label: "Last Backup",
      value: overview.quickStats.lastBackupAt ? formatRelativeTime(overview.quickStats.lastBackupAt) : "No backups yet",
      onClick: () => router.push(`${ROUTES.SETTINGS}?tab=backup`),
    },
    {
      label: "Exchange Rates Updated",
      value: overview.quickStats.exchangeRatesUpdatedAt
        ? formatRelativeTime(overview.quickStats.exchangeRatesUpdatedAt)
        : "Not updated",
      onClick: () => router.push(`${ROUTES.SETTINGS}?tab=currency`),
    },
    {
      label: "Audit Alerts",
      value: `${overview.quickStats.auditAlerts} events`,
      onClick: () => router.push(`${ROUTES.SETTINGS}?tab=audit`),
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

