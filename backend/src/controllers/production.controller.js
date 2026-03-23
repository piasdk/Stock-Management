"use strict";

const pool = require("../../db/pool");
const asyncHandler = require("../../utils/asyncHandler");

function getTenant(req) {
  const company_id = req?.user?.company_id ?? req?.tenant?.company_id ?? null;
  const branch_id = req?.user?.branch_id ?? req?.tenant?.branch_id ?? null;
  return { company_id, branch_id };
}

async function getTableColumns(tableName) {
  const [rows] = await pool.execute(
    `
    SELECT COLUMN_NAME AS name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
    `,
    { tableName },
  );
  return new Set((rows || []).map((r) => String(r.name)));
}

function pickFirstColumn(columns, candidates) {
  for (const c of candidates) {
    if (columns.has(c)) return c;
  }
  return null;
}

// GET /production/bom-definitions
// Returns BOM headers with product + variant context.
const listBomDefinitions = asyncHandler(async (req, res) => {
  const { company_id, branch_id } = getTenant(req);
  if (!company_id) return res.status(400).json({ error: "Missing company context" });

  const params = { company_id: Number(company_id), branch_id: branch_id != null ? Number(branch_id) : null };

  const where = [`b.company_id = :company_id`];
  if (params.branch_id != null) where.push(`(b.branch_id IS NULL OR b.branch_id = :branch_id)`);

  // Your schema uses `bill_of_materials`. Some DBs may also have `bom_code` column.
  let rows;
  const selectWithCodeAndTimestamps = `
    SELECT
      b.bom_id,
      b.company_id,
      b.branch_id,
      b.bom_code,
      b.product_id,
      p.name AS product,
      p.name AS product_name,
      b.variant_id,
      pv.variant_name,
      pv.sku AS sku,
      pv.sku AS variant_sku,
      b.revision_code,
      b.unit_id,
      u.name AS unit_name,
      u.short_code AS unit_short_code,
      b.effective_from,
      b.effective_to,
      b.notes,
      b.is_active,
      b.created_at,
      b.updated_at
    FROM bill_of_materials b
    LEFT JOIN products p ON p.product_id = b.product_id
    LEFT JOIN product_variants pv ON pv.variant_id = b.variant_id
    LEFT JOIN units u ON u.unit_id = b.unit_id
    WHERE ${where.join(" AND ")}
    ORDER BY b.created_at DESC
  `;
  const selectNoCodeWithTimestamps = `
    SELECT
      b.bom_id,
      b.company_id,
      b.branch_id,
      NULL AS bom_code,
      b.product_id,
      p.name AS product,
      p.name AS product_name,
      b.variant_id,
      pv.variant_name,
      pv.sku AS sku,
      pv.sku AS variant_sku,
      b.revision_code,
      b.unit_id,
      u.name AS unit_name,
      u.short_code AS unit_short_code,
      b.effective_from,
      b.effective_to,
      b.notes,
      b.is_active,
      b.created_at,
      b.updated_at
    FROM bill_of_materials b
    LEFT JOIN products p ON p.product_id = b.product_id
    LEFT JOIN product_variants pv ON pv.variant_id = b.variant_id
    LEFT JOIN units u ON u.unit_id = b.unit_id
    WHERE ${where.join(" AND ")}
    ORDER BY b.created_at DESC
  `;
  // Minimal fallback for older schemas without created_at/updated_at (and/or bom_code).
  const selectMinimal = `
    SELECT
      b.bom_id,
      b.company_id,
      b.branch_id,
      NULL AS bom_code,
      b.product_id,
      p.name AS product,
      p.name AS product_name,
      b.variant_id,
      pv.variant_name,
      pv.sku AS sku,
      pv.sku AS variant_sku,
      b.revision_code,
      b.unit_id,
      u.name AS unit_name,
      u.short_code AS unit_short_code,
      b.effective_from,
      b.effective_to,
      b.notes,
      b.is_active,
      NULL AS created_at,
      NULL AS updated_at
    FROM bill_of_materials b
    LEFT JOIN products p ON p.product_id = b.product_id
    LEFT JOIN product_variants pv ON pv.variant_id = b.variant_id
    LEFT JOIN units u ON u.unit_id = b.unit_id
    WHERE ${where.join(" AND ")}
    ORDER BY b.bom_id DESC
  `;
  try {
    [rows] = await pool.execute(selectWithCodeAndTimestamps, params);
  } catch (err) {
    if (err && (err.code === "ER_BAD_FIELD_ERROR" || (err.message && err.message.includes("Unknown column")))) {
      try {
        [rows] = await pool.execute(selectNoCodeWithTimestamps, params);
      } catch (err2) {
        if (err2 && (err2.code === "ER_BAD_FIELD_ERROR" || (err2.message && err2.message.includes("Unknown column")))) {
          [rows] = await pool.execute(selectMinimal, params);
        } else {
          throw err2;
        }
      }
    } else {
      throw err;
    }
  }

  res.json(rows || []);
});

