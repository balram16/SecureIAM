import { Request, Response } from 'express';
import * as userService from './user.service';
import { successResponse, errorResponse } from '../../shared/utils/response';

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    return successResponse(res, 200, users);
  } catch (error: any) {
    console.error('List users controller error:', error);
    return errorResponse(res, 500, 'Failed to retrieve users.');
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const resourceTarget = (req.query.resource as string) || '*';
    const profile = await userService.getUserProfile(id, resourceTarget);
    return successResponse(res, 200, profile);
  } catch (error: any) {
    console.error('Get user profile controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to retrieve user profile.');
  }
};

export const attachPolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string }; // User ID
    const { policyId, duration, expiresAt: bodyExpiresAt } = req.body; // duration or explicit expiresAt

    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const expiresAt = bodyExpiresAt 
      ? new Date(bodyExpiresAt).toISOString()
      : duration 
        ? new Date(Date.now() + duration * 60 * 1000).toISOString() 
        : null;

    const attachment = await userService.attachPolicyToUser(req.user, {
      userId: id,
      policyId,
      expiresAt
    });

    return successResponse(res, 200, attachment);
  } catch (error: any) {
    console.error('Attach policy to user controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to attach policy.');
  }
};

export const detachPolicy = async (req: Request, res: Response) => {
  try {
    const { id, policyId } = req.params as { id: string, policyId: string };
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }
    const result = await userService.detachPolicyFromUser(req.user, {
      userId: id,
      policyId
    });
    return successResponse(res, 200, result);
  } catch (error: any) {
    console.error('Detach policy from user controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to detach policy.');
  }
};

export const putBoundary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { policyId } = req.body;

    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const boundary = await userService.putUserBoundary(req.user, {
      userId: id,
      policyId
    });

    return successResponse(res, 200, boundary);
  } catch (error: any) {
    console.error('Put user boundary controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to set boundary.');
  }
};

export const deleteBoundary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const result = await userService.deleteUserBoundary(req.user, {
      userId: id
    });
    return successResponse(res, 200, result);
  } catch (error: any) {
    console.error('Delete user boundary controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to remove boundary.');
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const result = await userService.deleteUser(req.user, id);
    return successResponse(res, 200, result);
  } catch (error: any) {
    console.error('Delete user controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to delete user.');
  }
};
