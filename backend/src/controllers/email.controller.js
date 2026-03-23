"use strict";

const asyncHandler = require("../utils/asyncHandler");
const emailService = require("../services/email.service");

/**
 * POST /api/email/test
 * Test email configuration
 */
const testEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email address is required" });
  }

  // Only super admin can test emails
  if (!req.user.is_super_admin) {
    return res.status(403).json({ error: "Only super administrators can test emails" });
  }

  const result = await emailService.sendInvitationEmail({
    email,
    invitation_token: "test-token-12345",
    first_name: "Test",
    last_name: "User",
    company_name: "Test Company",
    branch_name: null,
    role_name: "Test Role",
    invited_by_name: req.user.first_name || "Admin",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (result.sent) {
    res.json({
      success: true,
      message: "Test email sent successfully",
      messageId: result.messageId,
      response: result.response,
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      code: result.code,
      message: "Failed to send test email. Check SMTP configuration.",
    });
  }
});

module.exports = {
  testEmail,
};

