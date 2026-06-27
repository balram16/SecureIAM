const authService = require('./auth.service');
const { successResponse, errorResponse } = require('../../shared/utils/response');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Direct input validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return errorResponse(res, 400, 'Name is required and must be a non-empty string.');
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return errorResponse(res, 400, 'A valid email is required.');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return errorResponse(res, 400, 'Password is required and must be at least 6 characters long.');
    }

    const newUser = await authService.registerUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password
    });

    return successResponse(res, 201, newUser);
  } catch (error) {
    console.error('Registration controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Registration failed.');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string') {
      return errorResponse(res, 400, 'Email is required.');
    }
    if (!password || typeof password !== 'string') {
      return errorResponse(res, 400, 'Password is required.');
    }

    const { token, user } = await authService.loginUser({
      email: email.trim().toLowerCase(),
      password
    });

    return successResponse(res, 200, { token, user });
  } catch (error) {
    console.error('Login controller error:', error);
    const status = error.statusCode || 500;
    return errorResponse(res, status, error.message || 'Login failed.');
  }
};

const logout = async (req, res) => {
  try {
    // Standard REST logout behavior
    return successResponse(res, 200, { message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout controller error:', error);
    return errorResponse(res, 500, 'Logout failed.');
  }
};

const me = async (req, res) => {
  try {
    // req.user is already populated by authMiddleware
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
  } catch (error) {
    console.error('Profile fetch controller error:', error);
    return errorResponse(res, 500, 'Failed to retrieve profile.');
  }
};

module.exports = {
  register,
  login,
  logout,
  me
};
