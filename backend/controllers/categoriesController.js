"use strict";

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

const listCategories = asyncHandler(async (req, res) => {
  const { companyId } = req.query;

  const [rows] = await pool.execute(
    `
      SELECT
        category_id,
        company_id,
        name,
        description,
        parent_id,
        is_active,
        created_at
      FROM categories
      WHERE (:companyId IS NULL OR company_id = :companyId)
      ORDER BY name
    `,
    {
      companyId: companyId ? Number(companyId) : null,
    },
  );

  res.json(rows);
});

module.exports = {
  listCategories,
};

