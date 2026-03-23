"use strict";

const pool = require("../config/database");

const reportsService = {
  /**
   * Get all reports for a tenant
   */
  getAll: async (user, companyIdParam) => {
    const companyId = resolveCompanyContext(user, companyIdParam);

    if (!companyId) {
      throw new Error("Company context is required");
    }

    try {
      const [rows] = await pool.execute(
        `SELECT
          r.report_id,
          r.report_name,
          r.report_type,
          r.report_period,
          r.start_date,
          r.end_date,
          r.parameters,
          r.file_url,
          r.created_at,
          u.user_id,
          CONCAT(u.first_name, ' ', u.last_name) AS generated_by_name,
          b.branch_id,
          b.name AS branch_name
         FROM reports r
         LEFT JOIN users u ON r.generated_by = u.user_id
         LEFT JOIN branches b ON r.branch_id = b.branch_id
         WHERE r.company_id = :companyId
         ORDER BY r.created_at DESC`,
        { companyId }
      );
      return rows || [];
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        console.warn("[reports] reports table missing");
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

module.exports = reportsService;

