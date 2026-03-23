"use strict";

const asyncHandler = require("../utils/asyncHandler");
const salesService = require("../services/sales.service");

/**
 * GET /api/sales
 * List all sales orders
 */
const listSales = asyncHandler(async (req, res) => {
  const sales = await salesService.getAll(req.user);
  res.json(sales);
});

/**
 * POST /api/sales
 * Create a new sales order
 */
const createSales = asyncHandler(async (req, res) => {
  const salesOrder = await salesService.create(req.user, req.body);
  res.status(201).json(salesOrder);
});

module.exports = {
  listSales,
  createSales,
};

