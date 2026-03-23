"use strict";

const pool = require("../config/database");

const Branch = {
  /**
   * Find branch by ID
   */
  findById: async (branchId) => {
    const [rows] = await pool.execute(
      "SELECT * FROM branches WHERE branch_id = :branchId",
      { branchId }
    );
    return rows[0] || null;
  },

  /**
   * List branches for a company
   */
  findByCompany: async (companyId) => {
    const [rows] = await pool.execute(
      `SELECT
        branch_id,
        company_id,
        name,
        code,
        email,
        phone,
        city,
        state,
        country,
        is_headquarters,
        is_active,
        created_at,
        updated_at
      FROM branches
      WHERE company_id = :companyId
      ORDER BY is_headquarters DESC, name ASC`,
      { companyId }
    );
    return rows;
  },

  /**
   * Create branch
   */
  create: async (branchData) => {
    const {
      company_id,
      name,
      code,
      email = null,
      phone = null,
      address_line1 = null,
      address_line2 = null,
      city = null,
      state = null,
      postal_code = null,
      country = null,
      is_headquarters = 0,
      is_active = 1,
    } = branchData;

    const [result] = await pool.execute(
      `INSERT INTO branches (
        company_id,
        name,
        code,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        is_headquarters,
        is_active
      ) VALUES (
        :company_id,
        :name,
        :code,
        :email,
        :phone,
        :address_line1,
        :address_line2,
        :city,
        :state,
        :postal_code,
        :country,
        :is_headquarters,
        :is_active
      )`,
      {
        company_id,
        name,
        code,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        is_headquarters,
        is_active,
      }
    );

    return result.insertId;
  },
};

module.exports = Branch;


