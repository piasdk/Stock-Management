"use strict";

const pool = require("../config/database");

const salesService = {
  /**
   * Get all sales orders for a tenant
   */
  getAll: async (user, companyIdParam) => {
    const companyId = resolveCompanyContext(user, companyIdParam);
    const branchId = resolveBranchFilter(user);

    if (!companyId) {
      throw new Error("Company context is required");
    }

    try {
      const [rows] = await pool.execute(
        `SELECT
          so.so_id,
          so.so_number,
          so.order_date,
          so.status,
          so.total_amount,
          so.currency,
          so.notes,
          so.created_at,
          c.customer_id,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email
         FROM sales_orders so
         LEFT JOIN customers c ON so.customer_id = c.customer_id
        WHERE so.company_id = :companyId
          AND (:branchId IS NULL OR so.branch_id = :branchId)
         ORDER BY so.order_date DESC, so.created_at DESC`,
        { companyId, branchId }
      );
      return rows || [];
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        console.warn("[sales] sales_orders table missing");
        return [];
      }
      throw err;
    }
  },

  /**
   * Create a new sales order
   */
  create: async (user, salesOrderData) => {
    const companyId = resolveCompanyContext(user, salesOrderData.company_id);
    const branchId = resolveBranchForWrite(user, salesOrderData.branch_id);
    
    if (!companyId) {
      throw new Error("Company context is required");
    }

    const {
      customer_id,
      order_date,
      status = "draft",
      total_amount,
      currency = "USD",
      notes,
    } = salesOrderData;

    // Generate SO number if not provided
    const soNumber = salesOrderData.so_number || `SO-${Date.now()}`;

    try {
      const [result] = await pool.execute(
        `INSERT INTO sales_orders (
          company_id,
          branch_id,
          customer_id,
          so_number,
          order_date,
          status,
          total_amount,
          currency,
          notes
        ) VALUES (
          :company_id,
          :branch_id,
          :customer_id,
          :so_number,
          :order_date,
          :status,
          :total_amount,
          :currency,
          :notes
        )`,
        {
          company_id: companyId,
          branch_id: branchId,
          customer_id: customer_id || null,
          so_number: soNumber,
          order_date: order_date || new Date().toISOString().split("T")[0],
          status,
          total_amount: total_amount || null,
          currency,
          notes: notes || null,
        }
      );

      // Fetch and return the created order
      const [rows] = await pool.execute(
        `SELECT
          so.so_id,
          so.so_number,
          so.order_date,
          so.status,
          so.total_amount,
          so.currency,
          so.notes,
          so.created_at,
          c.customer_id,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email
         FROM sales_orders so
         LEFT JOIN customers c ON so.customer_id = c.customer_id
         WHERE so.so_id = :so_id`,
        { so_id: result.insertId }
      );

      return rows[0];
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        throw new Error("sales_orders table does not exist");
      }
      throw err;
    }
  },
};

function resolveCompanyContext(user, providedCompanyId) {
  if (user?.is_super_admin) {
    return providedCompanyId || user.company_id || null;
  }
  return user?.company_id || null;
}

function resolveBranchFilter(user) {
  if (!user) return null;
  if (user.is_super_admin || user.is_company_admin) {
    return null;
  }
  return user.branch_id || null;
}

function resolveBranchForWrite(user, providedBranchId) {
  if (!user) return providedBranchId || null;
  if (user.is_super_admin || user.is_company_admin) {
    return providedBranchId || null;
  }
  return user.branch_id || null;
}

module.exports = salesService;

