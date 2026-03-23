"use strict";

const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");

/**
 * POST /api/auth/signup
 * Register a new user and company
 */
const signup = asyncHandler(async (req, res) => {
  // Accept both camelCase and snake_case for compatibility
  const { 
    email, 
    password, 
    firstName, 
    lastName, 
    first_name, 
    last_name, 
    phone, 
    company,
    invitation_token,
    company_id
  } = req.body;

  // Use snake_case if provided, otherwise use camelCase
  const finalFirstName = first_name || firstName;
  const finalLastName = last_name || lastName;

  // For invitation signup, only email and password are required
  if (invitation_token) {
    if (!email || !password) {
      return res.status(400).json({
        error: "Missing required fields: email, password",
      });
    }
  } else {
    // For regular signup, firstName and lastName are required
    if (!email || !password || !finalFirstName || !finalLastName) {
      return res.status(400).json({
        error: "Missing required fields: email, password, firstName (or first_name), lastName (or last_name)",
      });
    }
  }

  const result = await authService.signup({
    email,
    password,
    first_name: finalFirstName,
    last_name: finalLastName,
    phone,
    company,
    invitation_token,
    company_id,
  });

  res.status(201).json(result);
});

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
const login = asyncHandler(async (req, res) => {
  console.log("Login request received:", { email: req.body?.email });
  
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required",
    });
  }

  console.log("Calling authService.login...");
  const result = await authService.login(email, password);
  console.log("Login service returned result:", !!result);

  if (!result) {
    return res.status(401).json({
      error: "Invalid email or password",
    });
  }

  console.log("Sending success response");
  res.json(result);
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token clearing, but can be used for server-side cleanup)
 */
const logout = asyncHandler(async (req, res) => {
  // For JWT tokens, logout is primarily client-side
  // But we can use this endpoint for server-side session cleanup if needed
  res.json({
    message: "Logged out successfully",
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(400).json({ error: "User context missing" });
  }

  const profile = await authService.getProfile(userId);
  if (!profile) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(profile);
});

module.exports = {
  signup,
  login,
  logout,
  getProfile,
};
