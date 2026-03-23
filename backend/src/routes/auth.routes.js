"use strict";

const express = require("express");
const { signup, login, logout, getProfile } = require("../controllers/auth.controller");
const { requireFields, validateEmail } = require("../middleware/validation");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", validateEmail("email"), signup);

router.post(
  "/login",
  requireFields(["email", "password"]),
  validateEmail("email"),
  login
);

router.post("/logout", auth, logout);

router.get("/me", auth, getProfile);

module.exports = router;

