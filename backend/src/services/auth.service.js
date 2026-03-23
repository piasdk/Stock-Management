"use strict";

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Company = require("../models/Company");
const Invitation = require("../models/Invitation");
const Role = require("../models/Role");
const { generateToken } = require("../utils/jwt");
const { USER_STATUS, ROLE_CODES, ENFORCE_UNIQUE_EMAILS } = require("../config/constants");

/**
 * Sanitize user object (remove sensitive data)
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const { password_hash, password_reset_token, invitation_token, ...safe } = user;
  return safe;
};

async function resolveUserRole(user) {
  if (!user) return null;

  let role = null;
  try {
    if (user.role_id) {
      role = await Role.findById(user.role_id);
    }

    if (!role && user.user_id) {
      role = await Role.findByUserId(user.user_id);
    }
  } catch (error) {
    // Log but don't throw - return null if role lookup fails
    console.error("Error resolving user role:", {
      userId: user?.user_id,
      roleId: user?.role_id,
      error: error?.message,
    });
    return null;
  }

  return role;
}

async function enrichUserWithRole(user) {
  if (!user) return null;
  const safeUser = sanitizeUser(user);

  try {
    const role = await resolveUserRole(user);
    return {
      ...safeUser,
      role_name: role?.name || null,
      role_code: role?.role_code || null,
    };
  } catch (error) {
    // Log the error but don't fail the login - return user without role info
    console.error("Error fetching role for user:", {
      userId: user?.user_id,
      error: error?.message,
      stack: error?.stack,
    });
    // Return user without role info - login should still succeed
    return {
      ...safeUser,
      role_name: null,
      role_code: null,
    };
  }
}

/**
 * Sign up new user
 */
const signup = async (userData) => {
  const { company_id, company, first_name, last_name, email, password, invitation_token } = userData;

  if (ENFORCE_UNIQUE_EMAILS) {
    const existing = await User.findByEmail(email);
    if (existing) {
      throw new Error("User with this email already exists");
    }
  }

  let resolvedCompanyId = company_id;
  let resolvedBranchId = null;
  let isSuperAdmin = 0;
  let isCompanyAdmin = 0;
  let isBranchAdmin = 0;
  let invitationFirstName = null;
  let invitationLastName = null;
  let invitationRoleId = null;

  // If invitation token is provided, validate and use it
  if (invitation_token) {
    const invitation = await Invitation.findByToken(invitation_token);
    
    if (!invitation) {
      throw new Error("Invalid invitation token");
    }

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (now > expiresAt) {
      await Invitation.markAsExpired(invitation.invitation_id);
      throw new Error("Invitation has expired");
    }

    // Check if already accepted
    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been used");
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error("Email does not match the invitation");
    }

    resolvedCompanyId = invitation.company_id;
    resolvedBranchId = invitation.branch_id;
    
    // Store invitation names for later use
    invitationFirstName = invitation.first_name;
    invitationLastName = invitation.last_name;

    invitationRoleId = invitation.role_id;
    let invitationRoleCode = null;
    if (invitationRoleId) {
      try {
        const invitedRole = await Role.findById(invitationRoleId);
        invitationRoleCode = invitedRole?.role_code || null;
      } catch (error) {
        console.warn("Unable to resolve invited role:", error);
      }
    }

    if (invitationRoleCode === ROLE_CODES.SUPER_ADMIN) {
      isSuperAdmin = 1;
      isCompanyAdmin = 1;
    } else if (invitationRoleCode === ROLE_CODES.COMPANY_ADMIN) {
      isCompanyAdmin = 1;
    } else if (invitationRoleCode === ROLE_CODES.BRANCH_ADMIN) {
      isBranchAdmin = 1;
    } else if (resolvedBranchId) {
      isBranchAdmin = 1;
    } else {
      isBranchAdmin = 0;
    }

    // Mark invitation as accepted
    await Invitation.markAsAccepted(invitation.invitation_id);
  } else if (!resolvedCompanyId && company) {
    // Creating new company: signup is Company Admin of that company only (not platform Super Admin)
    const createdCompany = await Company.create({
      name: company.name,
      legal_name: company.legal_name || company.name,
      tax_id: company.tax_id || null,
      currency: company.currency || "USD",
      timezone: company.timezone || "UTC",
      country: company.country || null,
      email: company.email || email,
      phone: company.phone || null,
    });

    resolvedCompanyId = createdCompany?.company_id;
    isSuperAdmin = 0; // Platform Super Admin controls all companies; company creator is Company Admin only
    isCompanyAdmin = 1;
    // Assign Company Admin role so role_name/role_code show "Company Admin" in UI
    const companyAdminRole = await Role.findByCode(ROLE_CODES.COMPANY_ADMIN, null);
    if (companyAdminRole) {
      invitationRoleId = companyAdminRole.role_id;
    }
  }

  if (!resolvedCompanyId) {
    throw new Error("Unable to determine company. Provide company_id, company details, or invitation_token.");
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Use first_name and last_name from invitation if provided, otherwise use from signup
  const finalFirstName = invitationFirstName || first_name;
  const finalLastName = invitationLastName || last_name;

  // Create user
  const userId = await User.create({
    company_id: resolvedCompanyId,
    branch_id: resolvedBranchId,
    role_id: invitationRoleId,
    first_name: finalFirstName,
    last_name: finalLastName,
    email,
    password_hash,
    is_super_admin: isSuperAdmin,
    is_company_admin: isCompanyAdmin,
    is_branch_admin: isBranchAdmin,
    status: USER_STATUS.ACTIVE,
  });

  // Get created user
  const user = await User.findById(userId);

  // Generate token
  const roleInfo = await enrichUserWithRole(user);
  const token = generateToken({
    user_id: user.user_id,
    company_id: user.company_id,
    email: user.email,
    branch_id: user.branch_id,
    is_super_admin: user.is_super_admin,
    is_company_admin: user.is_company_admin,
    is_branch_admin: user.is_branch_admin,
    role_id: user.role_id,
    role_code: roleInfo?.role_code || null,
  });

  return {
    user: roleInfo,
    token,
  };
};

