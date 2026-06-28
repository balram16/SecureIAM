import { z } from 'zod';

export const attachPolicySchema = z.object({
  policyId: z.string().uuid('Policy ID must be a valid UUID.'),
});

export const putBoundarySchema = z.object({
  policyId: z.string().uuid('Policy ID must be a valid UUID.'),
});
