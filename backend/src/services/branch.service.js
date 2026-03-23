"use strict";

const Branch = require("../models/Branch");

const branchService = {
  /**
   * List branches for a company context
   */
  listForCompany: async (user, companyIdParam) => {
    const resolvedCompanyId = resolveCompanyContext(user, companyIdParam);

    if (!resolvedCompanyId) {
      throw new Error("Company context is required to list branches");
    }

    return Branch.findByCompany(resolvedCompanyId);
  },

  /**
   * Create a new branch for the user's company (or specified company for super admin)
   */
  createBranch: async (user, branchData) => {
    const resolvedCompanyId = resolveCompanyContext(
      user,
      branchData.company_id
    );

    if (!resolvedCompanyId) {
      throw new Error("Company context is required to create a branch");
    }

    if (!user.is_super_admin && !user.is_company_admin) {
      throw new Error("Only company admins can create branches");
    }

    if (!branchData.name || !branchData.code) {
      throw new Error("Branch name and code are required");
    }

    const branchId = await Branch.create({
      ...branchData,
      company_id: resolvedCompanyId,
    });

    return Branch.findById(branchId);
  },
};

function resolveCompanyContext(user, providedCompanyId) {
  if (!user) {
    return null;
  }

  const userCompanyId = user.company_id || null;
  if (!userCompanyId) {
    return null;
  }

  if (user.is_super_admin) {
    if (providedCompanyId && providedCompanyId !== userCompanyId) {
      return userCompanyId;
    }
    return userCompanyId;
  }

  return userCompanyId;
}

module.exports = branchService;


