"use strict";

const asyncHandler = require("../utils/asyncHandler");
const roleService = require("../services/role.service");

/**
 * GET /api/roles
 * Get all roles (optionally filtered by company)
 */
const getAllRoles = asyncHandler(async (req, res) => {
  const companyId = req.user?.company_id || null;
  // Allow fetching roles even without company_id - will return system roles and company-specific roles
  const roles = await roleService.getAllRoles(companyId);
  res.json(roles);
});

/**
 * GET /api/roles/:id
 * Get role by ID
 */
const getRoleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const role = await roleService.getRoleById(parseInt(id, 10));
  res.json(role);
});

/**
 * POST /api/roles
 * Create new role
 */
const createRole = asyncHandler(async (req, res) => {
  const { name, role_code, description, is_active = true } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Role name is required" });
  }

  if (!role_code) {
    return res.status(400).json({ error: "Role code is required" });
  }

  // Super admins, company admins, and branch admins can create roles
  // Branch admins can only create company-specific roles
  if (!req.user.is_super_admin && !req.user.is_company_admin && !req.user.is_branch_admin) {
    return res.status(403).json({ error: "Only administrators can create roles" });
  }

  // Branch admins can only create roles for their company
  const companyId = req.user.is_super_admin ? (req.body.company_id || null) : req.user.company_id;

  const role = await roleService.createRole({
    company_id: companyId,
    name,
    role_code,
    description,
    is_active,
  });

  res.status(201).json(role);
});

/**
 * PUT /api/roles/:id
 * Update role
 */
const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, role_code, description, is_active } = req.body;

  // Only super admin can update roles
  if (!req.user.is_super_admin) {
    return res.status(403).json({ error: "Only super administrators can update roles" });
  }

  const role = await roleService.updateRole(parseInt(id, 10), {
    name,
    role_code,
    description,
    is_active,
  });

  res.json(role);
});

/**
 * DELETE /api/roles/:id
 * Delete role
 */
const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Only super admin can delete roles
  if (!req.user.is_super_admin) {
    return res.status(403).json({ error: "Only super administrators can delete roles" });
  }

  await roleService.deleteRole(parseInt(id, 10));
  res.json({ message: "Role deleted successfully" });
});

/**
 * POST /api/roles/seed
 * Seed default roles (public endpoint for initial setup)
 */
const seedRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.seedDefaultRoles();
  res.json({
    message: "Default roles seeded successfully",
    roles,
  });
});

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  seedRoles,
};

