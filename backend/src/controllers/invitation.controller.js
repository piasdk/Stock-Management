"use strict";

const asyncHandler = require("../utils/asyncHandler");
const invitationService = require("../services/invitation.service");

/**
 * POST /api/invitations
 * Create a new invitation
 */
const createInvitation = asyncHandler(async (req, res) => {
  const { email, branch_id, role_id, first_name, last_name } = req.body;
  const user = req.user;

  console.log("Create invitation request:", { email, branch_id, role_id, first_name, last_name });
  console.log("User:", { user_id: user?.user_id, company_id: user?.company_id, is_admin: user?.is_company_admin || user?.is_super_admin });

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Super admin, company admin, and branch admin can create invitations
  if (!user.is_super_admin && !user.is_company_admin && !user.is_branch_admin) {
    return res.status(403).json({ error: "Only administrators can send invitations" });
  }

  const companyId = user.company_id;
  
  // Branch admins can only send invitations for their own branch
  // If branch_id is provided, verify it matches the user's branch
  let finalBranchId = branch_id;
  if (user.is_branch_admin && user.branch_id) {
    // Branch admin must use their own branch_id
    finalBranchId = user.branch_id;
  } else if (user.is_branch_admin && !user.branch_id) {
    return res.status(403).json({ error: "Branch administrators must have an assigned branch" });
  }

  try {
    const invitation = await invitationService.createInvitation({
      company_id: companyId,
      branch_id: finalBranchId || null,
      role_id: role_id || null,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      invited_by: user.user_id,
    });

    console.log("Invitation created successfully:", invitation?.invitation_id);

    if (!invitation) {
      return res.status(500).json({ error: "Failed to create invitation" });
    }

    res.status(201).json(invitation);
  } catch (error) {
    console.error("Error creating invitation:", error);
    throw error; // Let asyncHandler handle it
  }
});

/**
 * GET /api/invitations/validate/:token
 * Validate an invitation token
 */
const validateInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const invitation = await invitationService.validateInvitation(token);
  
  res.json({
    valid: true,
    invitation: {
      email: invitation.email,
      first_name: invitation.first_name,
      last_name: invitation.last_name,
      role_id: invitation.role_id,
      role_name: invitation.role_name || null,
      role_code: invitation.role_code || null,
      company_id: invitation.company_id,
      branch_id: invitation.branch_id,
    },
  });
});

/**
 * GET /api/invitations
 * List invitations for the company
 */
const listInvitations = asyncHandler(async (req, res) => {
  const user = req.user;

  // Super admin, company admin, and branch admin can view invitations
  if (!user.is_super_admin && !user.is_company_admin && !user.is_branch_admin) {
    return res.status(403).json({ error: "Only administrators can view invitations" });
  }

  const filters = {};
  if (!user.is_super_admin && !user.is_company_admin) {
    filters.invitedBy = user.user_id;
  }

  if (user.is_branch_admin && user.branch_id) {
    filters.branchId = user.branch_id;
  }

  const invitations = await invitationService.listInvitations(
    user.company_id,
    filters,
  );

  res.json(invitations);
});

/**
 * POST /api/invitations/:id/cancel
 * Cancel an invitation
 */
const cancelInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  // Super admin, company admin, and branch admin can cancel invitations
  if (!user.is_super_admin && !user.is_company_admin && !user.is_branch_admin) {
    return res.status(403).json({ error: "Only administrators can cancel invitations" });
  }
  
  // Branch admins can only cancel invitations for their branch
  if (!user.is_super_admin && !user.is_company_admin) {
    const filters = {
      invitedBy: user.user_id,
    };

    if (user.is_branch_admin && user.branch_id) {
      filters.branchId = user.branch_id;
    }

    const invitations = await invitationService.listInvitations(user.company_id, filters);
    const targetInvitation = invitations.find(inv => inv.invitation_id === parseInt(id, 10));

    if (!targetInvitation) {
      return res.status(403).json({ error: "You can only cancel invitations you created" });
    }
  }

  await invitationService.cancelInvitation(parseInt(id, 10), user.company_id);
  res.json({ message: "Invitation cancelled successfully" });
});

module.exports = {
  createInvitation,
  validateInvitation,
  listInvitations,
  cancelInvitation,
};

