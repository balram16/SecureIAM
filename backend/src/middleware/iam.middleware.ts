import { Request, Response, NextFunction } from 'express';
import { evaluatePermission } from '../shared/utils/permission.utils';
import { errorResponse } from '../shared/utils/response';

/**
 * Higher-order middleware to enforce IAM permissions for a specific action.
 * Must be registered AFTER authMiddleware.
 *
 * @param action - The action string to check (e.g. 'reports:List')
 */
export const iamMiddleware = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return errorResponse(res, 401, 'User must be authenticated before checking IAM permissions.');
      }

      const namespace = action.split(':')[0];
      const targetResource = req.params.id ? `${namespace}:${req.params.id}` : '*';

      const isAllowed = evaluatePermission(req.user, action, targetResource);

      if (!isAllowed) {
        return errorResponse(res, 403, `Forbidden: You do not have permission to perform ${action} on resource ${targetResource}.`);
      }

      next();
    } catch (error) {
      console.error(`IAM middleware error for action ${action}:`, error);
      return errorResponse(res, 500, 'Authorization evaluation error.');
    }
  };
};

export default iamMiddleware;