// GET /production/bom
// Alias for listBomDefinitions (kept for frontend compatibility).
const listBom = asyncHandler(async (req, res) => {
  return listBomDefinitions(req, res);
});

// POST /production/boms
const createBom = asyncHandler(async (req, res) => {
  const { company_id, branch_id } = getTenant(req);
  if (!company_id) return res.status(400).json({ error: "Missing company context" });

  const {
    bom_code,
    product_id,
    variant_id,
    revision_code,
    unit_id,
    effective_from,
    effective_to,
    notes,
    is_active = 1,
  } = req.body || {};

  if (!product_id || !variant_id || !revision_code || !unit_id || !effective_from) {
    return res.status(400).json({ error: "product_id, variant_id, revision_code, unit_id, effective_from are required" });
  }

  const params = {
    company_id: Number(company_id),
    branch_id: branch_id != null ? Number(branch_id) : null,
    bom_code: bom_code != null && bom_code !== "" ? String(bom_code) : null,
    product_id: Number(product_id),
    variant_id: Number(variant_id),
    revision_code: String(revision_code),
    unit_id: Number(unit_id),
    effective_from,
    effective_to: effective_to || null,
    notes: notes || null,
    is_active: typeof is_active === "boolean" ? (is_active ? 1 : 0) : Number(is_active) ? 1 : 0,
  };

  let result;
  try {
    // If your table has bom_code column, persist it.
    [result] = await pool.execute(
      `
      INSERT INTO bill_of_materials (
        company_id, branch_id,
        bom_code, product_id, variant_id,
        revision_code, unit_id,
        effective_from, effective_to,
        notes, is_active
      ) VALUES (
        :company_id, :branch_id,
        :bom_code, :product_id, :variant_id,
        :revision_code, :unit_id,
        :effective_from, :effective_to,
        :notes, :is_active
      )
      `,
      params,
    );
  } catch (err) {
    if (err && (err.code === "ER_BAD_FIELD_ERROR" || (err.message && err.message.includes("Unknown column")))) {
      // Older schema: no bom_code column
      [result] = await pool.execute(
        `
        INSERT INTO bill_of_materials (
          company_id, branch_id,
          product_id, variant_id,
          revision_code, unit_id,
          effective_from, effective_to,
          notes, is_active
        ) VALUES (
          :company_id, :branch_id,
          :product_id, :variant_id,
          :revision_code, :unit_id,
          :effective_from, :effective_to,
          :notes, :is_active
        )
        `,
        params,
      );
    } else {
      throw err;
    }
  }

  const bom_id = result.insertId;
  const [rows] = await pool.execute(`SELECT * FROM bill_of_materials WHERE bom_id = :bom_id`, { bom_id });
  res.status(201).json(rows[0] || { bom_id });
});

// DELETE /production/boms/:id
const deleteBom = asyncHandler(async (req, res) => {
  const { company_id } = getTenant(req);
  if (!company_id) return res.status(400).json({ error: "Missing company context" });
  const bom_id = Number(req.params.id);
  await pool.execute(
    `DELETE FROM bill_of_materials WHERE bom_id = :bom_id AND company_id = :company_id`,
    { bom_id, company_id: Number(company_id) },
  );
  res.status(204).send();
});

