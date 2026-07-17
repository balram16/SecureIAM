import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db';

export const registerUser = async ({ name, email, password, policyIds, groupIds, boundaryPolicyId }: any) => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    const error: any = new Error('Email is already registered.');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user and link relationships in a transaction
  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        isRoot: false
      }
    });

    // Attach direct policies
    if (Array.isArray(policyIds) && policyIds.length > 0) {
      for (const policyId of policyIds) {
        const policy = await tx.policy.findUnique({ where: { id: policyId } });
        if (policy) {
          await tx.userPolicyAttachment.create({
            data: {
              userId: user.id,
              policyId
            }
          });
        }
      }
    }

    // Join groups
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      for (const groupId of groupIds) {
        const group = await tx.group.findUnique({ where: { id: groupId } });
        if (group) {
          await tx.userGroupMembership.create({
            data: {
              userId: user.id,
              groupId
            }
          });
        }
      }
    }

    // Set permission boundary
    if (boundaryPolicyId) {
      const policy = await tx.policy.findUnique({ where: { id: boundaryPolicyId } });
      if (policy) {
        await tx.userBoundary.create({
          data: {
            userId: user.id,
            policyId: boundaryPolicyId
          }
        });
      }
    }

    return user;
  });

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    isRoot: newUser.isRoot,
    createdAt: newUser.createdAt
  };
};

export const loginUser = async ({ email, password }: any) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    const error: any = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error: any = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Generate JWT Access Token (expires in 15 minutes)
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, isRoot: user.isRoot },
    process.env.JWT_SECRET || 'super_secret_jwt_key_9876543210',
    { expiresIn: '15m' }
  );

  // Generate JWT Refresh Token (expires in 7 days)
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_0123456789',
    { expiresIn: '7d' }
  );

  // Store refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken }
  });

  return {
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isRoot: user.isRoot
    }
  };
};

export const refreshAccessToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_0123456789') as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.refreshToken !== token) {
      const error: any = new Error('Invalid or revoked refresh token.');
      error.statusCode = 401;
      throw error;
    }

    // Generate new Access Token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, isRoot: user.isRoot },
      process.env.JWT_SECRET || 'super_secret_jwt_key_9876543210',
      { expiresIn: '15m' }
    );

    return { token: accessToken };
  } catch (err: any) {
    const error: any = new Error('Invalid or expired refresh token.');
    error.statusCode = 401;
    throw error;
  }
};

export const logoutUser = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null }
  });
  return { message: 'Logged out successfully.' };
};
