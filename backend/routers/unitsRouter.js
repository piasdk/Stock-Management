"use strict";

const express = require("express");

const { listUnits } = require("../controllers/unitsController");

const router = express.Router();

router.get("/", listUnits);

module.exports = router;

