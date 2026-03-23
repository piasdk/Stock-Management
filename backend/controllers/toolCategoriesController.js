"use strict";

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const { companyId } = req.query;

  const [rows] = await pool.execute(
    `
    SELECT category_id, company_id, name, description, created_at
    FROM tool_categories
    WHERE (:companyId IS NULL OR company_id = :companyId)
    ORDER BY name
    `,
    { companyId: companyId ? Number(companyId) : null }
  );

  res.json(rows);
});

const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute(
    `SELECT category_id, company_id, name, description, created_at
     FROM tool_categories WHERE category_id = :id`,
    { id: Number(id) }
  );

  if (!rows || rows.length === 0) {
    return res.status(404).json({ error: "Tool category not found" });
  }

  res.json(rows[0]);
});

const create = asyncHandler(async (req, res) => {
  const { company_id, name, description } = req.body;
  const user = req.user;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }

  const companyId = company_id != null ? Number(company_id) : (user && user.company_id ? Number(user.company_id) : null);
  if (!companyId) {
    return res.status(400).json({ error: "Company is required" });
  }

  const [result] = await pool.execute(
    `INSERT INTO tool_categories (company_id, name, description)
     VALUES (:company_id, :name, :description)`,
    {
      company_id: companyId,
      name: name.trim(),
      description: description != null && description !== "" ? description.trim() : null,
    }
  );

  const [created] = await pool.execute(
    `SELECT category_id, company_id, name, description, created_at
     FROM tool_categories WHERE category_id = :id`,
    { id: result.insertId }
  );

  res.status(201).json(created[0]);
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }

  const [result] = await pool.execute(
    `UPDATE tool_categories SET name = :name, description = :description WHERE category_id = :id`,
    {
      id: Number(id),
      name: name.trim(),
      description: description != null && description !== "" ? description.trim() : null,
    }
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: "Tool category not found" });
  }

  const [updated] = await pool.execute(
    `SELECT category_id, company_id, name, description, created_at
     FROM tool_categories WHERE category_id = :id`,
    { id: Number(id) }
  );

  res.json(updated[0]);
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [result] = await pool.execute("DELETE FROM tool_categories WHERE category_id = :id", {
    id: Number(id),
  });

  if (result.affectedRows === 0) {
    return res.status(404).json({ error: "Tool category not found" });
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
