"use strict";

const asyncHandler = require("../utils/asyncHandler");
const transactionsService = require("../services/transactions.service");

/**
 * GET /api/transactions/overview
 * Query: company_id (optional), branchId or branch_id (optional)
 */
const getOverview = asyncHandler(async (req, res) => {
  const companyIdParam = req.query.company_id
    ? parseInt(req.query.company_id, 10)
    : null;
  const branchIdParam = req.query.branchId ?? req.query.branch_id;
  const branchId = branchIdParam != null ? parseInt(String(branchIdParam), 10) : null;

  const overview = await transactionsService.getOverview(
    req.user,
    companyIdParam,
    isNaN(branchId) ? undefined : branchId,
  );
  res.json(overview);
});

module.exports = {
  getOverview,
};


