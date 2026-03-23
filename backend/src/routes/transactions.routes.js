"use strict";

const express = require("express");
const { getOverview } = require("../controllers/transactions.controller");
const { auth } = require("../middleware/auth");
const { tenancy } = require("../middleware/tenancy");

const router = express.Router();

router.use(auth);
router.use(tenancy);

router.get("/overview", getOverview);

module.exports = router;


