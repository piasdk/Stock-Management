"use strict";

/**
 * Simple validation middleware
 * Can be extended with express-validator later
 */

/**
 * Validate required fields in request body
 * @param {Array} fields - Array of required field names
 * @returns {Function} Middleware function
 */
const requireFields = (fields) => {
  return (req, res, next) => {
    const missing = fields.filter((field) => !req.body[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missing,
      });
    }

    next();
  };
};

/**
 * Validate email format
 * @param {String} field - Field name containing email
 * @returns {Function} Middleware function
 */
const validateEmail = (field = "email") => {
  return (req, res, next) => {
    const email = req.body[field];
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "Invalid email format",
          field,
        });
      }
    }
    next();
  };
};

/**
 * Validate numeric field
 * @param {String} field - Field name
 * @param {Object} options - { min, max }
 * @returns {Function} Middleware function
 */
const validateNumber = (field, options = {}) => {
  return (req, res, next) => {
    const value = req.body[field];
    if (value !== undefined && value !== null) {
      const num = Number(value);
      if (isNaN(num)) {
        return res.status(400).json({
          error: `Field ${field} must be a number`,
        });
      }
      if (options.min !== undefined && num < options.min) {
        return res.status(400).json({
          error: `Field ${field} must be at least ${options.min}`,
        });
      }
      if (options.max !== undefined && num > options.max) {
        return res.status(400).json({
          error: `Field ${field} must be at most ${options.max}`,
        });
      }
    }
    next();
  };
};

module.exports = {
  requireFields,
  validateEmail,
  validateNumber,
};

