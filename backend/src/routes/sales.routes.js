"use strict";

const express = require("express");
const { listSales, createSales } = require("../controllers/sales.controller");
const { auth } = require("../middleware/auth");
const { tenancy } = require("../middleware/tenancy");

const router = express.Router();

// All routes require authentication and tenancy
router.use(auth);
router.use(tenancy);

router.get("/", listSales);
router.post("/", createSales);

module.exports = router;

