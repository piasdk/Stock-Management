"use strict";

const express = require("express");
const { getOverview, getManagerOverview } = require("../controllers/dashboard.controller");
const { auth } = require("../middleware/auth");
const { tenancy } = require("../middleware/tenancy");

const router = express.Router();

router.use(auth);
router.use(tenancy);

router.get("/overview", getOverview);
router.get("/manager-overview", getManagerOverview);

module.exports = router;


