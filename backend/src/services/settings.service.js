"use strict";

const pool = require("../config/database");

const settingsService = {
  /**
   * Get all settings for a tenant
   */
  getAll: async (user, companyIdParam) => {
    const companyId = resolveCompanyContext(user, companyIdParam);

    if (!companyId) {
      throw new Error("Company context is required");
    }

    try {
      const [rows] = await pool.execute(
        `SELECT
          s.setting_id,
          s.setting_key,
          s.setting_value,
          s.setting_type,
          s.description,
          s.created_at,
          s.updated_at
         FROM settings s
         WHERE s.company_id = :companyId
         ORDER BY s.setting_key`,
        { companyId }
      );
      return rows || [];
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        console.warn("[settings] settings table missing");
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

module.exports = settingsService;