/**
 * Fetch profile for current user
 */
const getProfile = async (userId) => {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  return await enrichUserWithRole(user);
};

/**
 * Login user
 */
const login = async (email, password) => {
  try {
    console.log("Login service: Finding users by email:", email);
    // Find all users with this email (in case multiple users share the same email)
    const users = await User.findAllByEmail(email);
    console.log("Login service: Users found:", users.length);
    
    if (!users || users.length === 0) {
      throw new Error("Invalid email or password");
    }

    // Try to match password against each user
    let authenticatedUser = null;
    for (const user of users) {
      console.log(`Login service: Checking password for user ${user.user_id}...`);
      const passwordMatch = await bcrypt.compare(password, user.password_hash || "");
      if (passwordMatch) {
        // Check if user is active
        if (user.status !== USER_STATUS.ACTIVE) {
          throw new Error("User account is not active");
        }
        authenticatedUser = user;
        console.log(`Login service: Password matched for user ${user.user_id}`);
        break;
      }
    }

    if (!authenticatedUser) {
      console.log("Login service: No matching password found for any user");
      throw new Error("Invalid email or password");
    }

    const user = authenticatedUser;

    // Update last login (don't fail if this fails)
    try {
      console.log("Login service: Updating last login...");
      await User.updateLastLogin(user.user_id);
    } catch (updateError) {
      console.error("Failed to update last login:", updateError?.message);
      // Continue with login even if last login update fails
    }

    // Generate token - enrich user with role info
    let roleInfo;
    try {
      console.log("Login service: Enriching user with role...");
      roleInfo = await enrichUserWithRole(user);
      console.log("Login service: Role enrichment complete");
    } catch (roleError) {
      console.error("Error enriching user with role:", roleError?.message);
      // If role enrichment fails, use basic user info
      roleInfo = sanitizeUser(user);
      roleInfo.role_name = null;
      roleInfo.role_code = null;
    }

    // Generate token
    console.log("Login service: Generating token...");
    const token = generateToken({
      user_id: user.user_id,
      company_id: user.company_id,
      email: user.email,
      branch_id: user.branch_id,
      is_super_admin: user.is_super_admin,
      is_company_admin: user.is_company_admin,
      is_branch_admin: user.is_branch_admin,
      role_id: user.role_id,
      role_code: roleInfo?.role_code || null,
    });
    console.log("Login service: Token generated successfully");

    return {
      user: roleInfo,
      token,
    };
  } catch (error) {
    // Re-throw authentication errors as-is
    if (error.message === "Invalid email or password" || 
        error.message === "User account is not active") {
      throw error;
    }
    // Log unexpected errors and wrap them
    console.error("Unexpected error during login:", {
      email,
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    throw new Error("An error occurred during login. Please try again.");
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  sanitizeUser,
};

