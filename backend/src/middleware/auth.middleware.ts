import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { errorResponse } from '../shared/utils/response';
import { UserWithPolicies } from '../types';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Access token is missing or invalid.');
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_9876543210');
    } catch (err) {
      return errorResponse(res, 401, 'Invalid or expired access token.');
    }

    // Fetch user details including policies, memberships (with group policies), and boundaries
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        policies: {
          include: {
            policy: true
          }
        },
        memberships: {
          include: {
            group: {
              include: {
                policies: {
                  include: {
                    policy: true
                  }
                }
              }
            }
          }
        },
        boundary: {
          include: {
            policy: true
          }
        }
      }
    }) as UserWithPolicies | null;

    if (!user) {
      return errorResponse(res, 401, 'Authenticated user not found.');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return errorResponse(res, 500, 'Authentication error.');
  }
};

export default authMiddleware;
