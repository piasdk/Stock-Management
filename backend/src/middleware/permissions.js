"use strict";

const asyncHandler = require("../utils/asyncHandler");
const pool = require("../config/database");

/**
 * Permission checking middleware factory
 * @param {String|Array} permissionCodes - Permission code(s) required
 * @returns {Function} Middleware function
 */
const permissions = (permissionCodes) => {
  const codes = Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes];

  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Super admin has all permissions
    if (req.user.is_super_admin) {
      return next();
    }

    // Company admin has all permissions for their company
    if (req.user.is_company_admin && req.user.company_id) {
      return next();
    }

    // Branch admin has all permissions for their branch
    if (req.user.is_branch_admin && req.user.branch_id) {
      return next();
    }

    // Check user's role permissions
    const placeholders = codes.map(() => "?").join(",");
    const [permissions] = await pool.execute(
      `SELECT p.code
       FROM permissions p
       INNER JOIN role_permissions rp ON p.permission_id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = ?
       AND p.code IN (${placeholders})`,
      [req.user.user_id, ...codes]
    );

    const userPermissions = permissions.map((p) => p.code);
    const hasAllPermissions = codes.every((code) => userPermissions.includes(code));

    if (!hasAllPermissions) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: codes,
        has: userPermissions,
      });
    }

    next();
  });
};

/**
 * Check if user has any of the specified permissions
 * @param {String|Array} permissionCodes - Permission code(s)
 * @returns {Function} Middleware function
 */
const anyPermission = (permissionCodes) => {
  const codes = Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes];

  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Super admin, company admin, branch admin have all permissions
    if (req.user.is_super_admin || req.user.is_company_admin || req.user.is_branch_admin) {
      return next();
    }

    // Check user's role permissions
    const placeholders = codes.map(() => "?").join(",");
    const [permissions] = await pool.execute(
      `SELECT p.code
       FROM permissions p
       INNER JOIN role_permissions rp ON p.permission_id = rp.permission_id
       INNER JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = ?
       AND p.code IN (${placeholders})`,
      [req.user.user_id, ...codes]
    );

    if (permissions.length === 0) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: codes,
      });
    }

    next();
  });
};

module.exports = {
  permissions,
  anyPermission,
};

