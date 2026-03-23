"use strict";

const asyncHandler = require("../utils/asyncHandler");
const branchService = require("../services/branch.service");

/**
 * GET /api/companies/:companyId/branches
 * List branches for a company
 */
const listCompanyBranches = asyncHandler(async (req, res) => {
  const companyIdParam = req.params.companyId
    ? parseInt(req.params.companyId, 10)
    : null;

  const branches = await branchService.listForCompany(req.user, companyIdParam);
  res.json(branches);
});

/**
 * POST /api/companies/:companyId/branches
 * Create a branch for the specified company
 */
const createBranch = asyncHandler(async (req, res) => {
  const companyIdParam = req.params.companyId
    ? parseInt(req.params.companyId, 10)
    : null;

  const branch = await branchService.createBranch(req.user, {
    ...req.body,
    company_id: companyIdParam ?? req.body.company_id,
  });

  res.status(201).json(branch);
});

module.exports = {
  listCompanyBranches,
  createBranch,
};


