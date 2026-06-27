const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');

const registerUser = async ({ name, email, password }) => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    const error = new Error('Email is already registered.');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      isRoot: false // Seed script creates the only root user
    },
    select: {
      id: true,
      name: true,
      email: true,
      isRoot: true,
      createdAt: true
    }
  });

  return newUser;
};

const loginUser = async ({ email, password }) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, isRoot: user.isRoot },
    process.env.JWT_SECRET || 'super_secret_jwt_key_9876543210',
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isRoot: user.isRoot
    }
  };
};

module.exports = {
  registerUser,
  loginUser
};
