import prisma from '../../config/db';
import { POLICY_TYPES, ALL_ACTIONS } from '../../config/constants';
import { getEffectivePermissionsSummary } from '../../shared/utils/permission.utils';
import { validateDelegationBypass } from '../policy/policy.service';
import { UserWithPolicies } from '../../types';

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          memberships: true,
          policies: true
        }
      },
      boundary: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isRoot: user.isRoot,
    groupCount: user._count.memberships,
    directPolicyCount: user._count.policies,
    boundary: user.boundary ? 'yes' : 'no',
    createdAt: user.createdAt
  }));
};

export const getUserProfile = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      policies: {
        include: {
          policy: true
        }
      },
      memberships: {
        include: {
          group: {
            include: {
              policies: {
                include: {
                  policy: true
                }
              }
            }
          }
        }
      },
      boundary: {
        include: {
          policy: true
        }
      }
    }
  }) as UserWithPolicies | null;

  if (!user) {
    const error: any = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // Compute effective permissions summary
  const effectivePermissions = getEffectivePermissionsSummary(user, ALL_ACTIONS);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isRoot: user.isRoot,
    createdAt: user.createdAt,
    directPolicies: user.policies.map(p => p.policy),
    groups: user.memberships.map(m => ({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      policies: m.group.policies.map(gp => gp.policy)
    })),
    boundary: user.boundary ? user.boundary.policy : null,
    effectivePermissions
  };
};

export const attachPolicyToUser = async (requestingUser: UserWithPolicies, { userId, policyId }: any) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error: any = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) {
    const error: any = new Error('Policy not found.');
    error.statusCode = 404;
    throw error;
  }

  if (policy.type !== POLICY_TYPES.MANAGED) {
    const error: any = new Error('Only MANAGED policies can be attached to a user.');
    error.statusCode = 400;
    throw error;
  }

  // Delegation Bypass Prevention
  const statementsObj = policy.statements as any;
  const statements = (statementsObj && Array.isArray(statementsObj.statements)) ? statementsObj.statements : [];
  validateDelegationBypass(requestingUser, statements);

  const existingAttachment = await prisma.userPolicyAttachment.findUnique({
    where: {
      userId_policyId: { userId, policyId }
    }
  });

  if (existingAttachment) {
    const error: any = new Error('Policy is already attached to this user.');
    error.statusCode = 409;
    throw error;
  }

  return await prisma.userPolicyAttachment.create({
    data: {
      userId,
      policyId
    }
  });
};

export const detachPolicyFromUser = async ({ userId, policyId }: any) => {
  const attachment = await prisma.userPolicyAttachment.findUnique({
    where: {
      userId_policyId: { userId, policyId }
    }
  });

  if (!attachment) {
    const error: any = new Error('Policy attachment not found for this user.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.userPolicyAttachment.delete({
    where: {
      userId_policyId: { userId, policyId }
    }
  });

  return { message: 'Policy detached from user successfully.' };
};

export const putUserBoundary = async (requestingUser: UserWithPolicies, { userId, policyId }: any) => {
  // Boundary can ONLY be assigned by root user.
  if (!requestingUser.isRoot) {
    const error: any = new Error('Forbidden: Only the root user can assign permission boundaries.');
    error.statusCode = 403;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error: any = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) {
    const error: any = new Error('Policy not found.');
    error.statusCode = 404;
    throw error;
  }

  if (policy.type !== POLICY_TYPES.MANAGED) {
    const error: any = new Error('Only MANAGED policies can be set as a boundary.');
    error.statusCode = 400;
    throw error;
  }

  // Upsert boundary policy (replace if existing)
  return await prisma.userBoundary.upsert({
    where: { userId },
    update: { policyId },
    create: { userId, policyId }
  });
};

export const deleteUserBoundary = async (requestingUser: UserWithPolicies, { userId }: any) => {
  // Boundary can ONLY be deleted by root user.
  if (!requestingUser.isRoot) {
    const error: any = new Error('Forbidden: Only the root user can remove permission boundaries.');
    error.statusCode = 403;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error: any = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const boundary = await prisma.userBoundary.findUnique({ where: { userId } });
  if (!boundary) {
    const error: any = new Error('No boundary set for this user.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.userBoundary.delete({
    where: { userId }
  });

  return { message: 'Boundary removed from user successfully.' };
};
