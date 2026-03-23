"use strict";

const pool = require("../config/database");

const Company = {
  /**
   * Find all companies
   */
  findAll: async () => {
    const [rows] = await pool.execute(
      `SELECT
        company_id, name, legal_name, tax_id, currency, timezone,
        country, is_active, created_at
      FROM companies
      ORDER BY name`
    );
    return rows;
  },

  /**
   * Find company by ID
   */
  findById: async (companyId) => {
    const [rows] = await pool.execute(
      "SELECT * FROM companies WHERE company_id = :companyId",
      { companyId }
    );
    return rows[0] || null;
  },

  /**
   * Create company
   */
  create: async (companyData) => {
    const {
      name,
      legal_name = null,
      tax_id = null,
      currency = "USD",
      timezone = "UTC",
      country = null,
      email = null,
      phone = null,
    } = companyData;

    const [result] = await pool.execute(
      `INSERT INTO companies (
        name, legal_name, tax_id, currency, timezone, country, email, phone
      ) VALUES (
        :name, :legal_name, :tax_id, :currency, :timezone, :country, :email, :phone
      )`,
      {
        name,
        legal_name,
        tax_id,
        currency,
        timezone,
        country,
        email,
        phone,
      }
    );

    return Company.findById(result.insertId);
  },
};

module.exports = Company;

