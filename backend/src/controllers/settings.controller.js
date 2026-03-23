"use strict";

const asyncHandler = require("../utils/asyncHandler");
const settingsService = require("../services/settings.service");

/**
 * GET /api/settings
 * List all settings
 */
const listSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getAll(req.user);
  res.json(settings);
});

module.exports = {
  listSettings,
};

