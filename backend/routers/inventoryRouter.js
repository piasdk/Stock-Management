"use strict";

const express = require("express");

const {
  listStockLevels,
  getStockLevel,
  createStockLevel,
  updateStockLevel,
  adjustStock,
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} = require("../controllers/inventoryController");

const { auth } = require("../src/middleware/auth");
const { tenancy } = require("../src/middleware/tenancy");

const router = express.Router();

// All routes require authentication and tenancy
router.use(auth);
router.use(tenancy);

router.get("/stock-levels", listStockLevels);
router.get("/stock-levels/:id", getStockLevel);
router.post("/stock-levels", createStockLevel);
router.put("/stock-levels/:id", updateStockLevel);
router.post("/stock-levels/:id/adjust", adjustStock);

router.get("/locations", listLocations);
router.post("/locations", createLocation);
router.put("/locations/:id", updateLocation);
router.delete("/locations/:id", deleteLocation);

module.exports = router;

