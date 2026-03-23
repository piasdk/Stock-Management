"use strict";

const pool = require("../config/database");

const CLOSED_SALES_STATUSES = ["delivered", "cancelled", "returned"];
const CLOSED_PURCHASE_STATUSES = ["received", "cancelled"];

const transactionsService = {
  /**
   * Transactions overview for a tenant
   */
  getOverview: async (user, companyIdParam, branchIdParam) => {
    const companyId = resolveCompanyContext(user, companyIdParam);
    if (!companyId) {
      throw new Error("Company context is required for transactions overview");
    }

    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 30);
    let branchId = branchIdParam != null ? branchIdParam : resolveBranchScope(user);
    const userCurrency = user?.currency || null;

    const run = async (bId) => {
      const [
        openPurchaseOrders,
        openSalesOrders,
        pendingApprovals,
        activeBatches,
        monthlySpend,
        salesRevenue,
        outstandingInvoices,
        billsDue7Days,
        recentActivity,
        approvalItems,
        pipeline,
      ] = await Promise.all([
        countOpenPurchaseOrders(companyId, bId),
        countOpenSalesOrders(companyId, bId),
        countPendingApprovals(companyId, bId),
        countActiveBatches(companyId, bId),
        sumMonthlySpend(companyId, currentStart, bId),
        sumSalesRevenue(companyId, currentStart, bId),
        sumOutstandingInvoices(companyId, bId),
        sumBillsDue7Days(companyId, now, bId),
        getRecentOrderActivity(companyId, bId),
        getPendingApprovalItems(companyId, bId),
        getPipeline(companyId, bId),
      ]);

      return {
        metrics: {
          openPurchaseOrders: { current: openPurchaseOrders, previous: null },
          openSalesOrders: { current: openSalesOrders, previous: null },
          activeBatches: { current: activeBatches, previous: null },
          pendingApprovals: { current: pendingApprovals, previous: null },
        },
        pipeline,
        financialSnapshot: {
          monthlySpend,
          salesRevenue,
          outstandingInvoices,
          billsDue7Days,
          currency: userCurrency || (await resolveCompanyCurrency(companyId)),
        },
        recentActivity,
        approvals: approvalItems,
      };
    };

    try {
      return await run(branchId);
    } catch (err) {
      if (
        err.code === "ER_BAD_FIELD_ERROR" &&
        typeof err.sqlMessage === "string" &&
        err.sqlMessage.includes("branch_id")
      ) {
        return await run(null);
      }
      throw err;
    }
  },
};

async function resolveCompanyCurrency(companyId) {
  try {
    const [rows] = await pool.execute(
      "SELECT currency FROM companies WHERE company_id = :companyId",
      { companyId },
    );
    const currency = rows[0]?.currency;
    return currency ? currency.toUpperCase() : "USD";
  } catch (error) {
    if (isMissingTableError(error)) return "USD";
    throw error;
  }
}

function resolveCompanyContext(user, providedCompanyId) {
  if (user?.is_super_admin) {
    return providedCompanyId || user.company_id || null;
  }
  return user?.company_id || null;
}

function resolveBranchScope(user) {
  if (!user) return null;
  if (user.is_super_admin || user.is_company_admin) {
    return null;
  }
  return user.branch_id || null;
}

