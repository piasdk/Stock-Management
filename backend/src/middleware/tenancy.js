"use strict";

const asyncHandler = require("../utils/asyncHandler");

/**
 * Multi-tenant Middleware
 * Ensures user can only access their company's data
 * For super admins, allows access to all companies
 */
const tenancy = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Super admin should still stay within their own company context
  if (req.user.is_super_admin) {
    if (!req.user.company_id) {
      return res.status(403).json({ error: "Super admin must be tied to a company" });
    }

    req.tenant = {
      company_id: req.user.company_id,
      branch_id: req.user.branch_id || null,
      is_super_admin: true,
    };
    return next();
  }

  // Regular users must have a company_id
  if (!req.user.company_id) {
    return res.status(403).json({ error: "User must be associated with a company" });
  }

  const queryBranchId = req.query.branch_id ?? req.query.branchId ?? req.params.branch_id ?? req.params.branchId;
  const branchId = req.user.branch_id || (queryBranchId != null ? parseInt(String(queryBranchId), 10) : null);

  // Set tenant context
  req.tenant = {
    company_id: req.user.company_id,
    branch_id: isNaN(branchId) ? null : branchId,
    is_super_admin: false,
    is_company_admin: req.user.is_company_admin,
    is_branch_admin: req.user.is_branch_admin,
  };

  // Branch admin can only access their branch
  if (req.user.is_branch_admin && req.tenant.branch_id !== req.user.branch_id) {
    return res.status(403).json({ error: "Access denied: Branch admin can only access their branch" });
  }

  next();
});

/**
 * Branch-scoped middleware
 * Ensures request is scoped to a specific branch
 */
const requireBranch = asyncHandler(async (req, res, next) => {
  if (!req.tenant) {
    return res.status(401).json({ error: "Tenancy middleware required" });
  }

  const queryBranchId = req.query.branch_id ?? req.query.branchId ?? req.params.branch_id ?? req.params.branchId;
  const branchId = req.tenant.branch_id ?? (queryBranchId != null ? parseInt(String(queryBranchId), 10) : null);

  if (!branchId) {
    return res.status(400).json({ error: "Branch ID is required" });
  }

  // Branch admin can only access their branch
  if (req.user.is_branch_admin && branchId !== req.user.branch_id) {
    return res.status(403).json({ error: "Access denied: Cannot access other branches" });
  }

  req.tenant.branch_id = branchId;
  next();
});

module.exports = {
  tenancy,
  requireBranch,
};

