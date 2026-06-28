import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse } from '../shared/utils/response';

/**
 * Middleware wrapper to validate request payload against a Zod schema.
 * Rejects with 400 Bad Request if validation fails.
 *
 * @param schema - The Zod schema to validate against
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parse = schema.safeParse(req.body);
    
    if (!parse.success) {
      const err = parse.error as ZodError;
      // Gather all error messages and combine them into a single string
      const message = err.issues.map((issue) => issue.message).join(', ');
      return errorResponse(res, 400, message);
    }
    
    // Replace req.body with the successfully parsed & typed data
    req.body = parse.data;
    next();
  };
};

export default validate;
