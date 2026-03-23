"use strict";

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

async function resolveUnitId(conn, value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) return asNumber;
  const text = String(value).trim();
  if (!text) return null;
  try {
    const [rows] = await conn.execute(
      `SELECT unit_id
       FROM units
       WHERE LOWER(TRIM(name)) = LOWER(TRIM(:t))
          OR LOWER(TRIM(short_code)) = LOWER(TRIM(:t))
       LIMIT 1`,
      { t: text },
    );
    return rows && rows[0] ? Number(rows[0].unit_id) : null;
  } catch {
    return null;
  }
}

const listProducts = asyncHandler(async (req, res) => {
  const {
    search,
    categoryId,
    isActive,
    limit = 50,
    offset = 0,
  } = req.query;

  const filters = [];
  const params = {
    limit: Number(limit),
    offset: Number(offset),
  };

  if (search) {
    filters.push("(p.name LIKE CONCAT('%', :search, '%'))");
    params.search = search;
  }

  if (categoryId) {
    filters.push("p.category_id = :categoryId");
    params.categoryId = Number(categoryId);
  }

  if (isActive !== undefined) {
    filters.push("p.is_active = :isActive");
    params.isActive = isActive === "true" ? 1 : 0;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  // Schema: products has (product_id, company_id, category_id, name, description, material_classification, is_active, created_at, updated_at)
  const baseSelect = `
    SELECT
      p.product_id,
      p.company_id,
      p.name,
      p.category_id,
      c.name AS category_name,
      p.description,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN categories c ON c.category_id = p.category_id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  const selectWithMaterial = `
    SELECT
      p.product_id,
      p.company_id,
      p.name,
      p.category_id,
      c.name AS category_name,
      p.description,
      p.material_classification,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN categories c ON c.category_id = p.category_id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  const selectWithOptionalPricing = `
    SELECT
      p.product_id,
      p.company_id,
      p.name,
      p.sku,
      p.category_id,
      c.name AS category_name,
      p.description,
      p.material_classification,
      p.unit_id,
      p.product_type,
      p.cost_price,
      p.selling_price,
      p.reorder_level,
      p.reorder_quantity,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN categories c ON c.category_id = p.category_id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  // Fallback if some optional columns (e.g. reorder_level) don't exist yet.
  const selectWithPricingMinimal = `
    SELECT
      p.product_id,
      p.company_id,
      p.name,
      p.sku,
      p.category_id,
      c.name AS category_name,
      p.description,
      p.material_classification,
      p.unit_id,
      p.product_type,
      p.cost_price,
      p.selling_price,
      p.is_active,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN categories c ON c.category_id = p.category_id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
  `;

  let rows;
  try {
    try {
      [rows] = await pool.execute(selectWithOptionalPricing, params);
    } catch (err) {
      if (err.code === "ER_BAD_FIELD_ERROR" || (err.message && err.message.includes("Unknown column"))) {
        try {
          [rows] = await pool.execute(selectWithPricingMinimal, params);
        } catch (err2) {
          if (err2.code === "ER_BAD_FIELD_ERROR" || (err2.message && err2.message.includes("Unknown column"))) {
            [rows] = await pool.execute(selectWithMaterial, params);
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
    }
  } catch (err) {
    if (err.code === "ER_BAD_FIELD_ERROR" || (err.message && err.message.includes("Unknown column"))) {
      [rows] = await pool.execute(baseSelect, params);
    } else {
      throw err;
    }
  }
  for (const row of rows) {
    if (row.material_classification === undefined) row.material_classification = null;
  }

  const productIds = rows.map((r) => r.product_id).filter(Boolean);
  let variantsByProduct = {};
  if (productIds.length > 0) {
    try {
      const placeholders = productIds.map(() => "?").join(",");
      const [variantRows] = await pool.query(
        `SELECT
            pv.variant_id, pv.product_id, pv.variant_name, pv.sku, pv.size,
            pv.unit_id, pv.base_unit_id, pv.units_per_package, pv.package_unit_id,
            pv.price_per_unit, pv.price_per_package, pv.barcode, pv.is_active,
            u.name AS unit_name, u.short_code AS unit_short_code,
            bu.name AS base_unit_name, bu.short_code AS base_unit_short_code,
            pu.name AS package_unit_name, pu.short_code AS package_unit_short_code
         FROM product_variants pv
         LEFT JOIN units u ON u.unit_id = pv.unit_id
         LEFT JOIN units bu ON bu.unit_id = pv.base_unit_id
         LEFT JOIN units pu ON pu.unit_id = pv.package_unit_id
         WHERE pv.product_id IN (${placeholders}) AND pv.is_active = 1
         ORDER BY product_id, variant_id`,
        productIds
      );
      for (const v of variantRows || []) {
        if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
        variantsByProduct[v.product_id].push({
          variant_id: v.variant_id,
          variant_name: v.variant_name,
          variant_sku: v.sku,
          sku: v.sku,
          size: v.size,
          unit_id: v.unit_id ?? null,
          base_unit_id: v.base_unit_id ?? null,
          units_per_package: v.units_per_package,
          package_unit_id: v.package_unit_id ?? null,
          unit: v.unit_name || v.unit_short_code || null,
          unit_short_code: v.unit_short_code || null,
          base_unit: v.base_unit_name || v.base_unit_short_code || null,
          base_unit_short_code: v.base_unit_short_code || null,
          package_unit: v.package_unit_name || v.package_unit_short_code || null,
          package_unit_short_code: v.package_unit_short_code || null,
          unit_price: v.price_per_unit,
          price_per_unit: v.price_per_unit,
          package_price: v.price_per_package,
          price_per_package: v.price_per_package,
          barcode: v.barcode,
          is_active: v.is_active,
        });
      }
    } catch (err) {
      if (err.code !== "ER_NO_SUCH_TABLE") throw err;
    }
  }

  const withOptionalFields = (row) => {
    const variants = variantsByProduct[row.product_id] || [];
    const first = variants[0];
    return {
      ...row,
      sku: first?.sku ?? row.sku ?? null,
      unit_id: row.unit_id ?? null,
      unit: first?.unit ?? null,
      product_type: row.product_type ?? null,
      cost_price: row.cost_price ?? null,
      selling_price: first ? (first.price_per_unit ?? first.price_per_package) : (row.selling_price ?? null),
      reorder_level: row.reorder_level ?? null,
      reorder_quantity: row.reorder_quantity ?? null,
      variants,
    };
  };

  res.json(rows.map(withOptionalFields));
});

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.execute(
    `
      SELECT
        p.product_id,
        p.company_id,
        p.category_id,
        p.name,
        p.description,
        p.material_classification,
        p.is_active,
        p.created_at,
        p.updated_at,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.category_id = p.category_id
      WHERE p.product_id = :id
    `,
    { id: Number(id) },
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Product not found" });
  }

  const row = rows[0];
  let variants = [];
  try {
    const [vRows] = await pool.execute(
      `SELECT
          pv.variant_id, pv.product_id, pv.variant_name, pv.sku, pv.size,
          pv.unit_id, pv.base_unit_id, pv.units_per_package, pv.package_unit_id,
          pv.price_per_unit, pv.price_per_package, pv.barcode, pv.is_active,
          u.name AS unit_name, u.short_code AS unit_short_code,
          bu.name AS base_unit_name, bu.short_code AS base_unit_short_code,
          pu.name AS package_unit_name, pu.short_code AS package_unit_short_code
       FROM product_variants pv
       LEFT JOIN units u ON u.unit_id = pv.unit_id
       LEFT JOIN units bu ON bu.unit_id = pv.base_unit_id
       LEFT JOIN units pu ON pu.unit_id = pv.package_unit_id
       WHERE pv.product_id = :id ORDER BY pv.variant_id`,
      { id: Number(id) }
    );
    variants = (vRows || []).map((v) => ({
      variant_id: v.variant_id,
      variant_name: v.variant_name,
      variant_sku: v.sku,
      sku: v.sku,
      size: v.size,
      unit_id: v.unit_id ?? null,
      base_unit_id: v.base_unit_id ?? null,
      units_per_package: v.units_per_package,
      package_unit_id: v.package_unit_id ?? null,
      unit: v.unit_name || v.unit_short_code || null,
      unit_short_code: v.unit_short_code || null,
      base_unit: v.base_unit_name || v.base_unit_short_code || null,
      base_unit_short_code: v.base_unit_short_code || null,
      package_unit: v.package_unit_name || v.package_unit_short_code || null,
      package_unit_short_code: v.package_unit_short_code || null,
      unit_price: v.price_per_unit,
      price_per_unit: v.price_per_unit,
      package_price: v.price_per_package,
      price_per_package: v.price_per_package,
      barcode: v.barcode,
      is_active: v.is_active,
    }));
  } catch (err) {
    if (err.code !== "ER_NO_SUCH_TABLE") throw err;
  }

  const first = variants[0];
  res.json({
    ...row,
    sku: first?.sku ?? row.sku ?? null,
    unit_id: null,
    unit: first?.unit ?? null,
    product_type: row.product_type ?? null,
    cost_price: null,
    selling_price: first ? (first.price_per_unit ?? first.price_per_package) : (row.selling_price ?? null),
    reorder_level: row.reorder_level ?? null,
    reorder_quantity: row.reorder_quantity ?? null,
    variants,
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const {
    company_id,
    name,
    category_id,
    description,
    material_classification,
    is_active = true,
    sku,
    unit,
    selling_price,
    cost_price,
    variants: variantsPayload,
  } = req.body;

  if (!company_id || !name) {
    return res
      .status(400)
      .json({ error: "company_id and name are required" });
  }

  const sanitizeValue = (value) => (value === undefined ? null : value);
  const conn = await pool.getConnection();
  let newProductId;
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `
        INSERT INTO products (
          company_id,
          category_id,
          name,
          description,
          material_classification,
          is_active
        ) VALUES (
          :company_id,
          :category_id,
          :name,
          :description,
          :material_classification,
          :is_active
        )
      `,
      {
        company_id,
        category_id: sanitizeValue(category_id),
        name,
        description: sanitizeValue(description),
        material_classification: sanitizeValue(material_classification),
        is_active: is_active ? 1 : 0,
      },
    );

    newProductId = result.insertId;

    let variantsToInsert = [];
    if (Array.isArray(variantsPayload) && variantsPayload.length > 0) {
      variantsToInsert = variantsPayload.map((v) => ({
        variant_name: v.variant_name ?? v.name ?? name,
        sku: sanitizeValue(v.sku ?? v.variant_sku),
        size: sanitizeValue(v.size),
        unit_id: v.unit_id ?? v.unitId ?? v.unit ?? v.size_unit ?? v.sizeUnit,
        base_unit_id: v.base_unit_id ?? v.baseUnitId ?? v.base_unit ?? v.baseUnit,
        units_per_package: (v.units_per_package != null && v.units_per_package !== "") ? Number(v.units_per_package) : (v.unitsPerPackage != null && v.unitsPerPackage !== "" ? Number(v.unitsPerPackage) : null),
        package_unit_id: v.package_unit_id ?? v.packageUnitId ?? v.package_unit ?? v.packageUnit,
        price_per_unit: v.price_per_unit != null || v.unit_price != null || v.unitPrice != null ? Number(v.price_per_unit ?? v.unit_price ?? v.unitPrice) : null,
        price_per_package: v.price_per_package != null || v.package_price != null || v.packagePrice != null ? Number(v.price_per_package ?? v.package_price ?? v.packagePrice) : null,
        barcode: sanitizeValue(v.barcode),
        is_active: v.is_active !== false ? 1 : 0,
      }));
    } else {
      // Bulk products: one default variant holds pricing (B option).
      // Packaged products will send variantsPayload explicitly.
      variantsToInsert = [{
        variant_name: name,
        sku: sanitizeValue(sku),
        size: sanitizeValue(req.body.size ?? 1),
        unit_id: req.body.unit_id ?? req.body.unitId ?? unit,
        base_unit_id: req.body.base_unit_id ?? req.body.baseUnitId ?? req.body.unit_id ?? req.body.unitId ?? unit,
        units_per_package: null,
        package_unit_id: null,
        price_per_unit: selling_price != null && selling_price !== "" ? Number(selling_price) : null,
        price_per_package: null,
        barcode: null,
        is_active: 1,
      }];
    }

    for (const v of variantsToInsert) {
      const unit_id = await resolveUnitId(conn, v.unit_id);
      let base_unit_id = await resolveUnitId(conn, v.base_unit_id);
      let package_unit_id = await resolveUnitId(conn, v.package_unit_id);
      // Default base_unit_id/package_unit_id when not explicitly provided
      if (!base_unit_id && unit_id) {
        base_unit_id = unit_id;
      }
      if (!package_unit_id && unit_id && v.units_per_package != null) {
        package_unit_id = unit_id;
      }
      await conn.execute(
        `INSERT INTO product_variants (
          product_id, variant_name, sku, size, unit_id, base_unit_id,
          units_per_package, package_unit_id, price_per_unit, price_per_package, barcode, is_active
        ) VALUES (
          :product_id, :variant_name, :sku, :size, :unit_id, :base_unit_id,
          :units_per_package, :package_unit_id, :price_per_unit, :price_per_package, :barcode, :is_active
        )`,
        {
          product_id: newProductId,
          variant_name: v.variant_name,
          sku: v.sku,
          size: v.size,
          unit_id,
          base_unit_id,
          units_per_package: v.units_per_package,
          package_unit_id,
          price_per_unit: v.price_per_unit,
          price_per_package: v.price_per_package,
          barcode: v.barcode,
          is_active: v.is_active,
        },
      );
    }

    await conn.commit();
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }

  const [rows] = await pool.execute(
    `SELECT p.product_id, p.company_id, p.category_id, p.name, p.description,
            p.material_classification, p.is_active, p.created_at, p.updated_at
     FROM products p WHERE p.product_id = :id`,
    { id: newProductId },
  );
  const row = rows[0] || {};
  const [vRows] = await pool.execute(
    `SELECT
        pv.variant_id, pv.product_id, pv.variant_name, pv.sku, pv.size,
        pv.unit_id, pv.base_unit_id, pv.units_per_package, pv.package_unit_id,
        pv.price_per_unit, pv.price_per_package, pv.barcode, pv.is_active,
        u.name AS unit_name, u.short_code AS unit_short_code
     FROM product_variants pv
     LEFT JOIN units u ON u.unit_id = pv.unit_id
     WHERE pv.product_id = :id`,
    { id: newProductId },
  );
  const variants = (vRows || []).map((v) => ({
    variant_id: v.variant_id,
    variant_name: v.variant_name,
    variant_sku: v.sku,
    sku: v.sku,
    unit_id: v.unit_id ?? null,
    base_unit_id: v.base_unit_id ?? null,
    package_unit_id: v.package_unit_id ?? null,
    unit: v.unit_name || v.unit_short_code || null,
    price_per_unit: v.price_per_unit,
    price_per_package: v.price_per_package,
    unit_price: v.price_per_unit,
    package_price: v.price_per_package,
  }));
  const first = variants[0];
  res.status(201).json({
    ...row,
    category_name: null,
    sku: first?.sku ?? null,
    unit_id: null,
    unit: first?.unit ?? null,
    product_type: null,
    cost_price: null,
    selling_price: first ? (first.price_per_unit ?? first.price_per_package) : null,
    reorder_level: null,
    reorder_quantity: null,
    variants,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productId = Number(id);
  const {
    name,
    category_id,
    description,
    material_classification,
    is_active,
    sku,
    unit,
    selling_price,
    cost_price,
    variants: variantsPayload,
  } = req.body;

  const [existing] = await pool.execute(
    "SELECT product_id FROM products WHERE product_id = :id",
    { id: productId },
  );

  if (!existing.length) {
    return res.status(404).json({ error: "Product not found" });
  }

  const sanitizeValue = (value) => (value === undefined ? null : value);
  const updateFields = [];
  const updateParams = { id: productId };

  if (name !== null && name !== undefined) {
    updateFields.push("name = :name");
    updateParams.name = name;
  }
  if (category_id !== undefined) {
    updateFields.push("category_id = :category_id");
    updateParams.category_id = sanitizeValue(category_id);
  }
  if (description !== undefined) {
    updateFields.push("description = :description");
    updateParams.description = sanitizeValue(description);
  }
  if (material_classification !== undefined) {
    updateFields.push("material_classification = :material_classification");
    updateParams.material_classification = sanitizeValue(material_classification);
  }
  if (is_active !== undefined && is_active !== null) {
    updateFields.push("is_active = :is_active");
    updateParams.is_active = typeof is_active === "boolean" ? (is_active ? 1 : 0) : Number(is_active);
  }

  // Optional pricing columns: update if the columns exist in this schema.
  // We only include these fields if caller provided them.
  if (selling_price !== undefined) {
    updateFields.push("selling_price = :selling_price");
    updateParams.selling_price = selling_price != null && selling_price !== "" ? Number(selling_price) : null;
  }
  if (cost_price !== undefined) {
    updateFields.push("cost_price = :cost_price");
    updateParams.cost_price = cost_price != null && cost_price !== "" ? Number(cost_price) : null;
  }

  if (updateFields.length > 0) {
    try {
      await pool.execute(
        `UPDATE products SET ${updateFields.join(", ")} WHERE product_id = :id`,
        updateParams,
      );
    } catch (err) {
      // Allow older schemas to work even if selling_price/cost_price columns are missing.
      if (err && (err.code === "ER_BAD_FIELD_ERROR" || (err.message && err.message.includes("Unknown column")))) {
        const safeFields = updateFields.filter(
          (f) => !f.startsWith("selling_price") && !f.startsWith("cost_price"),
        );
        if (safeFields.length > 0) {
          const safeParams = { ...updateParams };
          delete safeParams.selling_price;
          delete safeParams.cost_price;
          await pool.execute(
            `UPDATE products SET ${safeFields.join(", ")} WHERE product_id = :id`,
            safeParams,
          );
        }
      } else {
        throw err;
      }
    }
  }

  let variantsToInsert = null;
  if (Array.isArray(variantsPayload)) {
    const [currentProduct] = await pool.execute("SELECT name FROM products WHERE product_id = :id", { id: productId });
    const productName = (currentProduct[0] && currentProduct[0].name) || name || "";
    variantsToInsert = variantsPayload.map((v) => ({
      variant_name: v.variant_name ?? v.name ?? productName,
      sku: sanitizeValue(v.sku ?? v.variant_sku),
      size: sanitizeValue(v.size),
      unit_id: v.unit_id ?? v.unitId ?? v.unit ?? v.size_unit ?? v.sizeUnit,
      base_unit_id: v.base_unit_id ?? v.baseUnitId ?? v.base_unit ?? v.baseUnit,
      units_per_package: (v.units_per_package != null && v.units_per_package !== "") ? Number(v.units_per_package) : (v.unitsPerPackage != null && v.unitsPerPackage !== "" ? Number(v.unitsPerPackage) : null),
      package_unit_id: v.package_unit_id ?? v.packageUnitId ?? v.package_unit ?? v.packageUnit,
      price_per_unit: v.price_per_unit != null || v.unit_price != null || v.unitPrice != null ? Number(v.price_per_unit ?? v.unit_price ?? v.unitPrice) : null,
      price_per_package: v.price_per_package != null || v.package_price != null || v.packagePrice != null ? Number(v.price_per_package ?? v.package_price ?? v.packagePrice) : null,
      barcode: sanitizeValue(v.barcode),
      is_active: v.is_active !== false ? 1 : 0,
    }));
  } else if (
    sku !== undefined || selling_price !== undefined || cost_price !== undefined ||
    req.body.unit_id !== undefined || unit !== undefined
  ) {
    const [currentProduct] = await pool.execute("SELECT name FROM products WHERE product_id = :id", { id: productId });
    const productName = (currentProduct[0] && currentProduct[0].name) || name || "";
    variantsToInsert = [{
      variant_name: productName,
      sku: sanitizeValue(sku),
      size: sanitizeValue(req.body.size ?? 1),
      unit_id: req.body.unit_id ?? req.body.unitId ?? unit,
      base_unit_id: req.body.base_unit_id ?? req.body.baseUnitId ?? req.body.unit_id ?? req.body.unitId ?? unit,
      units_per_package: null,
      package_unit_id: null,
      price_per_unit: selling_price != null ? Number(selling_price) : (cost_price != null ? Number(cost_price) : null),
      price_per_package: null,
      barcode: null,
      is_active: 1,
    }];
  }

  if (variantsToInsert !== null) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("DELETE FROM product_variants WHERE product_id = :id", { id: productId });
      for (const v of variantsToInsert) {
        const unit_id = await resolveUnitId(conn, v.unit_id);
        let base_unit_id = await resolveUnitId(conn, v.base_unit_id);
        let package_unit_id = await resolveUnitId(conn, v.package_unit_id);
        if (!base_unit_id && unit_id) {
          base_unit_id = unit_id;
        }
        if (!package_unit_id && unit_id && v.units_per_package != null) {
          package_unit_id = unit_id;
        }
        await conn.execute(
          `INSERT INTO product_variants (
            product_id, variant_name, sku, size, unit_id, base_unit_id,
            units_per_package, package_unit_id, price_per_unit, price_per_package, barcode, is_active
          ) VALUES (
            :product_id, :variant_name, :sku, :size, :unit_id, :base_unit_id,
            :units_per_package, :package_unit_id, :price_per_unit, :price_per_package, :barcode, :is_active
          )`,
          {
            product_id: productId,
            variant_name: v.variant_name,
            sku: v.sku,
            size: v.size,
            unit_id,
            base_unit_id,
            units_per_package: v.units_per_package,
            package_unit_id,
            price_per_unit: v.price_per_unit,
            price_per_package: v.price_per_package,
            barcode: v.barcode,
            is_active: v.is_active,
          },
        );
      }
      await conn.commit();
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  }

  const [rows] = await pool.execute(
    `
      SELECT
        p.product_id, p.company_id, p.category_id, p.name, p.description,
        p.material_classification, p.is_active, p.created_at, p.updated_at,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.category_id = p.category_id
      WHERE p.product_id = :id
    `,
    { id: productId },
  );
  const [vRows] = await pool.execute(
    `SELECT
        pv.variant_id, pv.product_id, pv.variant_name, pv.sku, pv.size,
        pv.unit_id, pv.base_unit_id, pv.units_per_package, pv.package_unit_id,
        pv.price_per_unit, pv.price_per_package, pv.barcode, pv.is_active,
        u.name AS unit_name, u.short_code AS unit_short_code
     FROM product_variants pv
     LEFT JOIN units u ON u.unit_id = pv.unit_id
     WHERE pv.product_id = :id`,
    { id: productId },
  );
  const variants = (vRows || []).map((v) => ({
    variant_id: v.variant_id,
    variant_name: v.variant_name,
    variant_sku: v.sku,
    sku: v.sku,
    unit_id: v.unit_id ?? null,
    base_unit_id: v.base_unit_id ?? null,
    package_unit_id: v.package_unit_id ?? null,
    unit: v.unit_name || v.unit_short_code || null,
    price_per_unit: v.price_per_unit,
    price_per_package: v.price_per_package,
    unit_price: v.price_per_unit,
    package_price: v.price_per_package,
  }));
  const first = variants[0];
  const row = rows[0] || {};
  res.json({
    ...row,
    sku: first?.sku ?? null,
    unit_id: null,
    unit: first?.unit ?? null,
    product_type: null,
    cost_price: null,
    selling_price: first ? (first.price_per_unit ?? first.price_per_package) : (row.selling_price ?? null),
    reorder_level: null,
    reorder_quantity: null,
    variants,
  });
});

const archiveProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [existing] = await pool.execute(
    "SELECT product_id FROM products WHERE product_id = :id",
    { id: Number(id) },
  );

  if (!existing.length) {
    return res.status(404).json({ error: "Product not found" });
  }

  await pool.execute(
    "UPDATE products SET is_active = 0 WHERE product_id = :id",
    { id: Number(id) },
  );

  res.status(204).send();
});

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct,
};

