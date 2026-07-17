import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim()
    .min(1, 'Name is required.')
    .min(2, 'Name must be at least 2 characters long.'),
  
  email: z.string().trim()
    .min(1, 'Email is required.')
    .email('Invalid email address format.'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[0-9]/, 'Password must contain at least one digit (0-9).')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (e.g., !@#$%^&*).'),

  policyIds: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
  boundaryPolicyId: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().trim()
    .min(1, 'Email is required.')
    .email('Invalid email address format.'),
  
  password: z.string()
    .min(1, 'Password is required.'),
});

export const refreshSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required.'),
});
