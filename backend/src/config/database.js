"use strict";

const mysql = require("mysql2/promise");

const {
  DB_HOST,
  DB_PORT = 3306,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

if (!DB_HOST || !DB_USER || !DB_NAME) {
  throw new Error(
    "Database configuration missing. Ensure DB_HOST, DB_USER, and DB_NAME are set.",
  );
}

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test the connection on startup
pool
  .getConnection()
  .then((connection) => {
    console.log("DB connection pool created successfully");
    connection.release(); // Release the connection back to the pool
  })
  .catch((err) => {
    console.error("DB connection pool failed:", err.message);
  });

// Handle pool errors
pool.on("error", (err) => {
  console.error("Database pool error:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("Database connection was closed.");
  }
  if (err.code === "ER_CON_COUNT_ERROR") {
    console.log("Database has too many connections.");
  }
  if (err.code === "ECONNREFUSED") {
    console.log("Database connection was refused.");
  }
});

module.exports = pool;

