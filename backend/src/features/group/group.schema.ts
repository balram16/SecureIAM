import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required.'),
  description: z.string().trim().optional().nullable(),
});

export const addUserSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID.'),
});

export const attachPolicySchema = z.object({
  policyId: z.string().uuid('Policy ID must be a valid UUID.'),
  duration: z.number().optional(),
  expiresAt: z.string().optional(),
});
