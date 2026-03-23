"use strict";

const companyService = require("../services/company.service");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Get all companies
 * GET /api/companies
 */
const listCompanies = asyncHandler(async (req, res) => {
  const companies = await companyService.getAll(req.user);
  res.json(companies);
});

/**
 * Get company by ID
 * GET /api/companies/:id
 */
const getCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const company = await companyService.getById(parseInt(id), req.user);
  res.json(company);
});

module.exports = {
  listCompanies,
  getCompany,
};