// POST /production/bom-items
const createBomItem = asyncHandler(async (req, res) => {
  const { company_id, branch_id } = getTenant(req);
  if (!company_id) return res.status(400).json({ error: "Missing company context" });

  const {
    bom_id,
    component_variant_id,
    component_product_id, // legacy name (older frontend)
    component_quantity,
    unit_id, // optional in some schemas
    scrap_factor,
    is_active = 1,
  } = req.body || {};

  const componentVariantId = component_variant_id ?? component_product_id;
  if (!bom_id || !componentVariantId || component_quantity == null) {
    return res.status(400).json({ error: "bom_id, component_variant_id, component_quantity are required" });
  }

  const cols = await getTableColumns("bill_of_materials_items");
  if (cols.size === 0) {
    return res.status(400).json({ error: "BOM items table is missing. Expected `bill_of_materials_items`." });
  }

  const bomIdCol = pickFirstColumn(cols, ["bom_id", "bill_of_material_id", "material_bom_id"]);
  // Your schema uses component_variant_id
  const materialCol = pickFirstColumn(cols, ["component_variant_id", "component_product_id", "material_product_id", "material_id", "product_id", "item_product_id"]);
  const qtyCol = pickFirstColumn(cols, ["component_quantity", "quantity", "qty", "quantity_required", "required_quantity"]);
  const unitCol = pickFirstColumn(cols, ["unit_id", "uom_id"]); // optional
  const scrapCol = pickFirstColumn(cols, ["scrap_factor", "scrap_percentage", "wastage_factor", "wastage_percentage"]);
  const activeCol = pickFirstColumn(cols, ["is_active", "active"]);
  const companyCol = pickFirstColumn(cols, ["company_id"]);
  const branchCol = pickFirstColumn(cols, ["branch_id"]);

  // unitCol is optional (your current table doesn't have it)
  if (!bomIdCol || !materialCol || !qtyCol) {
    return res.status(400).json({
      error: `Unsupported bill_of_materials_items schema. Missing required columns. Found columns: ${[...cols].join(", ")}`,
    });
  }

  const insertCols = [];
  const insertVals = [];
  const params = {};

  if (companyCol) { insertCols.push(companyCol); insertVals.push(":company_id"); params.company_id = Number(company_id); }
  if (branchCol) { insertCols.push(branchCol); insertVals.push(":branch_id"); params.branch_id = branch_id != null ? Number(branch_id) : null; }

  insertCols.push(bomIdCol); insertVals.push(":bom_id"); params.bom_id = Number(bom_id);
  insertCols.push(materialCol); insertVals.push(":material"); params.material = Number(componentVariantId);
  insertCols.push(qtyCol); insertVals.push(":qty"); params.qty = Number(component_quantity);
  if (unitCol && unit_id != null && unit_id !== "") {
    insertCols.push(unitCol); insertVals.push(":unit_id"); params.unit_id = Number(unit_id);
  }

  if (scrapCol) { insertCols.push(scrapCol); insertVals.push(":scrap"); params.scrap = scrap_factor != null && scrap_factor !== "" ? Number(scrap_factor) : null; }
  if (activeCol) { insertCols.push(activeCol); insertVals.push(":is_active"); params.is_active = typeof is_active === "boolean" ? (is_active ? 1 : 0) : Number(is_active) ? 1 : 0; }

  let result;
  try {
    [result] = await pool.execute(
      `
      INSERT INTO bill_of_materials_items (${insertCols.join(", ")})
      VALUES (${insertVals.join(", ")})
      `,
      params,
    );
  } catch (err) {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({
        error: "BOM items table is missing. Expected `bill_of_materials_items`.",
      });
    }
    throw err;
  }

  const bom_item_id = result.insertId;
  const [rows] = await pool.execute(
    `SELECT * FROM bill_of_materials_items WHERE bom_item_id = :bom_item_id`,
    { bom_item_id },
  );
  res.status(201).json(rows[0] || { bom_item_id });
});

