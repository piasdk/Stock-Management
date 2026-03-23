"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../db/pool");
const asyncHandler = require("../utils/asyncHandler");

const { JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required for authentication");
}

const generateToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
  });

const sanitizeUser = (user) => {
  const {
    password_hash,
    ...safe
  } = user;
  return safe;
};

const signup = asyncHandler(async (req, res) => {
  const { company_id, full_name, email, password } = req.body;

  if (!company_id || !full_name || !email || !password) {
    return res.status(400).json({
      error: "company_id, full_name, email, and password are required",
    });
  }

  const [existing] = await pool.execute(
    "SELECT user_id FROM users WHERE email = :email",
    { email }
  );

  if (existing.length) {
    return res.status(409).json({ error: "User with this email already exists" });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    `
      INSERT INTO users (
        company_id,
        full_name,
        email,
        password_hash,
        is_super_admin,
        status
      ) VALUES (
        :company_id,
        :full_name,
        :email,
        :password_hash,
        0,
        'active'
      )
    `,
    {
      company_id,
      full_name,
      email,
      password_hash,
    }
  );

  const [rows] = await pool.execute(
    "SELECT user_id, company_id, full_name, email, is_super_admin, status, created_at FROM users WHERE user_id = :id",
    { id: result.insertId }
  );

  const user = rows[0];
  const token = generateToken({
    user_id: user.user_id,
    company_id: user.company_id,
    email: user.email,
  });

  res.status(201).json({ user: sanitizeUser(user), token });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = :email",
    { email }
  );

  if (!rows.length) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken({
    user_id: user.user_id,
    company_id: user.company_id,
    email: user.email,
  });

  res.json({ user: sanitizeUser(user), token });
});

module.exports = {
  signup,
  login,
};
