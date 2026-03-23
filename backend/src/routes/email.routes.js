"use strict";

const express = require("express");
const { testEmail } = require("../controllers/email.controller");
const { auth } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(auth);

// Test email
router.post("/test", testEmail);

module.exports = router;

