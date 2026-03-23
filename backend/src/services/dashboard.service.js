"use strict";

const pool = require("../config/database");

const CLOSED_ORDER_STATUSES = ["delivered", "cancelled", "returned"];

const dashboardService = {
  /**
   * Build the dashboard overview for a tenant
   */
  getOverview: async (user, companyIdParam) => {
    const companyId = resolveCompanyContext(user, companyIdParam);
    const branchId = user?.branch_id || null;

    if (!companyId) {
      throw new Error("Company context is required for dashboard metrics");
    }

    // If user is a branch admin, filter by branch
    const isBranchAdmin = user?.is_branch_admin && branchId;

    const [
      revenueCurrent,
      revenuePrevious,
      activeCurrent,
      activePrevious,
      inventoryValue,
      pendingInvoicesCurrent,
      pendingInvoicesPrevious,
      lowStockAlerts,
      recentActivity,
    ] = await Promise.all([
      sumSales(companyId, "current", branchId),
      sumSales(companyId, "previous", branchId),
      countOpenOrders(companyId, "current", branchId),
      countOpenOrders(companyId, "previous", branchId),
      calculateInventoryValue(companyId, branchId),
      sumPendingInvoices(companyId, "current", branchId),
      sumPendingInvoices(companyId, "previous", branchId),
      getLowStockAlerts(companyId, branchId),
      getRecentActivity(companyId, branchId),
    ]);

    const currency = await resolveCompanyCurrency(companyId);

    return {
      metrics: {
        revenue: {
          current: revenueCurrent,
          previous: revenuePrevious,
        },
        activeOrders: {
          current: activeCurrent,
          previous: activePrevious,
        },
        inventoryValue: {
          current: inventoryValue,
          previous: null,
        },
        pendingInvoices: {
          current: pendingInvoicesCurrent,
          previous: pendingInvoicesPrevious,
        },
      },
      alerts: lowStockAlerts,
      activity: recentActivity,
      currency,
    };
  },
};

function resolveCompanyContext(user, providedCompanyId) {
  if (user?.is_super_admin) {
    return providedCompanyId || user.company_id || null;
  }
  return user?.company_id || null;
}

async function sumSales(companyId, window = "current", branchId = null) {
  const dateFilter = buildWindowFilter("order_date", window);
  const branchFilter = branchId ? "AND branch_id = :branchId" : "";

  try {
    const [rows] = await pool.execute(
      `SELECT IFNULL(SUM(total_amount), 0) AS total
       FROM sales_orders
       WHERE company_id = :companyId
       ${branchFilter}
       ${dateFilter}`,
      paramsWithWindow({ companyId, ...(branchId ? { branchId } : {}) }, window),
    );

    return Number(rows[0]?.total || 0);
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[dashboard] sales_orders table missing");
      return 0;
    }
    if (isBadFieldError(error) && branchId) {
      // Table doesn't have branch_id column, retry without branch filter
      console.warn("[dashboard] sales_orders table doesn't have branch_id column, filtering by company only");
      try {
        const [rows] = await pool.execute(
          `SELECT IFNULL(SUM(total_amount), 0) AS total
           FROM sales_orders
           WHERE company_id = :companyId
           ${dateFilter}`,
          paramsWithWindow({ companyId }, window),
        );
        return Number(rows[0]?.total || 0);
      } catch (retryError) {
        if (isMissingTableError(retryError)) {
          console.warn("[dashboard] sales_orders table missing");
          return 0;
        }
        throw retryError;
      }
    }
    throw error;
  }
}

