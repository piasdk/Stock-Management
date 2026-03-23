"use strict";

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

const listStockLevels = asyncHandler(async (req, res) => {
  const { companyId, productId, locationId } = req.query;
  const filters = [];
  const params = {};

  if (companyId) {
    filters.push("sl.company_id = :companyId");
    params.companyId = Number(companyId);
  }

  if (productId) {
    filters.push("sl.product_id = :productId");
    params.productId = Number(productId);
  }

  if (locationId) {
    filters.push("sl.location_id = :locationId");
    params.locationId = Number(locationId);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const [rows] = await pool.execute(
    `
      SELECT
        sl.stock_level_id,
        sl.company_id,
        sl.product_id,
        p.name AS product_name,
        sl.variant_id,
        pv.variant_sku,
        sl.location_id,
        loc.name AS location_name,
        sl.quantity,
        sl.safety_stock,
        sl.updated_at
      FROM stock_levels sl
      LEFT JOIN products p ON p.product_id = sl.product_id
      LEFT JOIN product_variants pv ON pv.variant_id = sl.variant_id
      LEFT JOIN stock_locations loc ON loc.location_id = sl.location_id
      ${whereClause}
      ORDER BY loc.name, p.name
    `,
    params,
  );

  res.json(rows);
});

const getStockLevel = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.execute(
    `
      SELECT
        sl.*,
        p.name AS product_name,
        loc.name AS location_name
      FROM stock_levels sl
      LEFT JOIN products p ON p.product_id = sl.product_id
      LEFT JOIN stock_locations loc ON loc.location_id = sl.location_id
      WHERE sl.stock_level_id = :id
    `,
    { id: Number(id) },
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Stock level record not found" });
  }

  res.json(rows[0]);
});

const createStockLevel = asyncHandler(async (req, res) => {
  const {
    company_id,
    product_id,
    variant_id = null,
    location_id,
    quantity = 0,
    safety_stock = null,
  } = req.body;

  if (!company_id || !product_id || !location_id) {
    return res
      .status(400)
      .json({ error: "company_id, product_id and location_id are required" });
  }

  const [records] = await pool.execute(
    `
      SELECT stock_level_id FROM stock_levels
      WHERE company_id = :company_id
        AND product_id = :product_id
        AND COALESCE(variant_id, 0) = COALESCE(:variant_id, 0)
        AND location_id = :location_id
    `,
    {
      company_id,
      product_id,
      variant_id,
      location_id,
    },
  );

  if (records.length) {
    return res.status(409).json({ error: "Stock level already exists" });
  }

  const [result] = await pool.execute(
    `
      INSERT INTO stock_levels (
        company_id,
        product_id,
        variant_id,
        location_id,
        quantity,
        safety_stock
      ) VALUES (
        :company_id,
        :product_id,
        :variant_id,
        :location_id,
        :quantity,
        :safety_stock
      )
    `,
    {
      company_id,
      product_id,
      variant_id,
      location_id,
      quantity,
      safety_stock,
    },
  );

  const [rows] = await pool.execute(
    "SELECT * FROM stock_levels WHERE stock_level_id = :id",
    { id: result.insertId },
  );

  res.status(201).json(rows[0]);
});

const updateStockLevel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { safety_stock, location_id } = req.body;

  const [existing] = await pool.execute(
    "SELECT * FROM stock_levels WHERE stock_level_id = :id",
    { id: Number(id) },
  );

  if (!existing.length) {
    return res.status(404).json({ error: "Stock level record not found" });
  }

  await pool.execute(
    `
      UPDATE stock_levels
      SET
        safety_stock = COALESCE(:safety_stock, safety_stock),
        location_id = COALESCE(:location_id, location_id)
      WHERE stock_level_id = :id
    `,
    {
      id: Number(id),
      safety_stock,
      location_id,
    },
  );

  const [rows] = await pool.execute(
    "SELECT * FROM stock_levels WHERE stock_level_id = :id",
    { id: Number(id) },
  );

  res.json(rows[0]);
});

