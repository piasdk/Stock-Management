"use strict";

const pool = require("../config/database");

const expensesService = {
  /**
   * Get all expense reports for a tenant
   */
  getAll: async (user, companyIdParam) => {
    const companyId = resolveCompanyContext(user, companyIdParam);

    if (!companyId) {
      throw new Error("Company context is required");
    }

    try {
      const [rows] = await pool.execute(
        `SELECT
          er.expense_report_id,
          er.report_number,
          er.title,
          er.status,
          er.total_amount,
          er.currency,
          er.submitted_at,
          er.approved_at,
          er.notes,
          er.created_at,
          u.user_id,
          CONCAT(u.first_name, ' ', u.last_name) AS submitted_by_name,
          approver.user_id AS approved_by_id,
          CONCAT(approver.first_name, ' ', approver.last_name) AS approved_by_name
         FROM expense_reports er
         LEFT JOIN users u ON er.submitted_by = u.user_id
         LEFT JOIN users approver ON er.approved_by = approver.user_id
         WHERE er.company_id = :companyId
         ORDER BY er.created_at DESC`,
        { companyId }
      );
      return rows || [];
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        console.warn("[expenses] expense_reports table missing");
        return [];
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

module.exports = expensesService;

