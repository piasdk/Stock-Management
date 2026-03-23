"use strict";

const express = require("express");
const authRoutes = require("./auth.routes");
const companyRoutes = require("./company.routes");
const dashboardRoutes = require("./dashboard.routes");
const transactionsRoutes = require("./transactions.routes");
const salesRoutes = require("./sales.routes");
const purchasesRoutes = require("./purchases.routes");
const expensesRoutes = require("./expenses.routes");
const accountingRoutes = require("./accounting.routes");
const reportsRoutes = require("./reports.routes");
const settingsRoutes = require("./settings.routes");
const invitationRoutes = require("./invitation.routes");
const roleRoutes = require("./role.routes");
const emailRoutes = require("./email.routes");
const catalogRoutes = require("../../routers/catalogRouter");
const unitsRoutes = require("../../routers/unitsRouter");
const suppliersRoutes = require("../../routers/suppliersRouter");
const customersRoutes = require("../../routers/customersRouter");
const inventoryRoutes = require("../../routers/inventoryRouter");
const operationsRoutes = require("./operations.routes");
const productionRoutes = require("./production.routes");

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount route modules
router.use("/auth", authRoutes);
router.use("/companies", companyRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/transactions", transactionsRoutes);
router.use("/sales", salesRoutes);
router.use("/purchases", purchasesRoutes);
router.use("/expenses", expensesRoutes);
router.use("/accounting", accountingRoutes);
router.use("/reports", reportsRoutes);
router.use("/settings", settingsRoutes);
router.use("/invitations", invitationRoutes);
router.use("/roles", roleRoutes);
router.use("/email", emailRoutes);
router.use("/catalog", catalogRoutes);
router.use("/units", unitsRoutes);
router.use("/suppliers", suppliersRoutes);
router.use("/customers", customersRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/operations", operationsRoutes);
router.use("/production", productionRoutes);
// etc.

module.exports = router;

