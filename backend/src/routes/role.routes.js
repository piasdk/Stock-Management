"use strict";

const express = require("express");
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  seedRoles,
} = require("../controllers/role.controller");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Seed default roles (public endpoint for initial setup - you might want to protect this)
router.post("/seed", seedRoles);

// All subsequent routes require authentication
router.use(auth);

// Get all roles (super-admin only)
router.get("/", getAllRoles);

// Get role by ID (authenticated)
router.get("/:id", getRoleById);

// Create role (super admin only)
router.post("/", createRole);

// Update role (super admin only)
router.put("/:id", updateRole);

// Delete role (super admin only)
router.delete("/:id", deleteRole);

module.exports = router;

