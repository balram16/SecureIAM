const userService = require('./user.service');
const { successResponse, errorResponse } = require('../../shared/utils/response');

const listUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return successResponse(res, 200, users);
  } catch (error) {
    console.error('List users controller error:', error);
    return errorResponse(res, 500, 'Failed to retrieve users.');
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await userService.getUserProfile(id);
    return successResponse(res, 200, profile);
  } catch (error) {
    console.error('Get user profile controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to retrieve user profile.');
  }
};

const attachPolicy = async (req, res) => {
  try {
    const { id } = req.params; // User ID
    const { policyId } = req.body;


    const attachment = await userService.attachPolicyToUser(req.user, {
      userId: id,
      policyId
    });

    return successResponse(res, 200, attachment);
  } catch (error) {
    console.error('Attach policy to user controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to attach policy.');
  }
};

const detachPolicy = async (req, res) => {
  try {
    const { id, policyId } = req.params;
    const result = await userService.detachPolicyFromUser({
      userId: id,
      policyId
    });
    return successResponse(res, 200, result);
  } catch (error) {
    console.error('Detach policy from user controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to detach policy.');
  }
};

const putBoundary = async (req, res) => {
  try {
    const { id } = req.params;
    const { policyId } = req.body;


    const boundary = await userService.putUserBoundary(req.user, {
      userId: id,
      policyId
    });

    return successResponse(res, 200, boundary);
  } catch (error) {
    console.error('Put user boundary controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to set boundary.');
  }
};

const deleteBoundary = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await userService.deleteUserBoundary(req.user, {
      userId: id
    });
    return successResponse(res, 200, result);
  } catch (error) {
    console.error('Delete user boundary controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to remove boundary.');
  }
};

module.exports = {
  listUsers,
  getUser,
  attachPolicy,
  detachPolicy,
  putBoundary,
  deleteBoundary
};
