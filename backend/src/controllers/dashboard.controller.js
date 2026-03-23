"use strict";

const asyncHandler = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboard.service");

/**
 * GET /api/dashboard/overview
 */
const getOverview = asyncHandler(async (req, res) => {
  const companyIdParam = req.query.company_id
    ? parseInt(req.query.company_id, 10)
    : null;

  const overview = await dashboardService.getOverview(req.user, companyIdParam);
  res.json(overview);
});

/**
 * GET /api/dashboard/manager-overview
 * Same data as overview for the manager dashboard.
 */
const getManagerOverview = asyncHandler(async (req, res) => {
  const companyIdParam = req.query.company_id
    ? parseInt(req.query.company_id, 10)
    : null;

  const overview = await dashboardService.getOverview(req.user, companyIdParam);
  res.json(overview);
});

module.exports = {
  getOverview,
  getManagerOverview,
};


