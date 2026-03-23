"use strict";

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

const listCustomers = asyncHandler(async (req, res) => {
  const { companyId, search, isActive } = req.query;
  const filters = [];
  const params = {};

  // Use companyId from query or fall back to user's company_id
  const userCompanyId = req.user?.company_id;
  const targetCompanyId = companyId || userCompanyId;
  
  if (targetCompanyId) {
    filters.push("company_id = :companyId");
    params.companyId = Number(targetCompanyId);
  }

  if (search) {
    filters.push(
      "(name LIKE CONCAT('%', :search, '%') OR contact_name LIKE CONCAT('%', :search, '%'))",
    );
    params.search = search;
  }

  // Only filter by isActive if explicitly set, otherwise show all
  if (isActive && isActive !== "all") {
    filters.push("is_active = :isActive");
    params.isActive = isActive === "true" || isActive === "1" ? 1 : 0;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const [rows] = await pool.execute(
    `
      SELECT
        customer_id,
        company_id,
        name,
        contact_name,
        phone,
        email,
        billing_address,
        shipping_address,
        tax_id,
        notes,
        is_active,
        created_at
      FROM customers
      ${whereClause}
      ORDER BY name ASC
    `,
    params,
  );

  res.json(rows);
});

const getCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute(
    "SELECT * FROM customers WHERE customer_id = :id",
    { id: Number(id) },
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Customer not found" });
  }

  res.json(rows[0]);
});

const createCustomer = asyncHandler(async (req, res) => {
  const {
    company_id,
    name,
    contact_name,
    phone,
    email,
    billing_address,
    shipping_address,
    tax_id,
    notes,
    is_active = true,
  } = req.body;

  if (!company_id || !name) {
    return res
      .status(400)
      .json({ error: "company_id and name are required fields" });
  }

  // Check for duplicate customer name within the company
  const [existingCustomer] = await pool.execute(
    "SELECT customer_id FROM customers WHERE company_id = :company_id AND LOWER(TRIM(name)) = LOWER(TRIM(:name))",
    { company_id: Number(company_id), name: name.trim() }
  );

  if (existingCustomer && existingCustomer.length > 0) {
    return res
      .status(409)
      .json({ error: "A customer with this name already exists for your company" });
  }

  // Convert undefined to null for SQL bind parameters
  const sanitizeValue = (value) => (value === undefined ? null : value);

  const [result] = await pool.execute(
    `
      INSERT INTO customers (
        company_id,
        name,
        contact_name,
        phone,
        email,
        billing_address,
        shipping_address,
        tax_id,
        notes,
        is_active
      ) VALUES (
        :company_id,
        :name,
        :contact_name,
        :phone,
        :email,
        :billing_address,
        :shipping_address,
        :tax_id,
        :notes,
        :is_active
      )
    `,
    {
      company_id,
      name,
      contact_name: sanitizeValue(contact_name),
      phone: sanitizeValue(phone),
      email: sanitizeValue(email),
      billing_address: sanitizeValue(billing_address),
      shipping_address: sanitizeValue(shipping_address),
      tax_id: sanitizeValue(tax_id),
      notes: sanitizeValue(notes),
      is_active: is_active ? 1 : 0,
    },
  );

  const [rows] = await pool.execute(
    "SELECT * FROM customers WHERE customer_id = :id",
    { id: result.insertId },
  );

  res.status(201).json(rows[0]);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [existing] = await pool.execute(
    "SELECT customer_id FROM customers WHERE customer_id = :id",
    { id: Number(id) },
  );

  if (!existing.length) {
    return res.status(404).json({ error: "Customer not found" });
  }

  // Convert undefined to null for SQL bind parameters
  const sanitizeValue = (value) => (value === undefined ? null : value);

  // Build dynamic update query only for fields that are provided
  const updateFields = [];
  const updateParams = { id: Number(id) };

  if (req.body.name !== null && req.body.name !== undefined) {
    updateFields.push("name = :name");
    updateParams.name = req.body.name;
  }
  if (req.body.contact_name !== undefined) {
    updateFields.push("contact_name = :contact_name");
    updateParams.contact_name = sanitizeValue(req.body.contact_name);
  }
  if (req.body.phone !== undefined) {
    updateFields.push("phone = :phone");
    updateParams.phone = sanitizeValue(req.body.phone);
  }
  if (req.body.email !== undefined) {
    updateFields.push("email = :email");
    updateParams.email = sanitizeValue(req.body.email);
  }
  if (req.body.billing_address !== undefined) {
    updateFields.push("billing_address = :billing_address");
    updateParams.billing_address = sanitizeValue(req.body.billing_address);
  }
  if (req.body.shipping_address !== undefined) {
    updateFields.push("shipping_address = :shipping_address");
    updateParams.shipping_address = sanitizeValue(req.body.shipping_address);
  }
  if (req.body.tax_id !== undefined) {
    updateFields.push("tax_id = :tax_id");
    updateParams.tax_id = sanitizeValue(req.body.tax_id);
  }
  if (req.body.notes !== undefined) {
    updateFields.push("notes = :notes");
    updateParams.notes = sanitizeValue(req.body.notes);
  }
  // Always update is_active if provided (can be 0 or 1)
  if (req.body.is_active !== undefined && req.body.is_active !== null) {
    updateFields.push("is_active = :is_active");
    updateParams.is_active = typeof req.body.is_active === "boolean"
      ? (req.body.is_active ? 1 : 0)
      : Number(req.body.is_active);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  await pool.execute(
    `
      UPDATE customers
      SET ${updateFields.join(", ")}
      WHERE customer_id = :id
    `,
    updateParams,
  );

  const [rows] = await pool.execute(
    "SELECT * FROM customers WHERE customer_id = :id",
    { id: Number(id) },
  );

  res.json(rows[0]);
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [existing] = await pool.execute(
    "SELECT customer_id FROM customers WHERE customer_id = :id",
    { id: Number(id) },
  );

  if (!existing.length) {
    return res.status(404).json({ error: "Customer not found" });
  }

  await pool.execute("DELETE FROM customers WHERE customer_id = :id", {
    id: Number(id),
  });

  res.status(204).send();
});

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};

