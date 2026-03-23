"use strict";

const Role = require("../models/Role");

/**
 * Get all roles (optionally filter by company)
 */
const getAllRoles = async (companyId = null) => {
  return await Role.findAll(companyId);
};

/**
 * Get role by ID
 */
const getRoleById = async (roleId) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new Error("Role not found");
  }
  return role;
};

/**
 * Get role by code
 */
const getRoleByCode = async (roleCode) => {
  const role = await Role.findByCode(roleCode);
  if (!role) {
    throw new Error("Role not found");
  }
  return role;
};

/**
 * Get role by name
 */
const getRoleByName = async (name) => {
  const role = await Role.findByName(name);
  if (!role) {
    throw new Error("Role not found");
  }
  return role;
};

/**
 * Create new role
 */
const createRole = async (roleData) => {
  const {
    company_id,
    name,
    role_code,
    description,
    is_active = true,
    created_by = null,
  } = roleData;

  if (!name) {
    throw new Error("Role name is required");
  }

  if (!role_code) {
    throw new Error("Role code is required");
  }

  // Check if role code already exists
  const existingByCode = await Role.findByCode(role_code, company_id || null);
  if (existingByCode) {
    throw new Error("Role with this code already exists");
  }

  // Check if role name already exists (for same company or system roles)
  const existingByName = await Role.findByName(name);
  if (existingByName && (existingByName.company_id === company_id || existingByName.company_id === null)) {
    throw new Error("Role with this name already exists");
  }

  return await Role.create({
    company_id: company_id || null,
    name,
    role_code,
    description: description || null,
    is_system_role: 0, // User-created roles are not system roles
    is_active: is_active ? 1 : 0,
    created_by,
  });
};

/**
 * Update role
 */
const updateRole = async (roleId, roleData) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new Error("Role not found");
  }

  // Cannot update system roles (except is_active)
  if (role.is_system_role === 1) {
    // Only allow updating is_active for system roles
    const allowedFields = { is_active: roleData.is_active };
    return await Role.update(roleId, allowedFields);
  }

  // If role_code is being changed, check for duplicates
  if (roleData.role_code && roleData.role_code !== role.role_code) {
    const existing = await Role.findByCode(roleData.role_code, role.company_id || null);
    if (existing) {
      throw new Error("Role with this code already exists");
    }
  }

  // If name is being changed, check for duplicates
  if (roleData.name && roleData.name !== role.name) {
    const existing = await Role.findByName(roleData.name);
    if (existing && existing.role_id !== roleId) {
      throw new Error("Role with this name already exists");
    }
  }

  return await Role.update(roleId, roleData);
};

/**
 * Delete role
 */
const deleteRole = async (roleId) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new Error("Role not found");
  }

  // Check if role is being used in user_roles table
  const pool = require("../config/database");
  const [userRoles] = await pool.execute(
    "SELECT COUNT(*) as count FROM user_roles WHERE role_id = :roleId",
    { roleId }
  );

  if (userRoles && userRoles[0] && userRoles[0][0] && userRoles[0][0].count > 0) {
    throw new Error("Cannot delete role: it is assigned to users");
  }

  // Check if role is being used in user_invitations table
  const [invitations] = await pool.execute(
    "SELECT COUNT(*) as count FROM user_invitations WHERE role_id = :roleId",
    { roleId }
  );

  if (invitations && invitations[0] && invitations[0][0] && invitations[0][0].count > 0) {
    throw new Error("Cannot delete role: it is used in pending invitations");
  }

  return await Role.delete(roleId);
};

/**
 * Seed default roles (run this once to populate the database)
 */
const seedDefaultRoles = async () => {
  const defaultRoles = [
    {
      name: "Company Admin",
      role_code: "company_admin",
      description: "Company Administrator - Manages company and branches",
      is_system_role: 0,
    },
    {
      name: "Branch Admin",
      role_code: "branch_admin",
      description: "Branch Administrator - Manages a specific branch",
      is_system_role: 0,
    },
    {
      name: "Manager",
      role_code: "manager",
      description: "Manager - Manages day-to-day operations",
      is_system_role: 0,
    },
    {
      name: "Staff",
      role_code: "staff",
      description: "Staff - Basic user access",
      is_system_role: 0,
    },
  ];

  const createdRoles = [];
  for (const roleData of defaultRoles) {
    try {
      const existing = await Role.findByCode(roleData.role_code, null);
      if (!existing) {
        const role = await Role.create({
          ...roleData,
          company_id: null, // System-wide roles
          is_active: 1,
        });
        createdRoles.push(role);
        console.log(`Created role: ${roleData.name}`);
      } else {
        console.log(`Role already exists: ${roleData.name}`);
        createdRoles.push(existing);
      }
    } catch (error) {
      console.error(`Error creating role ${roleData.name}:`, error);
    }
  }

  return createdRoles;
};

module.exports = {
  getAllRoles,
  getRoleById,
  getRoleByCode,
  getRoleByName,
  createRole,
  updateRole,
  deleteRole,
  seedDefaultRoles,
};

