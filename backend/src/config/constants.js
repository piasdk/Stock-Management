"use strict";

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  API_PORT: process.env.API_PORT || 5000,
  
  // User statuses
  USER_STATUS: {
    ACTIVE: "active",
    SUSPENDED: "suspended",
    PENDING_INVITATION: "pending_invitation",
    INVITED: "invited",
  },
  
  // Role codes
  ROLE_CODES: {
    SUPER_ADMIN: "super_admin",
    COMPANY_ADMIN: "company_admin",
    BRANCH_ADMIN: "branch_admin",
    MANAGER: "manager",
  },
  
  // Invitation expiry (7 days)
  INVITATION_EXPIRY_DAYS: 7,
  
  // Password reset expiry (1 hour)
  PASSWORD_RESET_EXPIRY_HOURS: 1,

  // Feature flags
  ENFORCE_UNIQUE_EMAILS: false,
};