async function countOpenPurchaseOrders(companyId, branchId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM purchase_orders
       WHERE company_id = :companyId
         AND (:branchId IS NULL OR branch_id = :branchId)
         AND status NOT IN (${CLOSED_PURCHASE_STATUSES.map(
           (_, i) => `:p${i}`,
         ).join(", ")})`,
      {
        companyId,
        branchId,
        ...CLOSED_PURCHASE_STATUSES.reduce(
          (acc, status, i) => ({ ...acc, [`p${i}`]: status }),
          {},
        ),
      },
    );
    return Number(rows[0]?.total || 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

async function countOpenSalesOrders(companyId, branchId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM sales_orders
       WHERE company_id = :companyId
         AND (:branchId IS NULL OR branch_id = :branchId)
         AND status NOT IN (${CLOSED_SALES_STATUSES.map(
           (_, i) => `:s${i}`,
         ).join(", ")})`,
      {
        companyId,
        branchId,
        ...CLOSED_SALES_STATUSES.reduce(
          (acc, status, i) => ({ ...acc, [`s${i}`]: status }),
          {},
        ),
      },
    );
    return Number(rows[0]?.total || 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

async function countPendingApprovals(companyId, branchId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM purchase_orders
       WHERE company_id = :companyId
         AND (:branchId IS NULL OR branch_id = :branchId)
         AND status = 'pending'`,
      { companyId, branchId },
    );
    return Number(rows[0]?.total || 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

async function countActiveBatches(companyId, branchId) {
  // Use stock_transfers as a proxy for "active batches"
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(DISTINCT st.transfer_id) AS total
       FROM stock_transfers st
       LEFT JOIN stock_locations src ON src.location_id = st.source_location_id
       LEFT JOIN stock_locations dst ON dst.location_id = st.destination_location_id
       WHERE st.company_id = :companyId
         AND st.status IN ('pending', 'in_transit')
         AND (
           :branchId IS NULL
           OR src.branch_id = :branchId
           OR dst.branch_id = :branchId
         )`,
      { companyId, branchId },
    );
    return Number(rows[0]?.total || 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

async function sumMonthlySpend(companyId, currentStart, branchId) {
  try {
    const [rows] = await pool.execute(
      `SELECT IFNULL(SUM(total_amount), 0) AS total
       FROM purchase_orders
       WHERE company_id = :companyId
         AND (:branchId IS NULL OR branch_id = :branchId)
         AND created_at >= :currentStart`,
      { companyId, currentStart, branchId },
    );
    return Number(rows[0]?.total || 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

async function sumSalesRevenue(companyId, currentStart, branchId) {
  try {
    const [rows] = await pool.execute(
      `SELECT IFNULL(SUM(total_amount), 0) AS total
       FROM sales_orders
       WHERE company_id = :companyId
         AND (:branchId IS NULL OR branch_id = :branchId)
         AND created_at >= :currentStart`,
      { companyId, currentStart, branchId },
    );
    return Number(rows[0]?.total || 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

async function sumOutstandingInvoices(companyId, branchId) {
  try {
    const [rows] = await pool.execute(
      `SELECT IFNULL(SUM(total_amount - amount_paid), 0) AS total_due
       FROM sales_orders
       WHERE company_id = :companyId
         AND (:branchId IS NULL OR branch_id = :branchId)
         AND payment_status IN ('pending', 'partial')`,
      { companyId, branchId },
    );
    return Number(rows[0]?.total_due || 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

async function sumBillsDue7Days(companyId, now, branchId) {
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  try {
    const [rows] = await pool.execute(
      `SELECT IFNULL(SUM(total_amount), 0) AS total
       FROM purchase_orders
       WHERE company_id = :companyId
         AND (:branchId IS NULL OR branch_id = :branchId)
         AND expected_date IS NOT NULL
         AND expected_date >= :now
         AND expected_date <= :end
         AND status NOT IN (${CLOSED_PURCHASE_STATUSES.map(
           (_, i) => `:c${i}`,
         ).join(", ")})`,
      {
        companyId,
        branchId,
        now,
        end,
        ...CLOSED_PURCHASE_STATUSES.reduce(
          (acc, status, i) => ({ ...acc, [`c${i}`]: status }),
          {},
        ),
      },
    );
    return Number(rows[0]?.total || 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

async function getRecentOrderActivity(companyId, branchId) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         'purchase_order' AS type,
         po.po_number AS reference,
         CONCAT('Purchase order ', po.po_number, ' ', po.status) AS description,
         po.created_at AS created_at
       FROM purchase_orders po
       WHERE po.company_id = :companyId
         AND (:branchId IS NULL OR po.branch_id = :branchId)
       ORDER BY po.created_at DESC
       LIMIT 3`,
      { companyId, branchId },
    );

    const [salesRows] = await pool.execute(
      `SELECT
         'sales_order' AS type,
         so.so_number AS reference,
         CONCAT('Sales order ', so.so_number, ' ', so.status) AS description,
         so.created_at AS created_at
       FROM sales_orders so
       WHERE so.company_id = :companyId
         AND (:branchId IS NULL OR so.branch_id = :branchId)
       ORDER BY so.created_at DESC
       LIMIT 3`,
      { companyId, branchId },
    );

    const all = [...rows, ...salesRows].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return all.slice(0, 6).map((row) => ({
      description: row.description,
      created_at: row.created_at,
    }));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    // Older schemas may not have branch_id columns on purchase_orders / sales_orders.
    if (
      error.code === "ER_BAD_FIELD_ERROR" &&
      typeof error.sqlMessage === "string" &&
      error.sqlMessage.includes("branch_id")
    ) {
      const [rows] = await pool.execute(
        `SELECT
           'purchase_order' AS type,
           po.po_number AS reference,
           CONCAT('Purchase order ', po.po_number, ' ', po.status) AS description,
           po.created_at AS created_at
         FROM purchase_orders po
         WHERE po.company_id = :companyId
         ORDER BY po.created_at DESC
         LIMIT 3`,
        { companyId },
      );

      const [salesRows] = await pool.execute(
        `SELECT
           'sales_order' AS type,
           so.so_number AS reference,
           CONCAT('Sales order ', so.so_number, ' ', so.status) AS description,
           so.created_at AS created_at
         FROM sales_orders so
         WHERE so.company_id = :companyId
         ORDER BY so.created_at DESC
         LIMIT 3`,
        { companyId },
      );

      const all = [...rows, ...salesRows].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      return all.slice(0, 6).map((row) => ({
        description: row.description,
        created_at: row.created_at,
      }));
    }
    throw error;
  }
}

async function getPendingApprovalItems(companyId, branchId) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         po.po_number,
         po.created_at,
         po.status,
         po.total_amount
       FROM purchase_orders po
       WHERE po.company_id = :companyId
         AND (:branchId IS NULL OR po.branch_id = :branchId)
         AND po.status = 'pending'
       ORDER BY po.created_at ASC
       LIMIT 3`,
      { companyId, branchId },
    );

    const now = new Date();

    return rows.map((row) => {
      const ageHours = Math.max(
        0,
        (now.getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60),
      );
      const severity =
        ageHours > 48 ? "High" : ageHours > 24 ? "Medium" : "Low";

      return {
        title: `PO ${row.po_number}`,
        type: "Purchasing",
        owner: "Approver",
        age: formatAge(ageHours),
        severity,
      };
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function getPipeline(companyId, branchId) {
  try {
    const [purchaseStages] = await pool.execute(
      `SELECT status, COUNT(*) AS count
       FROM purchase_orders
       WHERE company_id = :companyId
         AND (:branchId IS NULL OR branch_id = :branchId)
       GROUP BY status`,
      { companyId, branchId },
    );
    const [salesStages] = await pool.execute(
      `SELECT status, COUNT(*) AS count
       FROM sales_orders
       WHERE company_id = :companyId
         AND (:branchId IS NULL OR branch_id = :branchId)
       GROUP BY status`,
      { companyId, branchId },
    );

    const purchaseMap = toStageMap(purchaseStages);
    const salesMap = toStageMap(salesStages);

    return {
      purchasing: {
        submitted: purchaseMap.draft || 0,
        approved: purchaseMap.approved || 0,
        received: purchaseMap.received || 0,
      },
      sales: {
        draft: salesMap.draft || 0,
        allocated: salesMap.confirmed || 0,
        shipped: salesMap.delivered || 0,
      },
      manufacturing: {
        planned: 0,
        in_progress: 0,
        completed: 0,
      },
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return {
        purchasing: { submitted: 0, approved: 0, received: 0 },
        sales: { draft: 0, allocated: 0, shipped: 0 },
        manufacturing: { planned: 0, in_progress: 0, completed: 0 },
      };
    }
    throw error;
  }
}

function toStageMap(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    if (row.status) {
      map[row.status] = Number(row.count || 0);
    }
  });
  return map;
}

function formatAge(hours) {
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function isMissingTableError(error) {
  return error && error.code === "ER_NO_SUCH_TABLE";
}

module.exports = transactionsService;


