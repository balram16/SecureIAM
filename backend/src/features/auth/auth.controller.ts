import { Request, Response } from 'express';
import * as authService from './auth.service';
import { successResponse, errorResponse } from '../../shared/utils/response';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, policyIds, groupIds, boundaryPolicyId } = req.body;

    const newUser = await authService.registerUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      policyIds,
      groupIds,
      boundaryPolicyId
    });

    return successResponse(res, 201, newUser);
  } catch (error: any) {
    console.error('Registration controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Registration failed.');
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const { token, refreshToken, user } = await authService.loginUser({
      email: email.trim().toLowerCase(),
      password
    });

    return successResponse(res, 200, { token, refreshToken, user });
  } catch (error: any) {
    console.error('Login controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Login failed.');
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return errorResponse(res, 400, 'Refresh token is required.');
    }

    const result = await authService.refreshAccessToken(refreshToken);
    return successResponse(res, 200, result);
  } catch (error: any) {
    console.error('Token refresh controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Token refresh failed.');
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    if (req.user) {
      await authService.logoutUser(req.user.id);
    }
    return successResponse(res, 200, { message: 'Logged out successfully.' });
  } catch (error: any) {
    console.error('Logout controller error:', error);
    return errorResponse(res, 500, 'Logout failed.');
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, 'Unauthorized');
    }

    const userProfile = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      isRoot: req.user.isRoot,
      createdAt: req.user.createdAt
    };

    return successResponse(res, 200, userProfile);
  } catch (error: any) {
    console.error('Profile fetch controller error:', error);
    return errorResponse(res, 500, 'Failed to retrieve profile.');
  }
};
