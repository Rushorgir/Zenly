/**
 * Centralized error handling middleware
 * Should be added as the last middleware in the chain
 */

export const errorHandler = (err, req, res, _next) => {
    console.error("Error:", err);

    // Mongoose validation error
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ 
            error: "Validation failed", 
            errors 
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({ 
            error: `${field} already exists` 
        });
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === "CastError") {
        return res.status(400).json({ 
            error: "Invalid ID format" 
        });
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ 
            error: "Invalid token" 
        });
    }

    if (err.name === "TokenExpiredError") {
        return res.status(401).json({ 
            error: "Token expired",
            code: "TOKEN_EXPIRED"
        });
    }

    // Default error
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";

    res.status(statusCode).json({ 
        error: message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({ 
        error: "Route not found",
        path: req.originalUrl 
    });
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default errorHandler;
