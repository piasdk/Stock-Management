"use strict";

const Invitation = require("../models/Invitation");
const User = require("../models/User");
const Company = require("../models/Company");
const Role = require("../models/Role");
const emailService = require("./email.service");
const { ENFORCE_UNIQUE_EMAILS } = require("../config/constants");

/**
 * Create invitation for branch admin
 */
const createInvitation = async (invitationData) => {
  const { company_id, branch_id, email, role_id, first_name, last_name, invited_by } = invitationData;

  // Check if user with this email already exists (optional)
  if (ENFORCE_UNIQUE_EMAILS) {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }
  }

  // Check if there's already a pending invitation for this email
  const pool = require("../config/database");
  try {
    const queryResult = await pool.execute(
      "SELECT * FROM user_invitations WHERE email = :email AND status = 'pending' AND company_id = :companyId",
      { email, companyId: company_id }
    );
    
    if (Array.isArray(queryResult) && queryResult.length > 0) {
      const rows = queryResult[0];
      if (rows && Array.isArray(rows) && rows.length > 0) {
        throw new Error("A pending invitation already exists for this email");
      }
    }
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") {
      throw new Error("Database table 'user_invitations' does not exist. Please create the table first.");
    }
    // Re-throw if it's the "already exists" error
    if (error.message && error.message.includes("pending invitation already exists")) {
      throw error;
    }
    throw error;
  }

  // Create invitation
  try {
    // If role_id is not provided, find branch_admin role by code
    let finalRoleId = role_id;
    
    if (finalRoleId === null || finalRoleId === undefined) {
      try {
        const Role = require("../models/Role");
        const branchAdminRole = await Role.findByCode("branch_admin", company_id ?? null);
        if (branchAdminRole) {
          finalRoleId = branchAdminRole.role_id;
          console.log("Using default branch_admin role:", finalRoleId);
        } else {
          // Fallback: get first available non-system role (excluding super_admin)
          const allRoles = await Role.findAll(company_id);
          const nonSystemRole = allRoles.find(r => 
            r.is_system_role === 0 && 
            r.is_active === 1 && 
            r.role_code !== "super_admin"
          );
          if (nonSystemRole) {
            finalRoleId = nonSystemRole.role_id;
            console.log("Using first available role:", finalRoleId);
          } else {
            throw new Error("No suitable role found. Please create roles first.");
          }
        }
      } catch (roleError) {
        console.error("Error finding default role:", roleError);
        throw new Error("Could not determine default role. Please specify a role_id.");
      }
    }
    
    const invitation = await Invitation.create({
      company_id,
      branch_id,
      role_id: finalRoleId,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      invited_by,
      expires_in_days: 7,
    });

    if (!invitation) {
      throw new Error("Failed to create invitation - no invitation returned");
    }

    // Send invitation email (don't fail if email fails)
    try {
      // Get company name
      let companyName = null;
      try {
        const company = await Company.findById(company_id);
        companyName = company?.name || null;
      } catch (err) {
        console.warn("Could not fetch company name for email:", err);
      }

      // Get branch name
      let branchName = null;
      if (branch_id) {
        try {
          const Branch = require("../models/Branch");
          const branch = await Branch.findById(branch_id);
          branchName = branch?.name || null;
        } catch (err) {
          console.warn("Could not fetch branch name for email:", err);
        }
      }

      // Get role name
      let roleName = null;
      if (finalRoleId) {
        try {
          const role = await Role.findById(finalRoleId);
          roleName = role?.name || null;
        } catch (err) {
          console.warn("Could not fetch role name for email:", err);
        }
      }

      // Get inviter name
      let inviterName = null;
      try {
        const inviter = await User.findById(invited_by);
        if (inviter) {
          inviterName = [inviter.first_name, inviter.last_name].filter(Boolean).join(" ") || inviter.email;
        }
      } catch (err) {
        console.warn("Could not fetch inviter name for email:", err);
      }

      // Send email
      const emailResult = await emailService.sendInvitationEmail({
        email: invitation.email,
        invitation_token: invitation.invitation_token,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        company_name: companyName,
        branch_name: branchName,
        role_name: roleName,
        invited_by_name: inviterName,
        expires_at: invitation.expires_at,
      });

      if (!emailResult.sent) {
        console.warn("⚠️ Invitation created but email not sent!");
        console.warn("Email error:", emailResult.error);
        console.warn("Email error code:", emailResult.code);
        // Return invitation with email_sent: false so frontend can show the invite link
        return {
          ...invitation,
          email_sent: false,
          email_error: emailResult.error || "Email could not be sent",
        };
      }
      console.log("✅ Invitation email sent successfully to:", invitation.email);
      return { ...invitation, email_sent: true };
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError);
      // Don't throw - invitation is still created in database; tell frontend email wasn't sent
      return {
        ...invitation,
        email_sent: false,
        email_error: emailError?.message || "Failed to send email",
      };
    }
  } catch (error) {
    console.error("Error in invitation service createInvitation:", error);
    // Re-throw with more context
    if (error.code === "ER_NO_SUCH_TABLE") {
      throw new Error("Database table 'user_invitations' does not exist. Please run the migration.");
    }
    if (error.code === "ER_BAD_FIELD_ERROR") {
      throw new Error(`Database column error: ${error.sqlMessage}`);
    }
    throw error;
  }
};

/**
 * Validate invitation token
 */
const validateInvitation = async (token) => {
  const invitation = await Invitation.findByToken(token);
  
  if (!invitation) {
    throw new Error("Invalid or expired invitation");
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
    throw new Error("Invitation has already been used or cancelled");
  }

  return invitation;
};

/**
 * Accept invitation (mark as accepted)
 */
const acceptInvitation = async (invitationId) => {
  return await Invitation.markAsAccepted(invitationId);
};

/**
 * List invitations for a company
 */
const listInvitations = async (companyId, options = {}) => {
  const { invitedBy = null, branchId = null } = options;
  let rows = await Invitation.findByCompany(companyId);

  if (invitedBy !== null && invitedBy !== undefined) {
    rows = rows.filter((inv) => inv.invited_by === invitedBy);
  }

  if (branchId !== null && branchId !== undefined) {
    rows = rows.filter((inv) => inv.branch_id === branchId);
  }

  return rows;
};

/**
 * Cancel invitation
 */
const cancelInvitation = async (invitationId, companyId) => {
  const invitation = await Invitation.findById(invitationId);
  
  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.company_id !== companyId) {
    throw new Error("Unauthorized to cancel this invitation");
  }

  return await Invitation.cancel(invitationId);
};

module.exports = {
  createInvitation,
  validateInvitation,
  acceptInvitation,
  listInvitations,
  cancelInvitation,
};

