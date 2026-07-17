import { z } from 'zod';

export const attachPolicySchema = z.object({
  policyId: z.string().uuid('Policy ID must be a valid UUID.'),
  duration: z.number().optional(),
  expiresAt: z.string().optional(),
});

export const putBoundarySchema = z.object({
  policyId: z.string().uuid('Policy ID must be a valid UUID.'),
});