const adjustStock = asyncHandler(async (req, res) => {
  const {
    company_id,
    product_id,
    variant_id = null,
    location_id,
    adjustment_type,
    quantity,
    reason_code,
    reference_number,
    remarks,
    created_by = null,
    unit_cost = null,
  } = req.body;
  const stockLevelIdParam = req.params.id ? Number(req.params.id) : null;

  if (
    !company_id ||
    !product_id ||
    !location_id ||
    !adjustment_type ||
    !quantity
  ) {
    return res.status(400).json({
      error:
        "company_id, product_id, location_id, adjustment_type, and quantity are required",
    });
  }

  if (!["increase", "decrease"].includes(adjustment_type)) {
    return res.status(400).json({ error: "Invalid adjustment_type" });
  }

  const numericQty = Number(quantity);
  if (Number.isNaN(numericQty) || numericQty <= 0) {
    return res
      .status(400)
      .json({ error: "quantity must be a positive number" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let levelRows;

    if (stockLevelIdParam) {
      [levelRows] = await connection.execute(
        `
          SELECT
            stock_level_id,
            company_id,
            product_id,
            variant_id,
            location_id,
            quantity
          FROM stock_levels
          WHERE stock_level_id = :id
          FOR UPDATE
        `,
        { id: stockLevelIdParam },
      );

      if (!levelRows.length) {
        throw Object.assign(new Error("Stock level record not found"), {
          status: 404,
        });
      }

      const row = levelRows[0];
      if (
        row.company_id !== Number(company_id) ||
        row.product_id !== Number(product_id) ||
        row.location_id !== Number(location_id) ||
        (row.variant_id || null) !== (variant_id || null)
      ) {
        throw Object.assign(
          new Error(
            "Stock level parameters do not match the referenced record",
          ),
          { status: 400 },
        );
      }
    } else {
      [levelRows] = await connection.execute(
        `
          SELECT stock_level_id, quantity
          FROM stock_levels
          WHERE company_id = :company_id
            AND product_id = :product_id
            AND COALESCE(variant_id, 0) = COALESCE(:variant_id, 0)
            AND location_id = :location_id
          FOR UPDATE
        `,
        {
          company_id,
          product_id,
          variant_id,
          location_id,
        },
      );
    }

    let stockLevelId;
    let currentQty = 0;

    if (!levelRows.length) {
      const [insertResult] = await connection.execute(
        `
          INSERT INTO stock_levels (
            company_id,
            product_id,
            variant_id,
            location_id,
            quantity
          ) VALUES (
            :company_id,
            :product_id,
            :variant_id,
            :location_id,
            0
          )
        `,
        {
          company_id,
          product_id,
          variant_id,
          location_id,
        },
      );
      stockLevelId = insertResult.insertId;
    } else {
      stockLevelId = levelRows[0].stock_level_id;
      currentQty = Number(levelRows[0].quantity);
    }

    const delta = adjustment_type === "increase" ? numericQty : -numericQty;
    const newQty = currentQty + delta;

    if (newQty < 0) {
      throw Object.assign(new Error("Resulting quantity cannot be negative"), {
        status: 400,
      });
    }

    await connection.execute(
      `
        UPDATE stock_levels
        SET quantity = :quantity
        WHERE stock_level_id = :stock_level_id
      `,
      {
        stock_level_id: stockLevelId,
        quantity: newQty,
      },
    );

    const [adjustmentResult] = await connection.execute(
      `
        INSERT INTO stock_adjustments (
          company_id,
          product_id,
          variant_id,
          location_id,
          adjustment_type,
          quantity,
          reason_code,
          reference_number,
          remarks,
          created_by
        ) VALUES (
          :company_id,
          :product_id,
          :variant_id,
          :location_id,
          :adjustment_type,
          :quantity,
          :reason_code,
          :reference_number,
          :remarks,
          :created_by
        )
      `,
      {
        company_id,
        product_id,
        variant_id,
        location_id,
        adjustment_type,
        quantity: numericQty,
        reason_code,
        reference_number,
        remarks,
        created_by,
      },
    );

    await connection.execute(
      `
        INSERT INTO stock_movements (
          company_id,
          product_id,
          variant_id,
          location_id,
          movement_type,
          reference_type,
          reference_id,
          quantity,
          unit_cost,
          notes,
          created_by
        ) VALUES (
          :company_id,
          :product_id,
          :variant_id,
          :location_id,
          'adjustment',
          'stock_adjustment',
          :reference_id,
          :quantity,
          :unit_cost,
          :notes,
          :created_by
        )
      `,
      {
        company_id,
        product_id,
        variant_id,
        location_id,
        reference_id: adjustmentResult.insertId,
        quantity: delta,
        unit_cost,
        notes: remarks,
        created_by,
      },
    );

    await connection.commit();

    res.status(201).json({
      stock_level_id: stockLevelId,
      new_quantity: newQty,
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

const listLocations = asyncHandler(async (req, res) => {
  const { companyId: queryCompanyId, branchId: queryBranchId } = req.query;
  const { company_id: tenantCompanyId, branch_id: tenantBranchId } = req.tenant || {};
  const companyId = queryCompanyId ? Number(queryCompanyId) : (tenantCompanyId != null ? Number(tenantCompanyId) : null);
  const branchId = queryBranchId != null && queryBranchId !== "" ? Number(queryBranchId) : (tenantBranchId != null ? Number(tenantBranchId) : null);

  const [rows] = await pool.execute(
    `
      SELECT
        location_id,
        company_id,
        branch_id,
        location_name AS name,
        location_type,
        description,
        is_active,
        created_at
      FROM locations
      WHERE (:companyId IS NULL OR company_id = :companyId)
        AND (:branchId IS NULL OR branch_id IS NULL OR branch_id = :branchId)
      ORDER BY location_name
    `,
    { companyId: companyId || null, branchId: branchId || null },
  );

  res.json(rows);
});

const createLocation = asyncHandler(async (req, res) => {
  const { company_id, branch_id } = req.tenant || {};
  const { name, location_name, location_type, description, is_active = true } = req.body;
  const locationName = (location_name != null && String(location_name).trim() !== "") ? String(location_name).trim() : (name != null && String(name).trim() !== "" ? String(name).trim() : null);

  if (company_id === undefined || company_id === null) {
    return res.status(400).json({ error: "companyId is required" });
  }

  if (!locationName) {
    return res.status(400).json({ error: "Location name is required" });
  }

  const resolvedBranchId = branch_id !== undefined && branch_id !== null ? Number(branch_id) : null;

  const [result] = await pool.execute(
    `
      INSERT INTO locations (
        company_id,
        branch_id,
        location_name,
        location_type,
        description,
        is_active
      ) VALUES (
        :company_id,
        :branch_id,
        :location_name,
        :location_type,
        :description,
        :is_active
      )
    `,
    {
      company_id: Number(company_id),
      branch_id: resolvedBranchId,
      location_name: locationName,
      location_type: (location_type != null && String(location_type).trim() !== "") ? String(location_type).trim() : "warehouse",
      description: (description != null && String(description).trim() !== "") ? String(description).trim() : null,
      is_active: is_active ? 1 : 0,
    },
  );

  const [rows] = await pool.execute(
    "SELECT location_id, company_id, branch_id, location_name AS name, location_type, description, is_active, created_at FROM locations WHERE location_id = :id",
    { id: result.insertId },
  );

  res.status(201).json(rows[0]);
});

const updateLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, location_name, location_type, description, is_active } = req.body;

  const [existing] = await pool.execute(
    "SELECT location_id FROM locations WHERE location_id = :id",
    { id: Number(id) },
  );

  if (!existing.length) {
    return res.status(404).json({ error: "Location not found" });
  }

  const locationName = (location_name != null && String(location_name).trim() !== "") ? String(location_name).trim() : (name != null && String(name).trim() !== "" ? String(name).trim() : null);

  await pool.execute(
    `
      UPDATE locations
      SET
        location_name = COALESCE(:location_name, location_name),
        location_type = COALESCE(:location_type, location_type),
        description = COALESCE(:description, description),
        is_active = COALESCE(:is_active, is_active)
      WHERE location_id = :id
    `,
    {
      id: Number(id),
      location_name: locationName,
      location_type: (location_type != null && location_type !== "") ? String(location_type).trim() : null,
      description: (description != null && description !== "") ? String(description).trim() : null,
      is_active:
        is_active !== undefined
          ? (typeof is_active === "boolean" ? (is_active ? 1 : 0) : is_active)
          : null,
    },
  );

  const [rows] = await pool.execute(
    "SELECT location_id, company_id, branch_id, location_name AS name, location_type, description, is_active, created_at FROM locations WHERE location_id = :id",
    { id: Number(id) },
  );

  res.json(rows[0]);
});

const deleteLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [existing] = await pool.execute(
    "SELECT location_id FROM locations WHERE location_id = :id",
    { id: Number(id) },
  );

  if (!existing.length) {
    return res.status(404).json({ error: "Location not found" });
  }

  await pool.execute("DELETE FROM locations WHERE location_id = :id", { id: Number(id) });
  res.status(204).send();
});

module.exports = {
  listStockLevels,
  getStockLevel,
  createStockLevel,
  updateStockLevel,
  adjustStock,
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
};

