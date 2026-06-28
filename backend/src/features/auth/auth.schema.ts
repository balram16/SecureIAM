import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim()
    .min(1, 'Name is required.')
    .min(2, 'Name must be at least 2 characters long.'),
  
  email: z.string().trim()
    .min(1, 'Email is required.')
    .email('Invalid email address format.'),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters long.'),
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
