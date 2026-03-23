"use strict";

const asyncHandler = require("../utils/asyncHandler");
const reportsService = require("../services/reports.service");

/**
 * GET /api/reports
 * List all reports
 */
const listReports = asyncHandler(async (req, res) => {
  const reports = await reportsService.getAll(req.user);
  res.json(reports);
});

module.exports = {
  listReports,
};

