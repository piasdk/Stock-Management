"use strict";

/**
 * Global Error Handler Middleware
 * Should be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Safely log error without causing serialization issues
  try {
    console.error("Error occurred:", {
      message: err?.message,
      code: err?.code,
      name: err?.name,
      sqlMessage: err?.sqlMessage,
      stack: err?.stack,
    });
  } catch (logError) {
    console.error("Error logging failed:", logError);
  }

  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Default error
  let status = 500;
  let message = "Internal server error";
  let details = null;

  // Safely extract error properties
  try {
    if (err && typeof err === "object") {
      status = err.status || err.statusCode || 500;
      if (err.message && typeof err.message === "string") {
        message = err.message;
      }
    } else if (typeof err === "string") {
      message = err;
    }
  } catch (e) {
    // Use defaults if extraction fails
  }

  // MySQL errors - safely check error code
  try {
    const errorCode = err && typeof err === "object" && "code" in err ? err.code : null;
    if (errorCode === "ER_DUP_ENTRY") {
      status = 409;
      // Extract meaningful message from SQL error
      const sqlMsg = err.sqlMessage || "";
      if (sqlMsg.includes("suppliers") && sqlMsg.includes("name")) {
        message = "A supplier with this name already exists for your company";
      } else if (sqlMsg.includes("suppliers")) {
        message = "A supplier with these details already exists";
      } else {
        message = "Duplicate entry: This record already exists";
      }
      details = sqlMsg || null;
    } else if (errorCode === "ER_NO_REFERENCED_ROW_2") {
      status = 400;
      message = "Referenced record does not exist";
      details = err.sqlMessage || null;
    } else if (errorCode === "ER_BAD_FIELD_ERROR") {
      status = 400;
      message = "Database schema error: column does not exist";
      details = err.sqlMessage || null;
    } else if (errorCode === "ER_ROW_IS_REFERENCED_2") {
      status = 409;
      message = "Cannot delete: record is referenced by other records";
      details = err.sqlMessage || null;
    } else if (errorCode === "ER_NO_SUCH_TABLE") {
      status = 500;
      message = err.sqlMessage || "Database table does not exist";
    } else if (errorCode === "ER_BAD_FIELD_ERROR") {
      status = 500;
      message = err.sqlMessage || "Database column error";
    }
  } catch (e) {
    // Ignore if checking error code causes issues
  }

  // Validation errors
  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation error";
    try {
      if (err.details && typeof err.details === "object") {
        details = err.details;
      } else if (err.errors && typeof err.errors === "object") {
        details = err.errors;
      } else if (err.details) {
        details = String(err.details);
      }
    } catch (e) {
      // Ignore details if it causes issues
    }
  }

  // JWT errors - safely check error name
  try {
    const errorName = err && typeof err === "object" && "name" in err ? err.name : null;
    if (errorName === "JsonWebTokenError") {
      status = 401;
      message = "Invalid token";
    } else if (errorName === "TokenExpiredError") {
      status = 401;
      message = "Token expired";
    }
  } catch (e) {
    // Ignore if checking error name causes issues
  }

  // Send error response - ensure all values are serializable
  const response = {
    error: String(message),
  };

  try {
    if (process.env.NODE_ENV === "development" && err.stack && typeof err.stack === "string") {
      response.stack = err.stack;
    }
  } catch (e) {
    // Ignore if stack causes issues
  }

  try {
    if (details !== null && details !== undefined) {
      if (typeof details === "object" && !Array.isArray(details)) {
        response.details = details;
      } else if (Array.isArray(details)) {
        response.details = details;
      } else {
        response.details = String(details);
      }
    }
  } catch (e) {
    // Ignore if details causes issues
  }

  // Add MySQL error codes for debugging - safely
  try {
    if (err && typeof err === "object" && "code" in err && err.code) {
      response.code = String(err.code);
    }
    if (err && typeof err === "object" && "sqlMessage" in err && err.sqlMessage && typeof err.sqlMessage === "string") {
      response.sqlMessage = err.sqlMessage;
    }
  } catch (e) {
    // Ignore if adding error codes causes issues
  }

  // Ensure response is sent - catch any JSON serialization errors
  try {
    if (!res.headersSent) {
      // Try JSON first
      res.status(status).json(response);
      console.log("Error response sent:", { status, message });
    } else {
      console.log("Response headers already sent, cannot send error response");
    }
  } catch (sendError) {
    console.error("Failed to send JSON error response:", sendError);
    // Last resort - try to send a plain text response
    try {
      if (!res.headersSent) {
        res.status(status).type('text/plain').send(`Error: ${message}`);
        console.log("Sent plain text error response");
      }
    } catch (finalError) {
      console.error("Failed to send any error response:", finalError);
      // If we still can't send, at least log it
      console.error("Original error was:", message);
    }
  }
};

module.exports = errorHandler;

