"use strict";

const Company = require("../models/Company");

const companyService = {
  /**
   * Get all companies
   * Super admin can see all, others see only their company
   */
  getAll: async (user) => {
    if (user.company_id) {
      const company = await Company.findById(user.company_id);
      return company ? [company] : [];
    }
    // For super admins without company, deny access
    return [];
  },

  /**
   * Get company by ID
   */
  getById: async (companyId, user) => {
    const company = await Company.findById(companyId);
    
    if (!company) {
      throw new Error("Company not found");
    }

    // Check access: super admin or own company
    if (!user.is_super_admin && user.company_id !== companyId) {
      throw new Error("Access denied");
    }

    return company;
  },
};

module.exports = companyService;

