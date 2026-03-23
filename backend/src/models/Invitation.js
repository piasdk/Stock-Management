"use strict";

const pool = require("../config/database");
const crypto = require("crypto");

const Invitation = {
  /**
   * Find invitation by token
   */
  findByToken: async (token) => {
    try {
      const queryResult = await pool.execute(
        `SELECT 
          ui.*, 
          r.name AS role_name,
          r.role_code
        FROM user_invitations ui
        LEFT JOIN roles r ON ui.role_id = r.role_id
        WHERE ui.invitation_token = :token 
          AND ui.status = 'pending'`,
        { token }
      );
      
      if (!Array.isArray(queryResult) || queryResult.length === 0) {
        return null;
      }
      
      const rows = queryResult[0];
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error in findByToken:", error);
      throw error;
    }
  },

  /**
   * Find invitation by ID
   */
  findById: async (invitationId) => {
    try {
      const queryResult = await pool.execute(
        "SELECT * FROM user_invitations WHERE invitation_id = :invitationId",
        { invitationId }
      );
      
      if (!Array.isArray(queryResult) || queryResult.length === 0) {
        return null;
      }
      
      const rows = queryResult[0];
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error in findById:", error);
      throw error;
    }
  },

  /**
   * List invitations for a company
   */
  findByCompany: async (companyId) => {
    try {
      const queryResult = await pool.execute(
        `SELECT 
          i.invitation_id,
          i.email,
          i.first_name,
          i.last_name,
          i.role_id,
          i.branch_id,
          i.status,
          i.created_at,
          i.expires_at,
          i.invited_by,
          b.name AS branch_name,
          u.first_name AS invited_by_first_name,
          u.last_name AS invited_by_last_name
        FROM user_invitations i
        LEFT JOIN branches b ON i.branch_id = b.branch_id
        LEFT JOIN users u ON i.invited_by = u.user_id
        WHERE i.company_id = :companyId
        ORDER BY i.created_at DESC`,
        { companyId }
      );
      
      if (!Array.isArray(queryResult) || queryResult.length === 0) {
        return [];
      }
      
      return queryResult[0] || [];
    } catch (error) {
      console.error("Error in findByCompany:", error);
      throw error;
    }
  },

  /**
   * Create new invitation
   */
  create: async (invitationData) => {
    const {
      company_id,
      branch_id = null,
      role_id = null,
      email,
      first_name = null,
      last_name = null,
      invited_by,
      expires_in_days = 7,
    } = invitationData;

    // Generate secure token
    const invitation_token = crypto.randomBytes(32).toString("hex");

    // Calculate expiration date
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_in_days);

    let result;
    try {
      console.log("Executing INSERT query for invitation");
      
      // If role_id is null, we need to check what valid roles exist
      // First, let's try to get a valid role_id from the roles table
      let finalRoleId = role_id;
      
      if (finalRoleId === null || finalRoleId === undefined) {
        try {
          // Try to find a "branch_admin" role or default to the first available role
          const roleQueryResult = await pool.execute(
            "SELECT role_id FROM roles WHERE role_code = 'branch_admin' OR name = 'Branch Admin' LIMIT 1"
          );
          
          if (Array.isArray(roleQueryResult) && roleQueryResult.length > 0) {
            const roleRows = roleQueryResult[0];
            if (roleRows && Array.isArray(roleRows) && roleRows.length > 0 && roleRows[0] && roleRows[0].role_id) {
              finalRoleId = roleRows[0].role_id;
              console.log("Found default role_id:", finalRoleId);
            } else {
              // If no branch_admin found, get the first available role
              const allRolesResult = await pool.execute("SELECT role_id FROM roles ORDER BY role_id LIMIT 1");
              if (Array.isArray(allRolesResult) && allRolesResult.length > 0) {
                const allRoles = allRolesResult[0];
                if (allRoles && Array.isArray(allRoles) && allRoles.length > 0 && allRoles[0] && allRoles[0].role_id) {
                  finalRoleId = allRoles[0].role_id;
                  console.log("Using first available role_id:", finalRoleId);
                } else {
                  throw new Error("No roles found in the roles table. Please create roles first.");
                }
              } else {
                throw new Error("No roles found in the roles table. Please create roles first.");
              }
            }
          } else {
            throw new Error("No roles found in the roles table. Please create roles first.");
          }
        } catch (roleError) {
          // If roles table doesn't exist or query fails, we can't proceed
          if (roleError.code === "ER_NO_SUCH_TABLE") {
            throw new Error("Roles table does not exist. Please create the roles table first.");
          }
          throw new Error(`Failed to get default role: ${roleError.message}`);
        }
      }
      
      // Validate that the role_id exists in the roles table
      if (finalRoleId !== null && finalRoleId !== undefined) {
        try {
          const roleCheckResult = await pool.execute(
            "SELECT role_id FROM roles WHERE role_id = :roleId",
            { roleId: finalRoleId }
          );
          
          if (!Array.isArray(roleCheckResult) || roleCheckResult.length === 0) {
            throw new Error(`Role ID ${finalRoleId} does not exist in the roles table. Please provide a valid role_id.`);
          }
          
          const roleCheck = roleCheckResult[0];
          if (!roleCheck || !Array.isArray(roleCheck) || roleCheck.length === 0 || !roleCheck[0] || !roleCheck[0].role_id) {
            throw new Error(`Role ID ${finalRoleId} does not exist in the roles table. Please provide a valid role_id.`);
          }
        } catch (roleCheckError) {
          if (roleCheckError.code === "ER_NO_SUCH_TABLE") {
            throw new Error("Roles table does not exist. Please create the roles table first.");
          }
          throw roleCheckError;
        }
      }
      
      const queryResult = await pool.execute(
        `INSERT INTO user_invitations (
          company_id,
          branch_id,
          role_id,
          email,
          first_name,
          last_name,
          invitation_token,
          invited_by,
          status,
          expires_at
        ) VALUES (
          :company_id,
          :branch_id,
          :role_id,
          :email,
          :first_name,
          :last_name,
          :invitation_token,
          :invited_by,
          'pending',
          :expires_at
        )`,
        {
          company_id,
          branch_id,
          role_id: finalRoleId,
          email,
          first_name,
          last_name,
          invitation_token,
          invited_by,
          expires_at,
        }
      );

      console.log("Query result type:", typeof queryResult, Array.isArray(queryResult));
      console.log("Query result:", queryResult);

      // pool.execute returns [rows, fields] array
      if (!Array.isArray(queryResult)) {
        console.error("Query result is not an array:", queryResult);
        throw new Error(`Database query returned unexpected result type: ${typeof queryResult}`);
      }

      if (queryResult.length === 0) {
        throw new Error("Database query returned empty result");
      }

      result = queryResult[0];
      console.log("Result:", result, "insertId:", result?.insertId);
    } catch (dbError) {
      console.error("Database error in Invitation.create:", dbError);
      console.error("Error code:", dbError.code);
      console.error("Error message:", dbError.message);
      console.error("Error sqlMessage:", dbError.sqlMessage);
      
      if (dbError.code === "ER_NO_SUCH_TABLE") {
        throw new Error("Database table 'user_invitations' does not exist. Please create the table.");
      }
      if (dbError.code === "ER_BAD_FIELD_ERROR") {
        throw new Error(`Database column error: ${dbError.sqlMessage || "Unknown column"}`);
      }
      // Re-throw with a clean error message
      const errorMessage = dbError.message || dbError.sqlMessage || "Database error occurred";
      throw new Error(errorMessage);
    }

    if (!result || !result.insertId) {
      throw new Error("Failed to insert invitation - no insert ID returned");
    }

    const invitation = await Invitation.findById(result.insertId);
    if (!invitation) {
      throw new Error("Failed to retrieve created invitation");
    }
    
    return invitation;
  },

  /**
   * Mark invitation as accepted
   */
  markAsAccepted: async (invitationId) => {
    await pool.execute(
      "UPDATE user_invitations SET status = 'accepted', accepted_at = NOW() WHERE invitation_id = :invitationId",
      { invitationId }
    );
    return Invitation.findById(invitationId);
  },

  /**
   * Mark invitation as expired
   */
  markAsExpired: async (invitationId) => {
    await pool.execute(
      "UPDATE user_invitations SET status = 'expired' WHERE invitation_id = :invitationId",
      { invitationId }
    );
    return Invitation.findById(invitationId);
  },

  /**
   * Cancel invitation
   */
  cancel: async (invitationId) => {
    await pool.execute(
      "UPDATE user_invitations SET status = 'cancelled' WHERE invitation_id = :invitationId",
      { invitationId }
    );
    return Invitation.findById(invitationId);
  },
};

module.exports = Invitation;

