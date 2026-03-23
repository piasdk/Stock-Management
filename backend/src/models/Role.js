"use strict";

const pool = require("../config/database");

const Role = {
  /**
   * Find role by ID
   */
  findById: async (roleId) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM roles WHERE role_id = :roleId",
        { roleId }
      );

      return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error in Role.findById:", {
        roleId,
        error: error?.message,
        code: error?.code,
        sqlMessage: error?.sqlMessage,
      });
      throw error;
    }
  },

  /**
   * Find highest priority role assigned to the user
   */
  findByUserId: async (userId) => {
    try {
      const [rows] = await pool.execute(
        `
          SELECT r.*
          FROM roles r
          INNER JOIN user_roles ur ON ur.role_id = r.role_id
          WHERE ur.user_id = :userId
          ORDER BY ur.assigned_at DESC, ur.user_role_id DESC
          LIMIT 1
        `,
        { userId }
      );

      return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error in Role.findByUserId:", {
        userId,
        error: error?.message,
        code: error?.code,
        sqlMessage: error?.sqlMessage,
      });
      throw error;
    }
  },

  /**
   * Find role by code (optionally scoped to a company)
   */
  findByCode: async (roleCode, companyId = null) => {
    try {
      let query = "SELECT * FROM roles WHERE role_code = :roleCode";
      const params = { roleCode };

      if (companyId === null) {
        query += " AND company_id IS NULL";
      } else {
        query += " AND company_id = :companyId";
        params.companyId = companyId;
      }

      const [rows] = await pool.execute(query, params);

      return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error in Role.findByCode:", {
        roleCode,
        companyId,
        error: error?.message,
        code: error?.code,
        sqlMessage: error?.sqlMessage,
      });
      throw error;
    }
  },

  /**
   * Find role by name
   */
  findByName: async (name) => {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM roles WHERE name = :name",
        { name }
      );

      return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error in Role.findByName:", {
        name,
        error: error?.message,
        code: error?.code,
        sqlMessage: error?.sqlMessage,
      });
      throw error;
    }
  },

  /**
   * List all roles (optionally filter by company_id)
   */
  findAll: async (companyId = null) => {
    try {
      let query = "SELECT * FROM roles WHERE 1=1";
      const params = {};

      if (companyId !== null) {
        query += " AND (company_id = :companyId OR company_id IS NULL)";
        params.companyId = companyId;
      }

      query += " ORDER BY is_system_role DESC, role_id ASC";

      // Only pass params if it has values (mysql2 doesn't like empty objects with named placeholders)
      const [rows] = Object.keys(params).length > 0
        ? await pool.execute(query, params)
        : await pool.execute(query);

      return rows || [];
    } catch (error) {
      console.error("Error in Role.findAll:", {
        companyId,
        error: error?.message,
        code: error?.code,
        sqlMessage: error?.sqlMessage,
        stack: error?.stack,
      });
      throw error;
    }
  },

  /**
   * Create new role
   */
  create: async (roleData) => {
    const {
      company_id,
      name,
      role_code,
      description,
      is_system_role = 0,
      is_active = 1,
    } = roleData;

    try {
      const [result] = await pool.execute(
        `INSERT INTO roles (
          company_id,
          name,
          role_code,
          description,
          is_system_role,
          is_active
        )
         VALUES (
           :company_id,
           :name,
           :role_code,
           :description,
           :is_system_role,
           :is_active
         )`,
        {
          company_id: company_id || null,
          name,
          role_code,
          description: description || null,
          is_system_role: is_system_role ? 1 : 0,
          is_active: is_active ? 1 : 0,
        }
      );

      if (!result || !result.insertId) {
        throw new Error("Failed to insert role - no insert ID returned");
      }

      return await Role.findById(result.insertId);
    } catch (error) {
      console.error("Error in Role.create:", error);
      throw error;
    }
  },

  /**
   * Update role
   */
  update: async (roleId, roleData) => {
    const { name, role_code, description, is_active } = roleData;

    try {
      const updateFields = [];
      const params = { roleId };

      if (name !== undefined) {
        updateFields.push("name = :name");
        params.name = name;
      }
      if (role_code !== undefined) {
        updateFields.push("role_code = :role_code");
        params.role_code = role_code;
      }
      if (description !== undefined) {
        updateFields.push("description = :description");
        params.description = description;
      }
      if (is_active !== undefined) {
        updateFields.push("is_active = :is_active");
        params.is_active = is_active ? 1 : 0;
      }

      if (updateFields.length === 0) {
        return await Role.findById(roleId);
      }

      updateFields.push("updated_at = NOW()");

      await pool.execute(
        `UPDATE roles SET ${updateFields.join(", ")} WHERE role_id = :roleId`,
        params
      );

      return await Role.findById(roleId);
    } catch (error) {
      console.error("Error in Role.update:", error);
      throw error;
    }
  },

  /**
   * Delete role (only if not a system role)
   */
  delete: async (roleId) => {
    try {
      // Check if it's a system role
      const role = await Role.findById(roleId);
      if (role && role.is_system_role === 1) {
        throw new Error("Cannot delete system roles");
      }

      await pool.execute("DELETE FROM roles WHERE role_id = :roleId", {
        roleId,
      });
      return true;
    } catch (error) {
      console.error("Error in Role.delete:", error);
      throw error;
    }
  },
};

module.exports = Role;

