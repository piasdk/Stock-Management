"use strict";

const asyncHandler = require("../utils/asyncHandler");
const purchasesService = require("../services/purchases.service");

/**
 * GET /api/purchases
 * List all purchase orders
 */
const listPurchases = asyncHandler(async (req, res) => {
  const purchases = await purchasesService.getAll(req.user);
  res.json(purchases);
});

/**
 * POST /api/purchases
 * Create a new purchase order
 */
const createPurchase = asyncHandler(async (req, res) => {
  const purchaseOrder = await purchasesService.create(req.user, req.body);
  res.status(201).json(purchaseOrder);
});

module.exports = {
  listPurchases,
  createPurchase,
};

