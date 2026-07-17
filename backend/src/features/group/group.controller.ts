import { Request, Response } from 'express';
import * as groupService from './group.service';
import { successResponse, errorResponse } from '../../shared/utils/response';

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const newGroup = await groupService.createGroup(req.user, {
      name: name.trim(),
      description: description ? description.trim() : null
    });

    return successResponse(res, 201, newGroup);
  } catch (error: any) {
    console.error('Create group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to create group.');
  }
};

export const listGroups = async (req: Request, res: Response) => {
  try {
    const groups = await groupService.getAllGroups();
    return successResponse(res, 200, groups);
  } catch (error: any) {
    console.error('List groups controller error:', error);
    return errorResponse(res, 500, 'Failed to retrieve groups.');
  }
};

export const getGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const group = await groupService.getGroupById(id);
    return successResponse(res, 200, group);
  } catch (error: any) {
    console.error('Get group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to retrieve group.');
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, description } = req.body;

    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const updatedGroup = await groupService.updateGroup(req.user, id, {
      name: name ? name.trim() : undefined,
      description
    });

    return successResponse(res, 200, updatedGroup);
  } catch (error: any) {
    console.error('Update group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to update group.');
  }
};

export const deleteGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const result = await groupService.deleteGroup(req.user, id);
    return successResponse(res, 200, result);
  } catch (error: any) {
    console.error('Delete group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to delete group.');
  }
};

export const addUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string }; // Group ID
    const { userId } = req.body;

    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const membership = await groupService.addUserToGroup(req.user, {
      groupId: id,
      userId
    });

    return successResponse(res, 200, membership);
  } catch (error: any) {
    console.error('Add user to group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to add user to group.');
  }
};

export const removeUser = async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params as { id: string, userId: string };
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const result = await groupService.removeUserFromGroup(req.user, {
      groupId: id,
      userId
    });
    return successResponse(res, 200, result);
  } catch (error: any) {
    console.error('Remove user from group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to remove user from group.');
  }
};

export const attachPolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { policyId } = req.body;

    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const attachment = await groupService.attachPolicyToGroup(req.user, {
      groupId: id,
      policyId
    });

    return successResponse(res, 200, attachment);
  } catch (error: any) {
    console.error('Attach policy to group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to attach policy to group.');
  }
};

export const detachPolicy = async (req: Request, res: Response) => {
  try {
    const { id, policyId } = req.params as { id: string, policyId: string };
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const result = await groupService.detachPolicyFromGroup(req.user, {
      groupId: id,
      policyId
    });
    return successResponse(res, 200, result);
  } catch (error: any) {
    console.error('Detach policy from group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to detach policy from group.');
  }
};
