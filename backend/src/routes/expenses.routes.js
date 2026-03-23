"use strict";

const express = require("express");
const { listExpenses } = require("../controllers/expenses.controller");
const { auth } = require("../middleware/auth");
const { tenancy } = require("../middleware/tenancy");

const router = express.Router();

// All routes require authentication and tenancy
router.use(auth);
router.use(tenancy);

router.get("/", listExpenses);

module.exports = router;

