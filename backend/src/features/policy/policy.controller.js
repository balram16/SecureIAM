const policyService = require('./policy.service');
const { successResponse, errorResponse } = require('../../shared/utils/response');

const createPolicy = async (req, res) => {
  try {
    const { name, type, description, statements, userId, groupId } = req.body;

    if (!name || typeof name !== 'string') {
      return errorResponse(res, 400, 'Policy name is required.');
    }
    if (!type || typeof type !== 'string') {
      return errorResponse(res, 400, 'Policy type is required.');
    }
    if (!statements || !Array.isArray(statements)) {
      return errorResponse(res, 400, 'Policy statements must be provided in an array.');
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
  } catch (error) {
    console.error('Create policy controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to create policy.');
  }
};

const listPolicies = async (req, res) => {
  try {
    const policies = await policyService.getAllPolicies();
    return successResponse(res, 200, policies);
  } catch (error) {
    console.error('List policies controller error:', error);
    return errorResponse(res, 500, 'Failed to retrieve policies.');
  }
};

const getPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await policyService.getPolicyById(id);
    return successResponse(res, 200, policy);
  } catch (error) {
    console.error('Get policy controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to retrieve policy.');
  }
};

const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, statements } = req.body;

    const updatedPolicy = await policyService.updatePolicy(req.user, id, {
      name: name ? name.trim() : undefined,
      description,
      statements
    });

    return successResponse(res, 200, updatedPolicy);
  } catch (error) {
    console.error('Update policy controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to update policy.');
  }
};

const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await policyService.deletePolicy(req.user, id);
    return successResponse(res, 200, result);
  } catch (error) {
    console.error('Delete policy controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Failed to delete policy.');
  }
};

module.exports = {
  createPolicy,
  listPolicies,
  getPolicy,
  updatePolicy,
  deletePolicy
};
