const groupService = require('./group.service');
const { successResponse, errorResponse } = require('../../shared/utils/response');

const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string') {
      return errorResponse(res, 400, 'Group name is required.');
    }

    const newGroup = await groupService.createGroup({
      name: name.trim(),
      description: description ? description.trim() : null
    });

    return successResponse(res, 201, newGroup);
  } catch (error) {
    console.error('Create group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to create group.');
  }
};

const listGroups = async (req, res) => {
  try {
    const groups = await groupService.getAllGroups();
    return successResponse(res, 200, groups);
  } catch (error) {
    console.error('List groups controller error:', error);
    return errorResponse(res, 500, 'Failed to retrieve groups.');
  }
};

const getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await groupService.getGroupById(id);
    return successResponse(res, 200, group);
  } catch (error) {
    console.error('Get group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to retrieve group.');
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const updatedGroup = await groupService.updateGroup(id, {
      name: name ? name.trim() : undefined,
      description
    });

    return successResponse(res, 200, updatedGroup);
  } catch (error) {
    console.error('Update group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to update group.');
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await groupService.deleteGroup(id);
    return successResponse(res, 200, result);
  } catch (error) {
    console.error('Delete group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to delete group.');
  }
};

const addUser = async (req, res) => {
  try {
    const { id } = req.params; // Group ID
    const { userId } = req.body;

    if (!userId) {
      return errorResponse(res, 400, 'User ID is required.');
    }

    const membership = await groupService.addUserToGroup({
      groupId: id,
      userId
    });

    return successResponse(res, 200, membership);
  } catch (error) {
    console.error('Add user to group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to add user to group.');
  }
};

const removeUser = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const result = await groupService.removeUserFromGroup({
      groupId: id,
      userId
    });
    return successResponse(res, 200, result);
  } catch (error) {
    console.error('Remove user from group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to remove user from group.');
  }
};

const attachPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { policyId } = req.body;

    if (!policyId) {
      return errorResponse(res, 400, 'Policy ID is required.');
    }

    const attachment = await groupService.attachPolicyToGroup(req.user, {
      groupId: id,
      policyId
    });

    return successResponse(res, 200, attachment);
  } catch (error) {
    console.error('Attach policy to group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to attach policy to group.');
  }
};

const detachPolicy = async (req, res) => {
  try {
    const { id, policyId } = req.params;
    const result = await groupService.detachPolicyFromGroup({
      groupId: id,
      policyId
    });
    return successResponse(res, 200, result);
  } catch (error) {
    console.error('Detach policy from group controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to detach policy from group.');
  }
};

module.exports = {
  createGroup,
  listGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  addUser,
  removeUser,
  attachPolicy,
  detachPolicy
};
