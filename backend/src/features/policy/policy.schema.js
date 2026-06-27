const { z } = require('zod');
const { ALL_ACTIONS, POLICY_TYPES, EFFECT_TYPES } = require('../../config/constants');

const statementSchema = z.object({
  Effect: z.enum([EFFECT_TYPES.ALLOW, EFFECT_TYPES.DENY], {
    errorMap: () => ({ message: `Effect must be exactly '${EFFECT_TYPES.ALLOW}' or '${EFFECT_TYPES.DENY}'.` })
  }),
  
  Action: z.array(
    z.string().refine(val => ALL_ACTIONS.includes(val), {
      message: "Action is not a valid permission in this system."
    })
  ).nonempty("Action must be a non-empty array of strings."),
  
  Resource: z.array(z.string())
    .length(1, 'Resource must be exactly ["*"].')
    .refine(val => val[0] === '*', {
      message: 'Resource must be exactly ["*"].'
    })
});

const createPolicySchema = z.object({
  name: z.string({
    required_error: 'Policy name is required.',
  }).trim().min(1, 'Policy name is required.'),
  
  type: z.enum([POLICY_TYPES.MANAGED, POLICY_TYPES.INLINE], {
    errorMap: () => ({ message: `Type must be either '${POLICY_TYPES.MANAGED}' or '${POLICY_TYPES.INLINE}'.` })
  }),
  
  description: z.string().trim().optional().nullable(),
  
  statements: z.array(statementSchema).nonempty('Statements array cannot be empty.'),
  
  userId: z.string().uuid('User ID must be a valid UUID.').optional().nullable(),
  
  groupId: z.string().uuid('Group ID must be a valid UUID.').optional().nullable()
});

const updatePolicySchema = z.object({
  name: z.string().trim().min(1, 'Policy name must be a non-empty string.').optional(),
  description: z.string().trim().optional().nullable(),
  statements: z.array(statementSchema).nonempty('Statements array cannot be empty.').optional()
});

module.exports = {
  createPolicySchema,
  updatePolicySchema,
};
