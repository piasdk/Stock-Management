"use strict";

const express = require("express");
const { listPurchases, createPurchase } = require("../controllers/purchases.controller");
const { auth } = require("../middleware/auth");
const { tenancy } = require("../middleware/tenancy");

const router = express.Router();

// All routes require authentication and tenancy
router.use(auth);
router.use(tenancy);

router.get("/", listPurchases);
router.post("/", createPurchase);

module.exports = router;

