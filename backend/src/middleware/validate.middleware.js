const { errorResponse } = require('../shared/utils/response');

/**
 * Middleware wrapper to validate request payload against a Zod schema.
 * Rejects with 400 Bad Request if validation fails.
 *
 * @param {object} schema - The Zod schema to validate against
 */
const validate = (schema) => {
  return (req, res, next) => {
    const parse = schema.safeParse(req.body);
    
    if (!parse.success) {
      // Gather all error messages and combine them into a single string
      const message = parse.error.errors.map(err => err.message).join(', ');
      return errorResponse(res, 400, message);
    }
    
    // Replace req.body with the successfully parsed & typed data
    req.body = parse.data;
    next();
  };
};

module.exports = validate;
