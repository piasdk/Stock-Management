"use strict";

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

const listSuppliers = asyncHandler(async (req, res) => {
  const { companyId, search, isActive } = req.query;
  const filters = [];
  const params = {};

  // Always filter by company_id if user has one (enforced by tenancy middleware)
  // But also allow explicit companyId from query
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

  // Only filter by isActive if explicitly requested, otherwise show all
  if (isActive && isActive !== "all") {
    filters.push("is_active = :isActive");
    params.isActive = isActive === "true" || isActive === "1" ? 1 : 0;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await pool.execute(
    `
      SELECT
        supplier_id,
        company_id,
        name,
        contact_name,
        phone,
        email,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        notes,
        is_active,
        created_at
      FROM suppliers
      ${whereClause}
      ORDER BY name ASC
    `,
    params,
  );

  res.json(rows);
});

const getSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute(
    "SELECT * FROM suppliers WHERE supplier_id = :id",
    { id: Number(id) },
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  res.json(rows[0]);
});

const createSupplier = asyncHandler(async (req, res) => {
  const {
    company_id,
    name,
    contact_name,
    phone,
    email,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    notes,
    is_active = true,
  } = req.body;

  if (!company_id || !name) {
    return res
      .status(400)
      .json({ error: "company_id and name are required fields" });
  }

  // Check for duplicate supplier name within the company
  const [existingSupplier] = await pool.execute(
    "SELECT supplier_id FROM suppliers WHERE company_id = :company_id AND LOWER(TRIM(name)) = LOWER(TRIM(:name))",
    { company_id: Number(company_id), name: name.trim() }
  );

  if (existingSupplier && existingSupplier.length > 0) {
    return res
      .status(409)
      .json({ error: "A supplier with this name already exists for your company" });
  }

  // Convert undefined to null for SQL bind parameters
  const sanitizeValue = (value) => (value === undefined ? null : value);

  const [result] = await pool.execute(
    `
      INSERT INTO suppliers (
        company_id,
        name,
        contact_name,
        phone,
        email,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        notes,
        is_active
      ) VALUES (
        :company_id,
        :name,
        :contact_name,
        :phone,
        :email,
        :address_line1,
        :address_line2,
        :city,
        :state,
        :postal_code,
        :country,
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
      address_line1: sanitizeValue(address_line1),
      address_line2: sanitizeValue(address_line2),
      city: sanitizeValue(city),
      state: sanitizeValue(state),
      postal_code: sanitizeValue(postal_code),
      country: sanitizeValue(country),
      notes: sanitizeValue(notes),
      is_active: is_active ? 1 : 0,
    },
  );

  const [rows] = await pool.execute(
    "SELECT * FROM suppliers WHERE supplier_id = :id",
    { id: result.insertId },
  );

  res.status(201).json(rows[0]);
});

const updateSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [existing] = await pool.execute(
    "SELECT supplier_id FROM suppliers WHERE supplier_id = :id",
    { id: Number(id) },
  );

  if (!existing.length) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  // Convert undefined to null for SQL bind parameters
  const sanitizeValue = (value) => (value === undefined ? null : value);

  const fields = {
    name: sanitizeValue(req.body.name),
    contact_name: sanitizeValue(req.body.contact_name),
    phone: sanitizeValue(req.body.phone),
    email: sanitizeValue(req.body.email),
    address_line1: sanitizeValue(req.body.address_line1),
    address_line2: sanitizeValue(req.body.address_line2),
    city: sanitizeValue(req.body.city),
    state: sanitizeValue(req.body.state),
    postal_code: sanitizeValue(req.body.postal_code),
    country: sanitizeValue(req.body.country),
    notes: sanitizeValue(req.body.notes),
    is_active:
      typeof req.body.is_active === "boolean"
        ? req.body.is_active
          ? 1
          : 0
        : sanitizeValue(req.body.is_active),
  };

  // Build dynamic update query only for fields that are provided
  const updateFields = [];
  const updateParams = { id: Number(id) };

  if (fields.name !== null && fields.name !== undefined) {
    updateFields.push("name = :name");
    updateParams.name = fields.name;
  }
  if (fields.contact_name !== undefined) {
    updateFields.push("contact_name = :contact_name");
    updateParams.contact_name = fields.contact_name;
  }
  if (fields.phone !== undefined) {
    updateFields.push("phone = :phone");
    updateParams.phone = fields.phone;
  }
  if (fields.email !== undefined) {
    updateFields.push("email = :email");
    updateParams.email = fields.email;
  }
  if (fields.address_line1 !== undefined) {
    updateFields.push("address_line1 = :address_line1");
    updateParams.address_line1 = fields.address_line1;
  }
  if (fields.address_line2 !== undefined) {
    updateFields.push("address_line2 = :address_line2");
    updateParams.address_line2 = fields.address_line2;
  }
  if (fields.city !== undefined) {
    updateFields.push("city = :city");
    updateParams.city = fields.city;
  }
  if (fields.state !== undefined) {
    updateFields.push("state = :state");
    updateParams.state = fields.state;
  }
  if (fields.postal_code !== undefined) {
    updateFields.push("postal_code = :postal_code");
    updateParams.postal_code = fields.postal_code;
  }
  if (fields.country !== undefined) {
    updateFields.push("country = :country");
    updateParams.country = fields.country;
  }
  if (fields.notes !== undefined) {
    updateFields.push("notes = :notes");
    updateParams.notes = fields.notes;
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
      UPDATE suppliers
      SET ${updateFields.join(", ")}
      WHERE supplier_id = :id
    `,
    updateParams,
  );

  const [rows] = await pool.execute(
    "SELECT * FROM suppliers WHERE supplier_id = :id",
    { id: Number(id) },
  );

  res.json(rows[0]);
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [existing] = await pool.execute(
    "SELECT supplier_id FROM suppliers WHERE supplier_id = :id",
    { id: Number(id) },
  );

  if (!existing.length) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  await pool.execute("DELETE FROM suppliers WHERE supplier_id = :id", {
    id: Number(id),
  });

  res.status(204).send();
});

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};

