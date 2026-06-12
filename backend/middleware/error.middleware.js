/**
 * Centralized error handling middleware
 * Should be added as the last middleware in the chain
 */

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err);

  // Supabase/PostgreSQL validation or bad request errors
  if (err.code === 'PGRST116' || err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map((val) => val.message).join(', ') || err.message;
    return res.status(400).json({
      error: 'Validation failed',
      message
    });
  }

  // PostgreSQL duplicate key error
  if (err.code === '23505' || err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate field value entered'
    });
  }

  // Database cast error or invalid UUID
  if (err.code === '22P02' || err.name === 'CastError') {
    return res.status(400).json({
      error: 'Resource not found with invalid ID'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
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