async function countOpenOrders(companyId, window = "current", branchId = null) {
  const dateFilter = buildWindowFilter("order_date", window);
  const branchFilter = branchId ? "AND branch_id = :branchId" : "";

  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM sales_orders
       WHERE company_id = :companyId
         AND status NOT IN (${CLOSED_ORDER_STATUSES.map((_, idx) => `:closed${idx}`).join(", ")})
       ${branchFilter}
       ${dateFilter}`,
      paramsWithWindow(
        {
          companyId,
          ...(branchId ? { branchId } : {}),
          ...CLOSED_ORDER_STATUSES.reduce(
            (acc, status, idx) => ({ ...acc, [`closed${idx}`]: status }),
            {},
          ),
        },
        window,
      ),
    );

    return Number(rows[0]?.total || 0);
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[dashboard] sales_orders table missing");
      return 0;
    }
    if (isBadFieldError(error) && branchId) {
      // Table doesn't have branch_id column, retry without branch filter
      console.warn("[dashboard] sales_orders table doesn't have branch_id column, filtering by company only");
      try {
        const [rows] = await pool.execute(
          `SELECT COUNT(*) AS total
           FROM sales_orders
           WHERE company_id = :companyId
             AND status NOT IN (${CLOSED_ORDER_STATUSES.map((_, idx) => `:closed${idx}`).join(", ")})
           ${dateFilter}`,
          paramsWithWindow(
            {
              companyId,
              ...CLOSED_ORDER_STATUSES.reduce(
                (acc, status, idx) => ({ ...acc, [`closed${idx}`]: status }),
                {},
              ),
            },
            window,
          ),
        );
        return Number(rows[0]?.total || 0);
      } catch (retryError) {
        if (isMissingTableError(retryError)) {
          console.warn("[dashboard] sales_orders table missing");
          return 0;
        }
        throw retryError;
      }
    }
    throw error;
  }
}

async function calculateInventoryValue(companyId, branchId = null) {
  const branchFilter = branchId ? "AND si.branch_id = :branchId" : "";

  try {
    const [rows] = await pool.execute(
      `SELECT IFNULL(SUM(si.quantity_on_hand * p.cost_price), 0) AS total_value
       FROM stock_inventory si
       INNER JOIN products p ON si.product_id = p.product_id
       WHERE si.company_id = :companyId
       ${branchFilter}`,
      { companyId, ...(branchId ? { branchId } : {}) },
    );

    return Number(rows[0]?.total_value || 0);
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[dashboard] stock_inventory/products table missing");
      return 0;
    }
    if (isBadFieldError(error) && branchId) {
      // Table doesn't have branch_id column, retry without branch filter
      console.warn("[dashboard] stock_inventory table doesn't have branch_id column, filtering by company only");
      try {
        const [rows] = await pool.execute(
          `SELECT IFNULL(SUM(si.quantity_on_hand * p.cost_price), 0) AS total_value
           FROM stock_inventory si
           INNER JOIN products p ON si.product_id = p.product_id
           WHERE si.company_id = :companyId`,
          { companyId },
        );
        return Number(rows[0]?.total_value || 0);
      } catch (retryError) {
        if (isMissingTableError(retryError)) {
          console.warn("[dashboard] stock_inventory/products table missing");
          return 0;
        }
        throw retryError;
      }
    }
    throw error;
  }
}

async function sumPendingInvoices(companyId, window = "current", branchId = null) {
  const dateFilter = buildWindowFilter("order_date", window);
  const branchFilter = branchId ? "AND branch_id = :branchId" : "";

  try {
    const [rows] = await pool.execute(
      `SELECT IFNULL(SUM(total_amount - amount_paid), 0) AS total_due
       FROM sales_orders
       WHERE company_id = :companyId
         AND payment_status IN ('pending', 'partial')
       ${branchFilter}
       ${dateFilter}`,
      paramsWithWindow({ companyId, ...(branchId ? { branchId } : {}) }, window),
    );

    return Number(rows[0]?.total_due || 0);
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[dashboard] sales_orders table missing");
      return 0;
    }
    if (isBadFieldError(error) && branchId) {
      // Table doesn't have branch_id column, retry without branch filter
      console.warn("[dashboard] sales_orders table doesn't have branch_id column, filtering by company only");
      try {
        const [rows] = await pool.execute(
          `SELECT IFNULL(SUM(total_amount - amount_paid), 0) AS total_due
           FROM sales_orders
           WHERE company_id = :companyId
             AND payment_status IN ('pending', 'partial')
           ${dateFilter}`,
          paramsWithWindow({ companyId }, window),
        );
        return Number(rows[0]?.total_due || 0);
      } catch (retryError) {
        if (isMissingTableError(retryError)) {
          console.warn("[dashboard] sales_orders table missing");
          return 0;
        }
        throw retryError;
      }
    }
    throw error;
  }
}

async function getLowStockAlerts(companyId, branchId = null) {
  const branchFilter = branchId ? "AND si.branch_id = :branchId" : "";

  try {
    const [rows] = await pool.execute(
      `SELECT
          p.product_name,
          b.name AS branch_name,
          si.quantity_on_hand,
          p.reorder_level,
          p.minimum_stock_level
       FROM stock_inventory si
       INNER JOIN products p ON si.product_id = p.product_id
       LEFT JOIN branches b ON si.branch_id = b.branch_id
       WHERE si.company_id = :companyId
       ${branchFilter}
         AND (
           (p.reorder_level IS NOT NULL AND si.quantity_on_hand <= p.reorder_level)
           OR (p.minimum_stock_level IS NOT NULL AND si.quantity_on_hand <= p.minimum_stock_level)
         )
       ORDER BY si.quantity_on_hand ASC
       LIMIT 6`,
      { companyId, ...(branchId ? { branchId } : {}) },
    );

    return rows.map((row) => ({
      product: row.product_name,
      branch: row.branch_name,
      quantity: Number(row.quantity_on_hand ?? 0),
      reorder_level: Number(row.reorder_level ?? 0),
      minimum_stock_level: Number(row.minimum_stock_level ?? 0),
      severity: determineSeverity(row),
    }));
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[dashboard] stock_inventory/products table missing");
      return [];
    }
    if (isBadFieldError(error) && branchId) {
      // Table doesn't have branch_id column, retry without branch filter and branch join
      console.warn("[dashboard] stock_inventory table doesn't have branch_id column, filtering by company only");
      try {
        const [rows] = await pool.execute(
          `SELECT
              p.product_name,
              NULL AS branch_name,
              si.quantity_on_hand,
              p.reorder_level,
              p.minimum_stock_level
           FROM stock_inventory si
           INNER JOIN products p ON si.product_id = p.product_id
           WHERE si.company_id = :companyId
             AND (
               (p.reorder_level IS NOT NULL AND si.quantity_on_hand <= p.reorder_level)
               OR (p.minimum_stock_level IS NOT NULL AND si.quantity_on_hand <= p.minimum_stock_level)
             )
           ORDER BY si.quantity_on_hand ASC
           LIMIT 6`,
          { companyId },
        );
        return rows.map((row) => ({
          product: row.product_name,
          branch: row.branch_name || null,
          quantity: Number(row.quantity_on_hand ?? 0),
          reorder_level: Number(row.reorder_level ?? 0),
          minimum_stock_level: Number(row.minimum_stock_level ?? 0),
          severity: determineSeverity(row),
        }));
      } catch (retryError) {
        if (isMissingTableError(retryError)) {
          console.warn("[dashboard] stock_inventory/products table missing");
          return [];
        }
        throw retryError;
      }
    }
    throw error;
  }
}

function determineSeverity(row) {
  const qty = Number(row.quantity_on_hand ?? 0);
  const reorder = Number(row.reorder_level ?? 0);
  const minimum = Number(row.minimum_stock_level ?? 0);

  if (minimum && qty <= minimum) {
    return "error";
  }

  if (reorder && qty <= reorder) {
    return "warning";
  }

  return "info";
}

async function getRecentActivity(companyId, branchId = null) {
  const branchFilter = branchId ? "AND branch_id = :branchId" : "";

  try {
    const [rows] = await pool.execute(
      `SELECT
          action AS action_type,
          entity_type,
          description,
          created_at
       FROM activity_logs
       WHERE company_id = :companyId
       ${branchFilter}
       ORDER BY created_at DESC
       LIMIT 6`,
      { companyId, ...(branchId ? { branchId } : {}) },
    );

    return rows.map((row) => ({
      action_type: row.action_type,
      entity_type: row.entity_type,
      description: row.description,
      created_at: row.created_at,
    }));
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[dashboard] activity_logs table missing");
      return [];
    }
    if (isBadFieldError(error) && branchId) {
      // Table doesn't have branch_id column, retry without branch filter
      console.warn("[dashboard] activity_logs table doesn't have branch_id column, filtering by company only");
      try {
        const [rows] = await pool.execute(
          `SELECT
              action AS action_type,
              entity_type,
              description,
              created_at
           FROM activity_logs
           WHERE company_id = :companyId
           ORDER BY created_at DESC
           LIMIT 6`,
          { companyId },
        );
        return rows.map((row) => ({
          action_type: row.action_type,
          entity_type: row.entity_type,
          description: row.description,
          created_at: row.created_at,
        }));
      } catch (retryError) {
        if (isMissingTableError(retryError)) {
          console.warn("[dashboard] activity_logs table missing");
          return [];
        }
        throw retryError;
      }
    }
    throw error;
  }
}

function buildWindowFilter(column, window) {
  if (window === "current") {
    return `AND ${column} >= :currentStart`;
  }

  if (window === "previous") {
    return `AND ${column} >= :previousStart AND ${column} < :currentStart`;
  }

  return "";
}

function paramsWithWindow(params, window) {
  if (window === "current" || window === "previous") {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 30);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 30);

    return {
      ...params,
      currentStart,
      previousStart,
    };
  }

  return params;
}

function isMissingTableError(error) {
  return error && error.code === "ER_NO_SUCH_TABLE";
}

function isBadFieldError(error) {
  return error && error.code === "ER_BAD_FIELD_ERROR";
}

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

module.exports = dashboardService;


