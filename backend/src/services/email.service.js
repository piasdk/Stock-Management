"use strict";

const nodemailer = require("nodemailer");

/**
 * Email Service
 * Handles sending emails for invitations and notifications
 */

// Create transporter based on environment variables
const createTransporter = () => {
  // Check if SMTP is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.warn("⚠️ SMTP not configured. Emails will not be sent.");
    console.warn("Missing:", {
      host: !smtpHost,
      user: !smtpUser,
      password: !smtpPassword,
    });
    return null;
  }

  console.log("📧 Creating SMTP transporter...");
  
  // For Gmail, use service instead of host/port
  let transporterConfig;
  if (smtpHost.includes("gmail.com")) {
    transporterConfig = {
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    };
    console.log("Using Gmail service configuration");
  } else {
    transporterConfig = {
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Add connection timeout
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    };
  }

  const transporter = nodemailer.createTransport(transporterConfig);

  // Verify connection (async, don't block - just log)
  transporter.verify().then(() => {
    console.log("✅ SMTP connection verified successfully");
  }).catch((verifyError) => {
    console.error("❌ SMTP connection verification failed:");
    console.error("Error:", verifyError.message);
    console.error("Code:", verifyError.code);
    if (verifyError.code === "EAUTH") {
      console.error("⚠️ Authentication failed. Check your email and App Password.");
      console.error("Make sure you're using an App Password, not your regular Gmail password.");
    }
  });

  return transporter;
};

/**
 * Send invitation email
 */
const sendInvitationEmail = async (invitationData) => {
  const {
    email,
    invitation_token,
    first_name,
    last_name,
    company_name,
    branch_name,
    role_name,
    invited_by_name,
    expires_at,
  } = invitationData;

  const transporter = createTransporter();
  
  if (!transporter) {
    console.warn("Email not sent - SMTP not configured");
    return { sent: false, error: "SMTP not configured" };
  }

  // Build invitation URL
  const baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
  const invitationUrl = `${baseUrl}/accept-invitation?token=${invitation_token}`;

  // Format recipient name
  const recipientName = first_name || last_name 
    ? `${first_name || ""} ${last_name || ""}`.trim() 
    : email;

  // Format expiration date
  const expirationDate = new Date(expires_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "Stock Platform"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: `Invitation to join ${company_name || "our platform"}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              background: #f5f5f5;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-radius: 0 0 8px 8px;
            }
            .info-box {
              background: #f9f9f9;
              padding: 15px;
              border-left: 4px solid #667eea;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>You're Invited!</h1>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            
            <p>${invited_by_name || "An administrator"} has invited you to join <strong>${company_name || "our platform"}</strong>${branch_name ? ` (${branch_name} branch)` : ""}${role_name ? ` as a ${role_name}` : ""}.</p>
            
            <div class="info-box">
              <p><strong>What's next?</strong></p>
              <p>Click the button below to accept your invitation and create your account:</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <a href="${invitationUrl}" style="color: #667eea; word-break: break-all;">${invitationUrl}</a>
            </p>
            
            <p style="font-size: 12px; color: #999; margin-top: 30px;">
              <strong>Important:</strong> This invitation will expire on ${expirationDate}. Please accept it before then.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${recipientName},

${invited_by_name || "An administrator"} has invited you to join ${company_name || "our platform"}${branch_name ? ` (${branch_name} branch)` : ""}${role_name ? ` as a ${role_name}` : ""}.

To accept your invitation, please click the following link:
${invitationUrl}

This invitation will expire on ${expirationDate}.

If you did not expect this invitation, you can safely ignore this email.
    `.trim(),
  };

  try {
    console.log("Attempting to send invitation email to:", email);
    console.log("SMTP Config:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Invitation email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
    console.log("Accepted recipients:", info.accepted);
    console.log("Rejected recipients:", info.rejected);
    
    return { sent: true, messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error("❌ Error sending invitation email:");
    console.error("Error code:", error.code);
    console.error("Error command:", error.command);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    return { sent: false, error: error.message, code: error.code };
  }
};

module.exports = {
  sendInvitationEmail,
};

