"use strict";

const express = require("express");
const { auth } = require("../src/middleware/auth");

const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct,
} = require("../controllers/catalogController");
const { listCategories } = require("../controllers/categoriesController");
const toolCategories = require("../controllers/toolCategoriesController");
const tools = require("../controllers/toolsController");

const router = express.Router();

// All catalog routes require authentication so company_id/branch_id can be taken from req.user
router.use(auth);

router.get("/products", listProducts);
router.get("/products/:id", getProductById);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", archiveProduct);

router.get("/categories", listCategories);

// Tool categories
router.get("/tool-categories", toolCategories.list);
router.get("/tool-categories/:id", toolCategories.getById);
router.post("/tool-categories", toolCategories.create);
router.put("/tool-categories/:id", toolCategories.update);
router.delete("/tool-categories/:id", toolCategories.remove);

// Tools
router.get("/tools", tools.list);
router.get("/tools/:id", tools.getById);
router.post("/tools", tools.create);
router.put("/tools/:id", tools.update);
router.delete("/tools/:id", tools.remove);

module.exports = router;

