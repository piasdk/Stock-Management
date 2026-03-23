"use strict";

const { verifyToken } = require("../utils/jwt");
const asyncHandler = require("../utils/asyncHandler");

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
const auth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const decoded = verifyToken(token);
    
    // Attach user info to request
    req.user = {
      user_id: decoded.user_id,
      company_id: decoded.company_id,
      email: decoded.email,
      branch_id: decoded.branch_id,
      is_super_admin: decoded.is_super_admin,
      is_company_admin: decoded.is_company_admin,
      is_branch_admin: decoded.is_branch_admin,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work with or without auth
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = verifyToken(token);
      req.user = {
        user_id: decoded.user_id,
        company_id: decoded.company_id,
        email: decoded.email,
        branch_id: decoded.branch_id,
        is_super_admin: decoded.is_super_admin,
        is_company_admin: decoded.is_company_admin,
        is_branch_admin: decoded.is_branch_admin,
      };
    } catch (error) {
      // Ignore invalid token for optional auth
    }
  }

  next();
});

module.exports = {
  auth,
  optionalAuth,
};

