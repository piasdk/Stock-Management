"use strict";

const express = require("express");
const { listCompanies, getCompany } = require("../controllers/company.controller");
const {
  listCompanyBranches,
  createBranch,
} = require("../controllers/branch.controller");
const { auth } = require("../middleware/auth");
const { tenancy } = require("../middleware/tenancy");

const router = express.Router();

// All routes require authentication and tenancy
router.use(auth);
router.use(tenancy);

router.get("/", listCompanies);
router.get("/:id", getCompany);
router.get("/:companyId/branches", listCompanyBranches);
router.post("/:companyId/branches", createBranch);

module.exports = router;

