import { sanitizeUrl, sanitizeUrlSubstrings } from '../utils/sanitize.js';

/**
 * Express middleware to sanitize specific fields in req.body.
 * 
 * @param {Object} config - Config object containing field names to sanitize.
 * @param {string[]} [config.urlFields] - Array of fields that contain direct URLs (e.g., avatarUrl).
 * @param {string[]} [config.textFields] - Array of fields that contain text/markdown with potential URLs (e.g., content).
 */
export const sanitizePayload = (config = {}) => {
  return (req, res, next) => {
    const { urlFields = [], textFields = [] } = config;

    if (req.body) {
      // Sanitize direct URL fields
      urlFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          req.body[field] = sanitizeUrl(req.body[field]);
        }
      });

      // Sanitize general text fields that may contain markdown links or loose URLs
      textFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          req.body[field] = sanitizeUrlSubstrings(req.body[field]);
        }
      });
    }

    next();
  };
};

export default sanitizePayload;
