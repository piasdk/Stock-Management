"use strict";

const pool = require("../config/database");

const purchasesService = {
  /**
   * Get all purchase orders for a tenant
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
          po.po_id,
          po.po_number,
          po.expected_date,
          po.status,
          po.total_amount,
          po.currency,
          po.notes,
          po.created_at,
          po.branch_id,
          s.supplier_id,
          s.name AS supplier_name,
          s.phone AS supplier_phone,
          s.email AS supplier_email
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
        WHERE po.company_id = :companyId
          AND (:branchId IS NULL OR po.branch_id = :branchId)
         ORDER BY po.expected_date DESC, po.created_at DESC`,
        { companyId, branchId }
      );
      return rows || [];
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        console.warn("[purchases] purchase_orders table missing");
        return [];
      }
      throw err;
    }
  },

  /**
   * Create a new purchase order
   */
  create: async (user, purchaseOrderData) => {
    const companyId = resolveCompanyContext(user, purchaseOrderData.company_id);
      const branchId = resolveBranchForWrite(user, purchaseOrderData.branch_id);
    
    if (!companyId) {
      throw new Error("Company context is required");
    }

    const {
      supplier_id,
      expected_date,
      status = "draft",
      total_amount,
      currency = "USD",
      notes,
    } = purchaseOrderData;

    // Generate PO number if not provided
    const poNumber = purchaseOrderData.po_number || `PO-${Date.now()}`;

    try {
      const [result] = await pool.execute(
        `INSERT INTO purchase_orders (
          company_id,
          branch_id,
          supplier_id,
          po_number,
          expected_date,
          status,
          total_amount,
          currency,
          notes
        ) VALUES (
          :company_id,
          :branch_id,
          :supplier_id,
          :po_number,
          :expected_date,
          :status,
          :total_amount,
          :currency,
          :notes
        )`,
        {
          company_id: companyId,
          branch_id: branchId,
          supplier_id: supplier_id || null,
          po_number: poNumber,
          expected_date: expected_date || null,
          status,
          total_amount: total_amount || null,
          currency,
          notes: notes || null,
        }
      );

      // Fetch and return the created order
      const [rows] = await pool.execute(
        `SELECT
          po.po_id,
          po.po_number,
          po.expected_date,
          po.status,
          po.total_amount,
          po.currency,
          po.notes,
          po.created_at,
          s.supplier_id,
          s.name AS supplier_name,
          s.phone AS supplier_phone,
          s.email AS supplier_email
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
         WHERE po.po_id = :po_id`,
        { po_id: result.insertId }
      );

      return rows[0];
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        throw new Error("purchase_orders table does not exist");
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

module.exports = purchasesService;

