"use strict";

const express = require("express");
const {
  listJournalEntries,
  createJournalEntry,
  listChartOfAccounts,
  createChartOfAccount,
  updateChartOfAccount,
  getDashboardOverview,
} = require("../controllers/accounting.controller");
const { auth } = require("../middleware/auth");
const { tenancy } = require("../middleware/tenancy");

const router = express.Router();

// All routes require authentication and tenancy
router.use(auth);
router.use(tenancy);

router.get("/journal-entries", listJournalEntries);
router.post("/journal-entries", createJournalEntry);
router.get("/chart-of-accounts", listChartOfAccounts);
router.post("/chart-of-accounts", createChartOfAccount);
router.put("/chart-of-accounts/:id", updateChartOfAccount);
router.get("/dashboard-overview", getDashboardOverview);

module.exports = router;

