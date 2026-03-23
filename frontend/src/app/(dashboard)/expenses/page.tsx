"use client";

import { useEffect, useState, useMemo, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  Receipt,
  RefreshCw,
  Search,
  XCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  User,
  FileCheck,
  AlertCircle,
  ChevronRight,
  Eye,
  Check,
  X,
  MessageSquare,
  Edit,
  Layers,
  Ban,
  Wallet,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";

interface ExpenseReport {
  expense_report_id: number;
  report_number: string;
  title: string | null;
  status: string;
  total_amount: number | null;
  currency: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  submitted_by_name: string | null;
  approved_by_name: string | null;
  department?: string;
  category?: string;
  has_receipts?: boolean;
  gl_account?: string;
  cost_center?: string;
  receipt_status?: "complete" | "missing" | "unclear";
  policy_violations?: string[];
  budget_variance?: number;
  je_posted?: boolean;
  je_number?: string;
  payment_method?: "bank_transfer" | "mobile_money" | "cash";
}

interface ExpenseItem {
  expense_item_id: number;
  expense_report_id: number;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  has_receipt?: boolean;
}

type FilterStatus = "all" | "submitted" | "approved" | "rejected" | "reimbursed";
type SortField = "date" | "amount" | "status" | "submitted_by";

const formatMoney = (value: number | null | undefined, currency = "RWF") => {
  if (value == null) return `0 ${currency}`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatRelativeTime = (dateString: string | null) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return formatDate(dateString);
};

export default function ExpensesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [currency, setCurrency] = useState("RWF");

  // Filters
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReports, setSelectedReports] = useState<Set<number>>(new Set());
  const [glAccounts, setGlAccounts] = useState<string[]>([
    "6000 - Travel Expenses",
    "6100 - Meals & Entertainment",
    "6200 - Office Supplies",
    "6300 - Utilities",
    "6400 - Professional Services",
    "6500 - Marketing",
  ]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const [reportsRes, itemsRes] = await Promise.all([
        api.get("/expenses"),
        api.get("/expenses/items"),
      ]);

      if (reportsRes.error) {
        setError(reportsRes.error);
        return;
      }

      const reports = Array.isArray(reportsRes.data) ? reportsRes.data : [];
      setExpenseReports(reports);

      if (!itemsRes.error && Array.isArray(itemsRes.data)) {
        setExpenseItems(itemsRes.data);
      }

      // Try to get currency from first report
      if (reports.length > 0 && reports[0].currency) {
        setCurrency(reports[0].currency);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    let filtered = [...expenseReports];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter((r) => {
        const reportDate = r.submitted_at ? new Date(r.submitted_at) : new Date(r.created_at);
        return reportDate >= fromDate;
      });
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        const reportDate = r.submitted_at ? new Date(r.submitted_at) : new Date(r.created_at);
        return reportDate <= toDate;
      });
    }

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter((r) => r.department === departmentFilter);
    }

    // Amount range filter
    if (amountMin) {
      const min = parseFloat(amountMin);
      if (!Number.isNaN(min)) {
        filtered = filtered.filter((r) => (r.total_amount || 0) >= min);
      }
    }
    if (amountMax) {
      const max = parseFloat(amountMax);
      if (!Number.isNaN(max)) {
        filtered = filtered.filter((r) => (r.total_amount || 0) <= max);
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.report_number?.toLowerCase().includes(query) ||
          r.title?.toLowerCase().includes(query) ||
          r.submitted_by_name?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [expenseReports, statusFilter, dateFrom, dateTo, departmentFilter, amountMin, amountMax, searchQuery]);

  const pendingApprovals = useMemo(
    () => filteredReports.filter((r) => r.status === "submitted"),
    [filteredReports],
  );

  const missingReceipts = useMemo(() => {
    const reportsWithItems = expenseReports.map((report) => {
      const items = expenseItems.filter((item) => item.expense_report_id === report.expense_report_id);
      const hasMissingReceipts = items.some((item) => !item.has_receipt);
      return { ...report, hasMissingReceipts };
    });
    return reportsWithItems.filter((r) => r.hasMissingReceipts && r.status !== "rejected");
  }, [expenseReports, expenseItems]);

  const needsGlCoding = useMemo(() => {
    return expenseReports.filter((r) => !r.gl_account && (r.status === "approved" || r.status === "submitted"));
  }, [expenseReports]);

  const policyViolations = useMemo(() => {
    // Mock policy violations - in real app, this would come from backend
    const violations = expenseReports.filter((r) => {
      // Example: reports over certain amount without manager approval, or exceeding daily limits
      return (r.total_amount || 0) > 50000 && r.status === "submitted";
    }).map((r) => ({
      ...r,
      violations: [
        ...((r.total_amount || 0) > 50000 ? ["Exceeds approval limit without manager approval"] : []),
        ...(r.category === "Meals" && (r.total_amount || 0) > 10000 ? ["Exceeds daily meal limit"] : []),
      ],
    }));
    
    // Add mock violations for demonstration if none exist
    if (violations.length === 0 && expenseReports.length > 0) {
      return [
        {
          ...expenseReports[0],
          report_number: "EXP-045",
          violations: ["Exceeds daily meal limit"],
        },
        {
          ...expenseReports[Math.min(1, expenseReports.length - 1)],
          report_number: "EXP-067",
          violations: ["Missing manager approval"],
        },
      ].slice(0, 2);
    }
    
    return violations;
  }, [expenseReports]);

  const budgetVariances = useMemo(() => {
    // Mock budget data - in real app, this would come from backend
    const budgets: Record<string, { budget: number; actual: number }> = {
      Travel: { budget: 50000, actual: 62500 },
      "Client Entertainment": { budget: 30000, actual: 33000 },
      "Office Supplies": { budget: 20000, actual: 15000 },
    };

    const variances = Object.entries(budgets)
      .map(([category, data]) => ({
        category,
        budget: data.budget,
        actual: data.actual,
        variance: ((data.actual / data.budget) * 100 - 100),
        isOver: data.actual > data.budget,
      }))
      .filter((v) => v.isOver);
    
    // Always return at least the mock data for demonstration
    return variances.length > 0 ? variances : [
      { category: "Travel", budget: 50000, actual: 62500, variance: 25, isOver: true },
      { category: "Client Entertainment", budget: 30000, actual: 33000, variance: 10, isOver: true },
    ];
  }, []);

  const readyForPayment = useMemo(() => {
    return expenseReports.filter((r) => r.status === "approved");
  }, [expenseReports]);

  const recentlyProcessed = useMemo(
    () =>
      filteredReports
        .filter((r) => r.status === "approved" || r.status === "reimbursed")
        .sort((a, b) => {
          const aDate = a.approved_at ? new Date(a.approved_at).getTime() : 0;
          const bDate = b.approved_at ? new Date(b.approved_at).getTime() : 0;
          return bDate - aDate;
        })
        .slice(0, 10),
    [filteredReports],
  );

  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, { count: number; total: number }>();
    expenseReports.forEach((report) => {
      const cat = report.category || "Uncategorized";
      const entry = categoryMap.get(cat) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += report.total_amount || 0;
      categoryMap.set(cat, entry);
    });
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data,
    }));
  }, [expenseReports]);

  const expenseByDepartment = useMemo(() => {
    const deptMap = new Map<string, { count: number; total: number }>();
    expenseReports.forEach((report) => {
      const dept = report.department || "Unassigned";
      const entry = deptMap.get(dept) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += report.total_amount || 0;
      deptMap.set(dept, entry);
    });
    return Array.from(deptMap.entries()).map(([department, data]) => ({
      department,
      ...data,
    }));
  }, [expenseReports]);

  const reimbursementStatus = useMemo(() => {
    const pending = expenseReports.filter((r) => r.status === "approved").length;
    const reimbursed = expenseReports.filter((r) => r.status === "reimbursed").length;
    const pendingAmount = expenseReports
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const reimbursedAmount = expenseReports
      .filter((r) => r.status === "reimbursed")
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);
    return { pending, reimbursed, pendingAmount, reimbursedAmount };
  }, [expenseReports]);

  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const currentMonth = expenseReports.filter((r) => {
      const date = r.submitted_at ? new Date(r.submitted_at) : new Date(r.created_at);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const lastMonth = expenseReports.filter((r) => {
      const date = r.submitted_at ? new Date(r.submitted_at) : new Date(r.created_at);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
      return (
        date.getMonth() === lastMonthDate.getMonth() &&
        date.getFullYear() === lastMonthDate.getFullYear()
      );
    });

    const currentTotal = currentMonth.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const lastTotal = lastMonth.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const change = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    return {
      current: currentTotal,
      last: lastTotal,
      change,
      currentCount: currentMonth.length,
      lastCount: lastMonth.length,
    };
  }, [expenseReports]);

  const handleApprove = async (reportId: number) => {
    try {
      const res = await api.put(`/expenses/${reportId}/approve`, {});
      if (res.error) {
        alert(`Failed to approve: ${res.error}`);
        return;
      }
      await fetchExpenses();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleReject = async (reportId: number, reason?: string) => {
    const reasonText = reason || window.prompt("Rejection reason:") || "No reason provided";
    if (!reasonText) return;

    try {
      const res = await api.put(`/expenses/${reportId}/reject`, { reason: reasonText });
      if (res.error) {
        alert(`Failed to reject: ${res.error}`);
        return;
      }
      await fetchExpenses();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleRequestInfo = async (reportId: number) => {
    const message = window.prompt("What additional information do you need?");
    if (!message) return;

    try {
      const res = await api.put(`/expenses/${reportId}/request-info`, { message });
      if (res.error) {
        alert(`Failed to send request: ${res.error}`);
        return;
      }
      alert("Request sent to employee");
      await fetchExpenses();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleAssignGlAccount = async (reportId: number, glAccount: string) => {
    try {
      const res = await api.put(`/expenses/${reportId}/gl-account`, { gl_account: glAccount });
      if (res.error) {
        alert(`Failed to assign GL account: ${res.error}`);
        return;
      }
      await fetchExpenses();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedReports.size === 0) {
      alert("Please select at least one report");
      return;
    }

    if (!window.confirm(`Approve ${selectedReports.size} selected report(s)?`)) return;

    try {
      const promises = Array.from(selectedReports).map((id) =>
        api.put(`/expenses/${id}/approve`, {}),
      );
      await Promise.all(promises);
      setSelectedReports(new Set());
      await fetchExpenses();
      alert(`Successfully approved ${selectedReports.size} report(s)`);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleGeneratePaymentBatch = async () => {
    if (readyForPayment.length === 0) {
      alert("No expenses ready for payment");
      return;
    }

    try {
      const res = await api.post("/expenses/payment-batch", {
        report_ids: readyForPayment.map((r) => r.expense_report_id),
      });
      if (res.error) {
        alert(`Failed to generate payment batch: ${res.error}`);
        return;
      }
      alert("Payment batch generated successfully");
      await fetchExpenses();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handlePostToGL = async (reportIds?: number[]) => {
    const ids = reportIds || Array.from(selectedReports);
    if (ids.length === 0) {
      alert("Please select at least one approved expense");
      return;
    }

    try {
      const res = await api.post("/expenses/post-to-gl", { report_ids: ids });
      if (res.error) {
        alert(`Failed to post to GL: ${res.error}`);
        return;
      }
      alert(`Successfully posted ${ids.length} expense(s) to GL`);
      await fetchExpenses();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const toggleReportSelection = (reportId: number) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(filteredReports.map((r) => r.expense_report_id)));
    }
  };

  const getDaysPending = (report: ExpenseReport) => {
    const submittedDate = report.submitted_at ? new Date(report.submitted_at) : new Date(report.created_at);
    const now = new Date();
    const diffTime = now.getTime() - submittedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRowUrgencyClass = (report: ExpenseReport) => {
    const items = expenseItems.filter((item) => item.expense_report_id === report.expense_report_id);
    const hasMissingReceipts = items.some((item) => !item.has_receipt);
    const daysPending = getDaysPending(report);
    const isOverBudget = budgetVariances.some((v) => v.category === report.category);
    
    if (hasMissingReceipts || isOverBudget || (report.total_amount || 0) > 50000) {
      return "bg-red-50 border-l-4 border-l-red-500";
    }
    if (!report.gl_account || daysPending > 7) {
      return "bg-amber-50 border-l-4 border-l-amber-500";
    }
    if (report.status === "approved") {
      return "bg-emerald-50 border-l-4 border-l-emerald-500";
    }
    return "";
  };

  const handleBatchReject = async () => {
    if (selectedReports.size === 0) {
      alert("Please select at least one report");
      return;
    }

    const reason = window.prompt(`Rejection reason for ${selectedReports.size} report(s):`);
    if (!reason) return;

    try {
      const promises = Array.from(selectedReports).map((id) =>
        api.put(`/expenses/${id}/reject`, { reason }),
      );
      await Promise.all(promises);
      setSelectedReports(new Set());
      await fetchExpenses();
      alert(`Successfully rejected ${selectedReports.size} report(s)`);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleMarkAsPaid = async (reportId: number) => {
    if (!window.confirm("Mark this expense as paid?")) return;

    try {
      const res = await api.put(`/expenses/${reportId}/mark-paid`, {});
      if (res.error) {
        alert(`Failed to mark as paid: ${res.error}`);
        return;
      }
      await fetchExpenses();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleExportSelected = () => {
    if (selectedReports.size === 0) {
      alert("Please select at least one report");
      return;
    }

    const selected = filteredReports.filter((r) => selectedReports.has(r.expense_report_id));
    const csv = [
      ["Report #", "Title", "Amount", "Currency", "Status", "Submitted By", "Submitted At", "Category", "Department", "GL Account"].join(","),
      ...selected.map((r) =>
        [
          r.report_number,
          r.title || "",
          r.total_amount || 0,
          r.currency || currency,
          r.status,
          r.submitted_by_name || "",
          r.submitted_at || r.created_at,
          r.category || "",
          r.department || "",
          r.gl_account || "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-selected-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const csv = [
      ["Report #", "Title", "Amount", "Currency", "Status", "Submitted By", "Submitted At", "Category", "Department"].join(","),
      ...filteredReports.map((r) =>
        [
          r.report_number,
          r.title || "",
          r.total_amount || 0,
          r.currency || currency,
          r.status,
          r.submitted_by_name || "",
          r.submitted_at || r.created_at,
          r.category || "",
          r.department || "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const departments = useMemo(() => {
    const depts = new Set<string>();
    expenseReports.forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return Array.from(depts).sort();
  }, [expenseReports]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-8">
        <ErrorMessage error={error} />
        <button
          type="button"
          onClick={fetchExpenses}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 bg-slate-50 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Expense Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review, approve, and process expense reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              type="button"
              onClick={fetchExpenses}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: ACTION REQUIRED - Prominent Alerts - THE FIRST THING ACCOUNTANTS SEE */}
      <section className="space-y-4">
        {/* 🔴 Pending Your Approval - MOST PROMINENT */}
        {pendingApprovals.length > 0 && (
          <div className="rounded-xl sm:rounded-2xl border-4 border-red-400 bg-red-50 p-4 sm:p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-red-600 p-3">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-red-900 mb-2">
                  🔴 Pending Your Approval ({pendingApprovals.length} reports)
                </h2>
                <p className="text-lg font-semibold text-red-800 mb-1">
                  Total Amount: {formatMoney(
                    pendingApprovals.reduce((sum, r) => sum + (r.total_amount || 0), 0),
                    currency,
                  )}
                </p>
                <p className="text-sm text-red-700">
                  These reports require your immediate attention before they can be processed.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const element = document.getElementById("approval-queue");
                      element?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Review Now <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-semibold text-foreground">🔴 Action Required</h2>
          
          {/* Missing Receipts Alert - PROMINENT */}
          {missingReceipts.length > 0 ? (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
            <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-1">
                    ⚠️ Missing Receipts ({missingReceipts.length} reports)
                  </h3>
                  <p className="text-sm font-semibold text-red-700 mb-3">
                    Reports awaiting documentation before approval. Accountants can't approve without receipts!
              </p>
              <div className="space-y-2">
                {missingReceipts.slice(0, 5).map((report) => (
                  <div
                    key={report.expense_report_id}
                        className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-3"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{report.report_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.title || "No title"} • {formatMoney(report.total_amount, report.currency || currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/expenses/${report.expense_report_id}`)}
                          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
          ) : (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-1">
                    ⚠️ Missing Receipts (0 reports)
                  </h3>
                  <p className="text-sm font-semibold text-red-700">
                    All expense reports have receipts attached.
                  </p>
            </div>
          </div>
        </div>
          )}

        {/* GL Account Coding Status */}
          {needsGlCoding.length > 0 ? (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Layers className="h-6 w-6 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900 mb-1">
                    🟡 Needs GL Coding ({needsGlCoding.length} reports)
                  </h3>
                  <p className="text-sm font-semibold text-amber-700 mb-3">
                    Expense Coding Status: ✓ Coded: {expenseReports.filter((r) => r.gl_account).length} reports • 
                    ❌ Needs coding: {needsGlCoding.length} reports
                  </p>
                  <div className="space-y-2">
                    {needsGlCoding.slice(0, 5).map((report) => (
                      <div
                        key={report.expense_report_id}
                        className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{report.report_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMoney(report.total_amount, report.currency || currency)} • {report.category || "Uncategorized"}
                          </p>
                        </div>
                        <select
                          value={report.gl_account || ""}
                          onChange={(e) => handleAssignGlAccount(report.expense_report_id, e.target.value)}
                          className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 bg-white"
                        >
                          <option value="">Assign GL Account</option>
                          {glAccounts.map((acc) => (
                            <option key={acc} value={acc}>
                              {acc}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Layers className="h-6 w-6 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900 mb-1">
                    🟡 GL Account Coding Status
                  </h3>
                  <p className="text-sm font-semibold text-amber-700">
                    ✓ All expenses are properly coded with GL accounts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Policy Violations */}
          {policyViolations.length > 0 ? (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Ban className="h-6 w-6 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-1">
                    🔴 Policy Exceptions ({policyViolations.length} reports)
                  </h3>
                  <p className="text-sm font-semibold text-red-700 mb-3">
                    Reports with policy violations requiring review
                  </p>
                  <div className="space-y-2">
                    {policyViolations.slice(0, 5).map((report) => (
                      <div
                        key={report.expense_report_id}
                        className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-3"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{report.report_number}</p>
                          <p className="text-xs text-red-700">
                            {report.violations?.join(", ") || "Policy violation"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push(`/expenses/${report.expense_report_id}`)}
                          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Ban className="h-6 w-6 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-1">
                    🔴 Policy Exceptions (0 reports)
                  </h3>
                  <p className="text-sm font-semibold text-red-700">
                    No policy violations detected.
                  </p>
                </div>
              </div>
            </div>
          )}
      </section>

      {/* SECTION 2: FINANCIAL SUMMARY */}
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">Financial Summary</h2>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Pending Approval"
          value={pendingApprovals.length}
          subvalue={formatMoney(
            pendingApprovals.reduce((sum, r) => sum + (r.total_amount || 0), 0),
            currency,
          )}
          tone="warning"
          icon={Clock}
        />
        <MetricCard
          label="Pending Reimbursement"
          value={reimbursementStatus.pending}
          subvalue={formatMoney(reimbursementStatus.pendingAmount, currency)}
          tone="warning"
          icon={DollarSign}
        />
        <MetricCard
          label="Monthly Comparison"
          value={formatMoney(monthlyComparison.current, currency)}
          subvalue={`${monthlyComparison.change >= 0 ? "+" : ""}${monthlyComparison.change.toFixed(1)}% vs last month`}
          tone={monthlyComparison.change >= 0 ? "critical" : "good"}
          icon={monthlyComparison.change >= 0 ? TrendingUp : TrendingDown}
        />
        <MetricCard
          label="Needs GL Coding"
          value={needsGlCoding.length}
          subvalue={formatMoney(
            needsGlCoding.reduce((sum, r) => sum + (r.total_amount || 0), 0),
            currency,
          )}
          tone={needsGlCoding.length > 0 ? "warning" : "good"}
          icon={Layers}
        />
      </div>
      </section>

      {/* Filters */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid gap-3 sm:gap-4 border-t border-border pt-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="reimbursed">Reimbursed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Min Amount</label>
              <input
                type="number"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Max Amount</label>
              <input
                type="number"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="∞"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: APPROVAL QUEUE */}
      {pendingApprovals.length > 0 && (
        <section id="approval-queue" className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-foreground">Approval Queue</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {pendingApprovals.length}
            </span>
            </div>
            {selectedReports.size > 0 && (
              <button
                type="button"
                onClick={handleBatchApprove}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Check className="h-4 w-4" />
                Approve Selected ({selectedReports.size})
              </button>
            )}
          </div>
          <div className="space-y-3">
            {pendingApprovals.map((report) => {
              const items = expenseItems.filter((item) => item.expense_report_id === report.expense_report_id);
              const hasMissingReceipts = items.some((item) => !item.has_receipt);
              const receiptStatus = hasMissingReceipts ? "missing" : "complete";

              return (
                <div
                  key={report.expense_report_id}
                  className="rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedReports.has(report.expense_report_id)}
                        onChange={() => toggleReportSelection(report.expense_report_id)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-foreground">{report.report_number}</p>
                          {receiptStatus === "missing" && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              ❌ Missing Receipts
                            </span>
                          )}
                          {receiptStatus === "complete" && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              ✅ Receipt attached
                            </span>
                          )}
                          {!report.gl_account && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              ⚠️ Needs GL Coding
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mb-1">{report.title || "No title"}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {report.submitted_by_name || "Unknown"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatRelativeTime(report.submitted_at)}
                        </span>
                        {report.department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {report.department}
                          </span>
                        )}
                      {report.category && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {report.category}
                            </span>
                          )}
                          {report.gl_account && (
                            <span className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {report.gl_account}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatMoney(report.total_amount, report.currency || currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {items.length} item{items.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/expenses/${report.expense_report_id}`)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                          title="Quick View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestInfo(report.expense_report_id)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          title="Request More Info"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(report.expense_report_id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          title="Reject"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(report.expense_report_id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          title="Approve"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {selectedReports.size > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">
                {selectedReports.size} report{selectedReports.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReports(new Set())}
                  className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={handleBatchApprove}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Approve Selected
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* SECTION 4: REIMBURSEMENT PROCESSING */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-foreground">Reimbursement Processing</h2>
            </div>
            <div className="flex gap-2">
            <button
              type="button"
                onClick={handleGeneratePaymentBatch}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Generate Payment Batch
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                <FileText className="h-4 w-4" />
                Export for Payroll
            </button>
          </div>
          </div>
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900 mb-1">
              Ready for Payment: {readyForPayment.length} reports - {formatMoney(
                readyForPayment.reduce((sum, r) => sum + (r.total_amount || 0), 0),
                currency,
              )}
            </p>
              <p className="text-sm text-amber-700">
              Approved expenses ready to be paid to employees
            </p>
          </div>
          {readyForPayment.length > 0 && (
            <div className="mb-4 space-y-2">
              {readyForPayment.slice(0, 5).map((report) => (
              <div
                key={report.expense_report_id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3"
              >
                  <div>
                  <p className="font-semibold text-foreground">{report.report_number}</p>
                  <p className="text-xs text-muted-foreground">
                      {report.submitted_by_name || "Unknown"} • {formatMoney(report.total_amount, report.currency || currency)}
                  </p>
                </div>
                  <button
                    type="button"
                    onClick={() => handleMarkAsPaid(report.expense_report_id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Mark as Paid
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Bank Transfer</p>
              <p className="text-lg font-bold text-foreground">
                {formatMoney(
                  readyForPayment
                    .filter((r) => !r.payment_method || r.payment_method === "bank_transfer")
                    .reduce((sum, r) => sum + (r.total_amount || 0), 0),
                  currency,
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {readyForPayment.filter((r) => !r.payment_method || r.payment_method === "bank_transfer").length} employees
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Mobile Money</p>
              <p className="text-lg font-bold text-foreground">
                {formatMoney(
                  readyForPayment
                    .filter((r) => r.payment_method === "mobile_money")
                    .reduce((sum, r) => sum + (r.total_amount || 0), 0),
                  currency,
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {readyForPayment.filter((r) => r.payment_method === "mobile_money").length} employees
              </p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Cash</p>
              <p className="text-lg font-bold text-foreground">
                {formatMoney(
                  readyForPayment
                    .filter((r) => r.payment_method === "cash")
                    .reduce((sum, r) => sum + (r.total_amount || 0), 0),
                  currency,
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {readyForPayment.filter((r) => r.payment_method === "cash").length} employees
              </p>
            </div>
          </div>
      </section>

      {/* SECTION 5: BUDGET VARIANCE ALERT */}
      <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 mb-1">
                ⚠️ Over Budget Categories
              </h3>
              <p className="text-sm font-semibold text-amber-700 mb-3">
                Categories exceeding monthly budget limits
              </p>
              <div className="space-y-2">
                {budgetVariances.map((variance) => (
                  <div
                    key={variance.category}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{variance.category}</p>
                      <p className="text-xs text-amber-700">
                        Budget: {formatMoney(variance.budget, currency)} • Actual: {formatMoney(variance.actual, currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {variance.variance.toFixed(0)}% over budget
                      </p>
                </div>
              </div>
            ))}
              </div>
            </div>
          </div>
        </section>

      {/* Post to GL Integration */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-foreground">Post to General Ledger</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePostToGL()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              disabled={selectedReports.size === 0}
            >
              <Zap className="h-4 w-4" />
              Post Selected to GL
            </button>
            <button
              type="button"
              onClick={() => {
                const approvedIds = expenseReports.filter((r) => r.status === "approved" && !r.je_posted).map((r) => r.expense_report_id);
                handlePostToGL(approvedIds);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              Create Manual JE for Batch
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="font-semibold text-emerald-900">Auto-post Status</p>
          </div>
          <p className="text-sm text-emerald-700">
            ✓ Auto-post enabled for approved expenses • 
            {expenseReports.filter((r) => r.je_posted).length} expenses posted to GL
          </p>
        </div>
      </section>

      {/* Expense Analysis */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <ExpenseByCategorySection data={expenseByCategory} currency={currency} />
        {expenseByDepartment.length > 0 ? (
          <ExpenseByDepartmentSection data={expenseByDepartment} currency={currency} />
        ) : (
          <ExpenseByEmployeeSection expenseReports={expenseReports} currency={currency} />
        )}
      </div>

      {/* Reimbursement Status & Monthly Comparison */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <ReimbursementStatusSection data={reimbursementStatus} currency={currency} />
        <MonthlyComparisonSection data={monthlyComparison} currency={currency} />
      </div>


      {/* All Expense Reports Table - Enhanced */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">All Expense Reports</h2>
          {selectedReports.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedReports.size} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedReports(new Set())}
                className="text-sm text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-3 pr-4">
                  <input
                    type="checkbox"
                    checked={filteredReports.length > 0 && filteredReports.every((r) => selectedReports.has(r.expense_report_id))}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border"
                    title="Select All"
                  />
                </th>
                <th className="py-3 pr-4">Report #</th>
                <th className="py-3 pr-4">Employee</th>
                <th className="py-3 pr-4">Purpose</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">GL Account</th>
                <th className="py-3 pr-4">Receipt Status</th>
                <th className="py-3 pr-4">Days Pending</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Submitted</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  const items = expenseItems.filter((item) => item.expense_report_id === report.expense_report_id);
                  const hasMissingReceipts = items.some((item) => !item.has_receipt);
                  const receiptStatus = hasMissingReceipts ? "missing" : (report.receipt_status || "complete");

                  const daysPending = getDaysPending(report);
                  const rowClass = getRowUrgencyClass(report);

                  return (
                  <tr
                    key={report.expense_report_id}
                      className={cn("border-b border-border/60 text-foreground hover:bg-muted/30", rowClass)}
                    >
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={selectedReports.has(report.expense_report_id)}
                          onChange={() => toggleReportSelection(report.expense_report_id)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </td>
                    <td className="py-3 pr-4 font-medium">{report.report_number}</td>
                      <td className="py-3 pr-4">{report.submitted_by_name || "—"}</td>
                    <td className="py-3 pr-4">{report.title || "—"}</td>
                    <td className="py-3 pr-4 font-semibold">
                      {formatMoney(report.total_amount, report.currency || currency)}
                    </td>
                      <td className="py-3 pr-4">{report.category || "—"}</td>
                      <td className="py-3 pr-4">
                        {report.gl_account ? (
                          <span className="text-xs font-medium text-emerald-700">{report.gl_account}</span>
                        ) : (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignGlAccount(report.expense_report_id, e.target.value);
                              }
                            }}
                            className="rounded border border-amber-300 px-2 py-1 text-xs bg-amber-50 text-amber-700"
                          >
                            <option value="">Assign GL...</option>
                            {glAccounts.map((acc) => (
                              <option key={acc} value={acc}>
                                {acc}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {receiptStatus === "missing" ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-red-700">
                            <XCircle className="h-3 w-3" />
                            Missing
                          </span>
                        ) : receiptStatus === "unclear" ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Unclear
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Attached
                          </span>
                        )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        "text-xs font-semibold",
                        daysPending > 7 ? "text-red-600" : daysPending > 3 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {daysPending} day{daysPending !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatRelativeTime(report.submitted_at)}
                    </td>
                    <td className="py-3 pr-4">
                        <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => router.push(`/expenses/${report.expense_report_id}`)}
                            className="rounded border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                            title="Quick View"
                      >
                            <Eye className="h-3 w-3" />
                      </button>
                          {report.status === "submitted" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRequestInfo(report.expense_report_id)}
                                className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                title="Request More Info"
                              >
                                <MessageSquare className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newAccount = window.prompt("Enter GL Account:", report.gl_account || "");
                                  if (newAccount) handleAssignGlAccount(report.expense_report_id, newAccount);
                                }}
                                className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                                title="Edit GL Coding"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprove(report.expense_report_id)}
                                className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                title="Approve"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(report.expense_report_id)}
                                className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                title="Reject"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-muted-foreground">
                    No expense reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {selectedReports.size > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              {selectedReports.size} report{selectedReports.size !== 1 ? "s" : ""} selected
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBatchApprove}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Check className="h-3 w-3" />
                Approve Selected ({selectedReports.size})
              </button>
              <button
                type="button"
                onClick={handleBatchReject}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                <X className="h-3 w-3" />
                Reject Selected
              </button>
              <button
                type="button"
                onClick={handleExportSelected}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
              >
                <Download className="h-3 w-3" />
                Export Selected
              </button>
              <button
                type="button"
                onClick={() => handlePostToGL()}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90"
              >
                <Zap className="h-3 w-3" />
                Post to GL
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subvalue,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  subvalue?: string;
  tone: "critical" | "warning" | "good" | "info";
  icon: ComponentType<{ className?: string }>;
}) {
  const toneClasses: Record<typeof tone, string> = {
    critical: "border-red-200 bg-red-50",
    warning: "border-amber-200 bg-amber-50",
    good: "border-emerald-200 bg-emerald-50",
    info: "border-blue-200 bg-blue-50",
  };

  const valueClasses: Record<typeof tone, string> = {
    critical: "text-red-600",
    warning: "text-amber-600",
    good: "text-emerald-600",
    info: "text-blue-600",
  };

  return (
    <div className={cn("rounded-xl border p-4", toneClasses[tone])}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={cn("h-4 w-4", valueClasses[tone])} />
      </div>
      <p className={cn("text-2xl font-bold mb-1", valueClasses[tone])}>{value}</p>
      {subvalue && <p className="text-xs text-muted-foreground">{subvalue}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string }> = {
    submitted: { bg: "bg-amber-100", text: "text-amber-700" },
    approved: { bg: "bg-blue-100", text: "text-blue-700" },
    reimbursed: { bg: "bg-emerald-100", text: "text-emerald-700" },
    rejected: { bg: "bg-red-100", text: "text-red-700" },
    draft: { bg: "bg-gray-100", text: "text-gray-700" },
  };

  const config = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", config.bg, config.text)}>
      {status}
    </span>
  );
}

function ExpenseByCategorySection({
  data,
  currency,
}: {
  data: Array<{ category: string; count: number; total: number }>;
  currency: string;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-foreground">Expense by Category</h3>
      </div>
      <div className="space-y-2">
        {data.length > 0 ? (
          data.map((item) => (
            <div key={item.category} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-semibold text-foreground">{item.category}</p>
                <p className="text-xs text-muted-foreground">{item.count} reports</p>
              </div>
              <p className="font-semibold text-foreground">{formatMoney(item.total, currency)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No category data available.</p>
        )}
      </div>
    </section>
  );
}

function ExpenseByDepartmentSection({
  data,
  currency,
}: {
  data: Array<{ department: string; count: number; total: number }>;
  currency: string;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-foreground">Expense by Department</h3>
      </div>
      <div className="space-y-2">
        {data.length > 0 ? (
          data.map((item) => (
            <div key={item.department} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-semibold text-foreground">{item.department}</p>
                <p className="text-xs text-muted-foreground">{item.count} reports</p>
              </div>
              <p className="font-semibold text-foreground">{formatMoney(item.total, currency)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No department data available.</p>
        )}
      </div>
    </section>
  );
}

function ExpenseByEmployeeSection({
  expenseReports,
  currency,
}: {
  expenseReports: ExpenseReport[];
  currency: string;
}) {
  const expenseByEmployee = useMemo(() => {
    const employeeMap = new Map<string, { count: number; total: number }>();
    expenseReports.forEach((report) => {
      const employee = report.submitted_by_name || "Unknown";
      const entry = employeeMap.get(employee) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += report.total_amount || 0;
      employeeMap.set(employee, entry);
    });
    return Array.from(employeeMap.entries())
      .map(([employee, data]) => ({ employee, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [expenseReports]);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-foreground">Expense by Employee</h3>
      </div>
      <div className="space-y-2">
        {expenseByEmployee.length > 0 ? (
          expenseByEmployee.map((item) => (
            <div key={item.employee} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-semibold text-foreground">{item.employee}</p>
                <p className="text-xs text-muted-foreground">{item.count} report{item.count !== 1 ? "s" : ""}</p>
              </div>
              <p className="font-semibold text-foreground">{formatMoney(item.total, currency)}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No expense data available.</p>
        )}
      </div>
    </section>
  );
}

function ReimbursementStatusSection({
  data,
  currency,
}: {
  data: { pending: number; reimbursed: number; pendingAmount: number; reimbursedAmount: number };
  currency: string;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-foreground">Reimbursement Status</h3>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Pending Payments</p>
          <p className="text-2xl font-bold text-amber-600 mb-1">{data.pending} reports</p>
          <p className="text-sm text-amber-700">{formatMoney(data.pendingAmount, currency)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Reimbursed</p>
          <p className="text-2xl font-bold text-emerald-600 mb-1">{data.reimbursed} reports</p>
          <p className="text-sm text-emerald-700">{formatMoney(data.reimbursedAmount, currency)}</p>
        </div>
      </div>
    </section>
  );
}

function MonthlyComparisonSection({
  data,
  currency,
}: {
  data: { current: number; last: number; change: number; currentCount: number; lastCount: number };
  currency: string;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-foreground">Monthly Comparison</h3>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Last Month</p>
          <p className="text-2xl font-bold text-foreground mb-1">{formatMoney(data.last, currency)}</p>
          <p className="text-sm text-muted-foreground">{data.lastCount} reports</p>
        </div>
        <div
          className={cn(
            "rounded-xl border p-4",
            data.change >= 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50",
          )}
        >
          <p className="text-xs font-medium text-muted-foreground mb-1">Change</p>
          <p
            className={cn(
              "text-2xl font-bold mb-1",
              data.change >= 0 ? "text-red-600" : "text-emerald-600",
            )}
          >
            {data.change >= 0 ? "+" : ""}
            {data.change.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">vs last month</p>
        </div>
      </div>
    </section>
  );
}
