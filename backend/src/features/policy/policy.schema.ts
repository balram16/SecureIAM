import { z } from 'zod';
import { ALL_ACTIONS } from '../../config/constants';

const statementSchema = z.object({
  Effect: z.enum(['Allow', 'Deny'], {
    message: "Effect must be exactly 'Allow' or 'Deny'."
  }),
  
  Action: z.array(
    z.string().refine(val => ALL_ACTIONS.includes(val), {
      message: "Action is not a valid permission in this system."
    })
  ).refine(val => val.length > 0, {
    message: "Action must be a non-empty array of strings."
  }),
  
  Resource: z.array(z.string().min(1, 'Resource cannot be empty.'))
    .min(1, 'Resource must contain at least one selector.')
});

export const createPolicySchema = z.object({
  name: z.string().trim().min(1, 'Policy name is required.'),
  
  type: z.enum(['MANAGED', 'INLINE'], {
    message: "Type must be either 'MANAGED' or 'INLINE'."
  }),
  
  description: z.string().trim().optional().nullable(),
  
  statements: z.array(statementSchema).refine(val => val.length > 0, {
    message: 'Statements array cannot be empty.'
  }),
  
  userId: z.string().uuid('User ID must be a valid UUID.').optional().nullable(),
  
  groupId: z.string().uuid('Group ID must be a valid UUID.').optional().nullable()
});

export const updatePolicySchema = z.object({
  name: z.string().trim().min(1, 'Policy name must be a non-empty string.').optional(),
  description: z.string().trim().optional().nullable(),
  statements: z.array(statementSchema).refine(val => val.length > 0, {
    message: 'Statements array cannot be empty.'
  }).optional()
});
