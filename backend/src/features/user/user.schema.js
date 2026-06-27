const { z } = require('zod');

const attachPolicySchema = z.object({
  policyId: z.string({
    required_error: 'Policy ID is required.',
  }).uuid('Policy ID must be a valid UUID.'),
});

const putBoundarySchema = z.object({
  policyId: z.string({
    required_error: 'Policy ID is required.',
  }).uuid('Policy ID must be a valid UUID.'),
});

module.exports = {
  attachPolicySchema,
  putBoundarySchema,
};
