import { Request, Response } from 'express';
import * as policyService from './policy.service';
import { successResponse, errorResponse } from '../../shared/utils/response';

export const createPolicy = async (req: Request, res: Response) => {
  try {
    const { name, type, description, statements, userId, groupId } = req.body;

    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const newPolicy = await policyService.createPolicy(req.user, {
      name: name.trim(),
      type,
      description: description ? description.trim() : null,
      statements,
      userId,
      groupId
    });

    return successResponse(res, 201, newPolicy);
  } catch (error: any) {
    console.error('Create policy controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to create policy.');
  }
};

export const listPolicies = async (req: Request, res: Response) => {
  try {
    const policies = await policyService.getAllPolicies();
    return successResponse(res, 200, policies);
  } catch (error: any) {
    console.error('List policies controller error:', error);
    return errorResponse(res, 500, 'Failed to retrieve policies.');
  }
};

export const getPolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const policy = await policyService.getPolicyById(id);
    return successResponse(res, 200, policy);
  } catch (error: any) {
    console.error('Get policy controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to retrieve policy.');
  }
};

export const updatePolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, description, statements } = req.body;

    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const updatedPolicy = await policyService.updatePolicy(req.user, id, {
      name: name ? name.trim() : undefined,
      description,
      statements
    });

    return successResponse(res, 200, updatedPolicy);
  } catch (error: any) {
    console.error('Update policy controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to update policy.');
  }
};

export const deletePolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const result = await policyService.deletePolicy(req.user, id);
    return successResponse(res, 200, result);
  } catch (error: any) {
    console.error('Delete policy controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to delete policy.');
  }
};
