"use strict";

const express = require("express");
const {
  getAllInventory,
  getStockByLocation,
  getStockMovements,
  getPurchaseOrdersForReceiving,
  getPurchaseOrderDetails,
  createGoodsReceipt,
  getPhysicalCounts,
  getStockAdjustments,
  getSalesOrdersForShipping,
  getExpectedDeliveries,
  getReorderPoints,
  updateReorderPoints
} = require("../controllers/operations.controller");
const { auth } = require("../middleware/auth");
const { tenancy } = require("../middleware/tenancy");

const router = express.Router();

// All routes require authentication and tenancy
router.use(auth);
router.use(tenancy);

// Inventory endpoints
router.get("/inventory/all", getAllInventory);
router.get("/inventory/by-location", getStockByLocation);
router.get("/inventory/movements", getStockMovements);

// Receiving endpoints
router.get("/receiving/purchase-orders", getPurchaseOrdersForReceiving);
router.get("/receiving/purchase-orders/:id", getPurchaseOrderDetails);
router.post("/receiving/goods-receipts", createGoodsReceipt);

// Physical counts
router.get("/physical-counts", getPhysicalCounts);

// Stock adjustments
router.get("/stock-adjustments", getStockAdjustments);

// Shipping endpoints
router.get("/shipping/sales-orders", getSalesOrdersForShipping);

// Expected deliveries
router.get("/expected-deliveries", getExpectedDeliveries);

// Reorder points
router.get("/reorder-points", getReorderPoints);
router.put("/reorder-points", updateReorderPoints);

module.exports = router;



