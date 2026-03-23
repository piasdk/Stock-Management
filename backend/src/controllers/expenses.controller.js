"use strict";

const asyncHandler = require("../utils/asyncHandler");
const expensesService = require("../services/expenses.service");

/**
 * GET /api/expenses
 * List all expense reports
 */
const listExpenses = asyncHandler(async (req, res) => {
  const expenses = await expensesService.getAll(req.user);
  res.json(expenses);
});

module.exports = {
  listExpenses,
};

