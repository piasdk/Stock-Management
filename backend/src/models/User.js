"use strict";

const pool = require("../config/database");

const User = {
  /**
   * Find user by email (returns first match, for backward compatibility)
   */
  findByEmail: async (email) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM users WHERE email = :email ORDER BY user_id DESC LIMIT 1",
        { email }
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error in User.findByEmail:", {
        email,
        error: error?.message,
        code: error?.code,
        sqlMessage: error?.sqlMessage,
      });
      throw error;
    }
  },

  /**
   * Find all users by email (for login when multiple users share email)
   */
  findAllByEmail: async (email) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM users WHERE email = :email ORDER BY user_id DESC",
        { email }
      );
      return rows || [];
    } catch (error) {
      console.error("Error in User.findAllByEmail:", {
        email,
        error: error?.message,
        code: error?.code,
        sqlMessage: error?.sqlMessage,
      });
      throw error;
    }
  },

  /**
   * Find user by ID
   */
  findById: async (userId) => {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE user_id = :userId",
      { userId }
    );
    return rows[0] || null;
  },

  /**
   * Create new user
   */
  create: async (userData) => {
    const {
      company_id,
      branch_id = null,
      role_id = null,
      first_name,
      last_name,
      email,
      password_hash,
      is_super_admin = 0,
      is_company_admin = 0,
      is_branch_admin = 0,
      status = "active",
    } = userData;

    const [result] = await pool.execute(
      `INSERT INTO users (
        company_id, branch_id, role_id,
        first_name, last_name, email, password_hash,
        is_super_admin, is_company_admin, is_branch_admin, status
      ) VALUES (
        :company_id, :branch_id, :role_id,
        :first_name, :last_name, :email, :password_hash,
        :is_super_admin, :is_company_admin, :is_branch_admin, :status
      )`,
      {
        company_id,
        branch_id,
        role_id,
        first_name,
        last_name,
        email,
        password_hash,
        is_super_admin,
        is_company_admin,
        is_branch_admin,
        status,
      }
    );

    return result.insertId;
  },

  /**
   * Update user
   */
  update: async (userId, userData) => {
    const fields = [];
    const values = { userId };

    Object.keys(userData).forEach((key) => {
      if (userData[key] !== undefined) {
        fields.push(`${key} = :${key}`);
        values[key] = userData[key];
      }
    });

    if (fields.length === 0) return null;

    await pool.execute(
      `UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE user_id = :userId`,
      values
    );

    return User.findById(userId);
  },

  /**
   * Update last login
   */
  updateLastLogin: async (userId) => {
    await pool.execute(
      "UPDATE users SET last_login_at = NOW() WHERE user_id = :userId",
      { userId }
    );
  },
};

module.exports = User;

