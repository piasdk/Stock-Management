"use strict";

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const { companyId, branchId } = req.query;

  const [rows] = await pool.execute(
    `
    SELECT
      t.tool_id,
      t.company_id,
      t.branch_id,
      t.category_id,
      t.tool_name,
      t.tool_code,
      t.location_id,
      t.created_at,
      t.updated_at,
      tc.name AS category_name,
      loc.location_name AS location,
      loc.location_name AS location_name,
      loc.location_type AS location_code
    FROM tools t
    LEFT JOIN tool_categories tc ON tc.category_id = t.category_id
    LEFT JOIN locations loc ON loc.location_id = t.location_id
    WHERE (:companyId IS NULL OR t.company_id = :companyId)
      AND (:branchId IS NULL OR t.branch_id IS NULL OR t.branch_id = :branchId)
    ORDER BY t.tool_name
    `,
    {
      companyId: companyId ? Number(companyId) : null,
      branchId: branchId ? Number(branchId) : null,
    }
  );

  res.json(rows);
});

const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.execute(
    `
    SELECT
      t.tool_id,
      t.company_id,
      t.branch_id,
      t.category_id,
      t.tool_name,
      t.tool_code,
      t.location_id,
      t.created_at,
      t.updated_at,
      tc.name AS category_name,
      loc.location_name AS location,
      loc.location_name AS location_name,
      loc.location_type AS location_code
    FROM tools t
    LEFT JOIN tool_categories tc ON tc.category_id = t.category_id
    LEFT JOIN locations loc ON loc.location_id = t.location_id
    WHERE t.tool_id = :id
    `,
    { id: Number(id) }
  );

  if (!rows || rows.length === 0) {
    return res.status(404).json({ error: "Tool not found" });
  }

  res.json(rows[0]);
});

const create = asyncHandler(async (req, res) => {
  const { company_id, branch_id, category_id, tool_name, tool_code, location_id } = req.body;
  const user = req.user;

  if (!tool_name || !tool_name.trim()) {
    return res.status(400).json({ error: "Tool name is required" });
  }

  if (!category_id) {
    return res.status(400).json({ error: "Category is required" });
  }

  const companyId = company_id != null ? Number(company_id) : (user && user.company_id ? Number(user.company_id) : null);
  if (!companyId) {
    return res.status(400).json({ error: "Company is required" });
  }

  let branchId = branch_id != null && branch_id !== "" ? Number(branch_id) : (user && user.branch_id != null ? Number(user.branch_id) : null);
  if (branchId == null) {
    const [branchRows] = await pool.execute(
      `SELECT branch_id FROM branches WHERE company_id = :companyId ORDER BY branch_id LIMIT 1`,
      { companyId }
    );
    branchId = branchRows && branchRows[0] ? branchRows[0].branch_id : null;
  }
  if (branchId == null) {
    return res.status(400).json({ error: "Could not determine branch (your account may not be assigned to a branch and the company has no branches). Please provide branch_id or contact an administrator." });
  }

  const [result] = await pool.execute(
    `INSERT INTO tools (company_id, branch_id, category_id, tool_name, tool_code, location_id)
     VALUES (:company_id, :branch_id, :category_id, :tool_name, :tool_code, :location_id)`,
    {
      company_id: companyId,
      branch_id: branchId,
      category_id: Number(category_id),
      tool_name: tool_name.trim(),
      tool_code: tool_code != null && tool_code !== "" ? tool_code.trim() : null,
      location_id: location_id != null && location_id !== "" ? Number(location_id) : null,
    }
  );

  const [created] = await pool.execute(
    `
    SELECT
      t.tool_id,
      t.company_id,
      t.branch_id,
      t.category_id,
      t.tool_name,
      t.tool_code,
      t.location_id,
      t.created_at,
      t.updated_at,
      tc.name AS category_name,
      loc.location_name AS location,
      loc.location_name AS location_name,
      loc.location_type AS location_code
    FROM tools t
    LEFT JOIN tool_categories tc ON tc.category_id = t.category_id
    LEFT JOIN locations loc ON loc.location_id = t.location_id
    WHERE t.tool_id = :id
    `,
    { id: result.insertId }
  );

  res.status(201).json(created[0]);
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { branch_id, category_id, tool_name, tool_code, location_id } = req.body;

  if (!tool_name || !tool_name.trim()) {
    return res.status(400).json({ error: "Tool name is required" });
  }

  if (!category_id) {
    return res.status(400).json({ error: "Category is required" });
  }

  let branchId = branch_id != null && branch_id !== "" ? Number(branch_id) : (req.user && req.user.branch_id != null ? Number(req.user.branch_id) : null);
  if (branchId == null && req.user && req.user.company_id) {
    const [branchRows] = await pool.execute(
      `SELECT branch_id FROM branches WHERE company_id = :companyId ORDER BY branch_id LIMIT 1`,
      { companyId: Number(req.user.company_id) }
    );
    branchId = branchRows && branchRows[0] ? branchRows[0].branch_id : null;
  }
  if (branchId == null) {
    return res.status(400).json({ error: "Could not determine branch (your account may not be assigned to a branch and the company has no branches). Please provide branch_id or contact an administrator." });
  }

  const [result] = await pool.execute(
    `UPDATE tools SET
      branch_id = :branch_id,
      category_id = :category_id,
      tool_name = :tool_name,
      tool_code = :tool_code,
      location_id = :location_id,
      updated_at = CURRENT_TIMESTAMP
    WHERE tool_id = :id`,
    {
      id: Number(id),
      branch_id: branchId,
      category_id: Number(category_id),
      tool_name: tool_name.trim(),
      tool_code: tool_code != null && tool_code !== "" ? tool_code.trim() : null,
      location_id: location_id != null && location_id !== "" ? Number(location_id) : null,
    }
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: "Tool not found" });
  }

  const [updated] = await pool.execute(
    `
    SELECT
      t.tool_id,
      t.company_id,
      t.branch_id,
      t.category_id,
      t.tool_name,
      t.tool_code,
      t.location_id,
      t.created_at,
      t.updated_at,
      tc.name AS category_name,
      loc.location_name AS location,
      loc.location_name AS location_name,
      loc.location_type AS location_code
    FROM tools t
    LEFT JOIN tool_categories tc ON tc.category_id = t.category_id
    LEFT JOIN locations loc ON loc.location_id = t.location_id
    WHERE t.tool_id = :id
    `,
    { id: Number(id) }
  );

  res.json(updated[0]);
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [result] = await pool.execute("DELETE FROM tools WHERE tool_id = :id", {
    id: Number(id),
  });

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: "Tool not found" });
  }

  res.status(204).send();
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
