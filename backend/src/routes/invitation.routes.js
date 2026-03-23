"use strict";

const express = require("express");
const {
  createInvitation,
  validateInvitation,
  listInvitations,
  cancelInvitation,
} = require("../controllers/invitation.controller");
const { auth } = require("../middleware/auth");
const { validateEmail } = require("../middleware/validation");

const router = express.Router();

// Validate invitation token (public endpoint, no auth required)
router.get("/validate/:token", validateInvitation);

// All other routes require authentication
router.use(auth);

// Create invitation
router.post("/", validateEmail("email"), createInvitation);

// List invitations
router.get("/", listInvitations);

// Cancel invitation
router.post("/:id/cancel", cancelInvitation);

module.exports = router;

