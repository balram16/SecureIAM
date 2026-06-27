/**
 * Sends a consistent success response.
 * @param {object} res Express response object
 * @param {number} statusCode HTTP status code
 * @param {any} data Payload to return in the 'data' field
 */
const successResponse = (res, statusCode = 200, data = null) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

/**
 * Sends a consistent error response.
 * @param {object} res Express response object
 * @param {number} statusCode HTTP status code
 * @param {string} message Error message/reason
 */
const errorResponse = (res, statusCode = 500, message = 'Internal Server Error') => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = {
  successResponse,
  errorResponse
};
