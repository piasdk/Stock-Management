"use strict";

const asyncHandler = require("../utils/asyncHandler");
const accountingService = require("../services/accounting.service");

/**
 * GET /api/accounting/journal-entries
 * List all journal entries
 */
const listJournalEntries = asyncHandler(async (req, res) => {
  const entries = await accountingService.getJournalEntries(req.user);
  res.json(entries);
});

/**
 * POST /api/accounting/journal-entries
 * Create a journal entry with lines
 */
const createJournalEntry = asyncHandler(async (req, res) => {
  const entry = await accountingService.createJournalEntry(req.user, req.body);
  res.status(201).json(entry);
});

/**
 * GET /api/accounting/chart-of-accounts
 * List chart of accounts
 */
const listChartOfAccounts = asyncHandler(async (req, res) => {
  const accounts = await accountingService.getChartOfAccounts(req.user);
  res.json(accounts);
});

/**
 * POST /api/accounting/chart-of-accounts
 * Create a chart of accounts entry
 */
const createChartOfAccount = asyncHandler(async (req, res) => {
  const account = await accountingService.createChartOfAccount(req.user, req.body);
  res.status(201).json(account);
});

/**
 * PUT /api/accounting/chart-of-accounts/:id
 * Update a chart of accounts entry
 */
const updateChartOfAccount = asyncHandler(async (req, res) => {
  const account = await accountingService.updateChartOfAccount(req.user, req.params.id, req.body);
  res.json(account);
});

/**
 * GET /api/accounting/dashboard-overview
 */
const getDashboardOverview = asyncHandler(async (req, res) => {
  const overview = await accountingService.getDashboardOverview(req.user, req.query.companyId);
  res.json(overview);
});

module.exports = {
  listJournalEntries,
  createJournalEntry,
  listChartOfAccounts,
  createChartOfAccount,
  updateChartOfAccount,
  getDashboardOverview,
};

