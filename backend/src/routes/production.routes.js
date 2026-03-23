"use strict";

const express = require("express");
const { auth } = require("../middleware/auth");
const { tenancy } = require("../middleware/tenancy");
const {
  listBomDefinitions,
  listBom,
  createBom,
  deleteBom,
  createBomItem,
  updateBomItem,
  deleteBomItem,
  listBomItems,
} = require("../controllers/production.controller");

const router = express.Router();

router.use(auth);
router.use(tenancy);

// BOMs
router.get("/bom-definitions", listBomDefinitions);
router.get("/bom", listBom); // legacy endpoint used by frontend
router.post("/boms", createBom);
router.delete("/boms/:id", deleteBom);

// BOM Items
router.get("/bom-items", listBomItems);
router.post("/bom-items", createBomItem);
router.put("/bom-items/:id", updateBomItem);
router.delete("/bom-items/:id", deleteBomItem);

module.exports = router;

