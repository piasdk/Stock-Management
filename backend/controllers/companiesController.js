"use strict";

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

const listCompanies = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `
      SELECT
        company_id,
        name,
        legal_name,
        tax_id,
        currency,
        timezone,
        country,
        is_active,
        created_at
      FROM companies
      ORDER BY name
    `,
  );

  res.json(rows);
});

module.exports = {
  listCompanies,
};
