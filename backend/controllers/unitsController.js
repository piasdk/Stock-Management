"use strict";

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

const listUnits = asyncHandler(async (_req, res) => {
  const [rows] = await pool.execute(
    `
      SELECT
        unit_id,
        name,
        short_code,
        unit_type
      FROM units
      ORDER BY name
    `,
  );

  res.json(rows);
});

module.exports = {
  listUnits,
};

