"use strict";

const express = require("express");

const { listCompanies } = require("../controllers/companiesController");

const router = express.Router();

router.get("/", listCompanies);

module.exports = router;