// GET /production/bom-items
// List BOM items with joined product/material/unit info
const listBomItems = asyncHandler(async (req, res) => {
  const { company_id, branch_id } = getTenant(req);
  if (!company_id) return res.status(400).json({ error: "Missing company context" });

  const params = { company_id: Number(company_id), branch_id: branch_id != null ? Number(branch_id) : null };

  const cols = await getTableColumns("bill_of_materials_items");
  const hasCompany = cols.has("company_id");
  const hasBranch = cols.has("branch_id");

  let where = [];
  if (hasCompany) where.push(`i.company_id = :company_id`);
  if (hasBranch && params.branch_id != null) where.push(`(i.branch_id IS NULL OR i.branch_id = :branch_id)`);
  // Always enforce tenant via BOM header as last line of defense
  where.push(`b.company_id = :company_id`);
  if (params.branch_id != null) where.push(`(b.branch_id IS NULL OR b.branch_id = :branch_id)`);

  try {
    const [rows] = await pool.execute(
      `
      SELECT
        i.bom_item_id,
        ${hasCompany ? "i.company_id" : "NULL"} AS company_id,
        ${hasBranch ? "i.branch_id" : "NULL"} AS branch_id,
        i.bom_id,
        i.*,
        b.revision_code,
        b.effective_from,
        b.effective_to,
        fp.name AS product,
        fp.sku AS product_sku,
        mv.variant_name AS material,
        mv.sku AS material_sku,
        u.name AS unit_name,
        u.short_code AS unit_short_code
      FROM bill_of_materials_items i
      INNER JOIN bill_of_materials b ON b.bom_id = i.bom_id
      LEFT JOIN products fp ON fp.product_id = b.product_id
      LEFT JOIN product_variants mv ON mv.variant_id = i.component_variant_id
      LEFT JOIN units u ON u.unit_id = mv.unit_id
      WHERE ${where.join(" AND ")}
      ORDER BY b.bom_id, i.bom_item_id
      `,
      params,
    );
    res.json(rows || []);
  } catch (err) {
    if (err && (err.code === "ER_BAD_FIELD_ERROR" || (err.message && err.message.includes("Unknown column")))) {
      // If schema differs wildly, return empty instead of 500.
      return res.json([]);
    }
    if (err && (err.code === "ER_NO_SUCH_TABLE" || (err.message && (err.message.includes("bill_of_material_items") || err.message.includes("bill_of_materials_items"))))) {
      // If items table doesn't exist yet, return empty list so UI doesn't break.
      return res.json([]);
    }
    throw err;
  }
});

// PUT /production/bom-items/:id
const updateBomItem = asyncHandler(async (req, res) => {
  const { company_id } = getTenant(req);
  if (!company_id) return res.status(400).json({ error: "Missing company context" });
  const bom_item_id = Number(req.params.id);

  const {
    bom_id,
    component_product_id,
    component_quantity,
    unit_id,
    scrap_factor,
    is_active,
  } = req.body || {};

  await pool.execute(
    `
    UPDATE bill_of_materials_items
    SET
      bom_id = COALESCE(:bom_id, bom_id),
      component_product_id = COALESCE(:component_product_id, component_product_id),
      component_quantity = COALESCE(:component_quantity, component_quantity),
      unit_id = COALESCE(:unit_id, unit_id),
      scrap_factor = :scrap_factor,
      is_active = COALESCE(:is_active, is_active)
    WHERE bom_item_id = :bom_item_id AND company_id = :company_id
    `,
    {
      bom_item_id,
      company_id: Number(company_id),
      bom_id: bom_id != null ? Number(bom_id) : null,
      component_product_id: component_product_id != null ? Number(component_product_id) : null,
      component_quantity: component_quantity != null ? Number(component_quantity) : null,
      unit_id: unit_id != null ? Number(unit_id) : null,
      scrap_factor: scrap_factor != null && scrap_factor !== "" ? Number(scrap_factor) : null,
      is_active: is_active != null ? (typeof is_active === "boolean" ? (is_active ? 1 : 0) : Number(is_active)) : null,
    },
  );

  const [rows] = await pool.execute(
    `SELECT * FROM bill_of_materials_items WHERE bom_item_id = :bom_item_id`,
    { bom_item_id },
  );
  res.json(rows[0] || {});
});

// DELETE /production/bom-items/:id
const deleteBomItem = asyncHandler(async (req, res) => {
  const { company_id } = getTenant(req);
  if (!company_id) return res.status(400).json({ error: "Missing company context" });
  const bom_item_id = Number(req.params.id);
  await pool.execute(
    `DELETE FROM bill_of_materials_items WHERE bom_item_id = :bom_item_id AND company_id = :company_id`,
    { bom_item_id, company_id: Number(company_id) },
  );
  res.status(204).send();
});

module.exports = {
  listBomDefinitions,
  listBom,
  createBom,
  deleteBom,
  createBomItem,
  updateBomItem,
  deleteBomItem,
  listBomItems,
};

