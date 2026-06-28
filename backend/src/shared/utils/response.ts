import { Response } from 'express';

/**
 * Sends a consistent success response.
 * @param res Express response object
 * @param statusCode HTTP status code
 * @param data Payload to return in the 'data' field
 */
export const successResponse = (res: Response, statusCode: number = 200, data: any = null): Response => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

/**
 * Sends a consistent error response.
 * @param res Express response object
 * @param statusCode HTTP status code
 * @param message Error message/reason
 */
export const errorResponse = (res: Response, statusCode: number = 500, message: string = 'Internal Server Error'): Response => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};
