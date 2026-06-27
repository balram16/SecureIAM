const { evaluatePermission } = require('../shared/utils/permission.utils');
const { errorResponse } = require('../shared/utils/response');

/**
 * Higher-order middleware to enforce IAM permissions for a specific action.
 * Must be registered AFTER authMiddleware.
 *
 * @param {string} action - The action string to check (e.g. 'reports:List')
 */
const iamMiddleware = (action) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return errorResponse(res, 401, 'User must be authenticated before checking IAM permissions.');
      }

      const isAllowed = evaluatePermission(req.user, action);

      if (!isAllowed) {
        return errorResponse(res, 403, `Forbidden: You do not have permission to perform ${action}.`);
      }

      next();
    } catch (error) {
      console.error(`IAM middleware error for action ${action}:`, error);
      return errorResponse(res, 500, 'Authorization evaluation error.');
    }
  };
};

module.exports = iamMiddleware;
