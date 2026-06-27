const { z } = require('zod');

const createGroupSchema = z.object({
  name: z.string({
    required_error: 'Group name is required.',
  }).trim().min(1, 'Group name is required.'),
  
  description: z.string().trim().optional().nullable(),
});

const addUserSchema = z.object({
  userId: z.string({
    required_error: 'User ID is required.',
  }).uuid('User ID must be a valid UUID.'),
});

const attachPolicySchema = z.object({
  policyId: z.string({
    required_error: 'Policy ID is required.',
  }).uuid('Policy ID must be a valid UUID.'),
});

module.exports = {
  createGroupSchema,
  addUserSchema,
  attachPolicySchema,
};
