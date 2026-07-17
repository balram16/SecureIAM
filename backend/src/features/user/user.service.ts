import prisma from '../../config/db';
import { POLICY_TYPES, ALL_ACTIONS } from '../../config/constants';
import { getEffectivePermissionsSummary } from '../../shared/utils/permission.utils';
import { validateDelegationBypass } from '../policy/policy.service';
import { UserWithPolicies } from '../../types';
import { logAudit } from '../../shared/utils/audit.logger';

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          memberships: true,
          policies: {
            where: {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          }
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

export const getUserProfile = async (id: string, resourceTarget: string = '*') => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      policies: {
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          policy: true
        }
      },
      memberships: {
        include: {
          group: {
            include: {
              policies: {
                where: {
                  OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                  ]
                },
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
    directPolicies: user.policies
      .filter(p => !(p as any).expiresAt || new Date((p as any).expiresAt) > new Date())
      .map(p => ({
        ...(p.policy as any),
        expiresAt: (p as any).expiresAt
      })),
    groups: user.memberships.map(m => ({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      policies: m.group.policies
        .filter(gp => !(gp as any).expiresAt || new Date((gp as any).expiresAt) > new Date())
        .map(gp => ({
          ...(gp.policy as any),
          expiresAt: (gp as any).expiresAt
        }))
    })),
    boundary: user.boundary ? user.boundary.policy : null,
    effectivePermissions
  };
};

export const attachPolicyToUser = async (requestingUser: UserWithPolicies, { userId, policyId, expiresAt }: any) => {
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
    // If it exists but is expired, we can delete it first and allow re-attaching
    if (existingAttachment.expiresAt && new Date(existingAttachment.expiresAt) <= new Date()) {
      await prisma.userPolicyAttachment.delete({
        where: {
          userId_policyId: { userId, policyId }
        }
      });
    } else {
      const error: any = new Error('Policy is already attached to this user.');
      error.statusCode = 409;
      throw error;
    }
  }

  const attachment = await prisma.userPolicyAttachment.create({
    data: {
      userId,
      policyId,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    }
  });

  await logAudit(
    requestingUser.id,
    requestingUser.name || requestingUser.email,
    'iam:AttachUserPolicy',
    `Attached policy '${policy.name}' to user '${user.name}'`
  );

  return attachment;
};

export const detachPolicyFromUser = async (requestingUser: UserWithPolicies, { userId, policyId }: any) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const policy = await prisma.policy.findUnique({ where: { id: policyId } });

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

  await logAudit(
    requestingUser.id,
    requestingUser.name || requestingUser.email,
    'iam:DetachUserPolicy',
    `Detached policy '${policy?.name || policyId}' from user '${user?.name || userId}'`
  );

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
  const boundary = await prisma.userBoundary.upsert({
    where: { userId },
    update: { policyId },
    create: { userId, policyId }
  });

  await logAudit(
    requestingUser.id,
    requestingUser.name || requestingUser.email,
    'iam:PutUserBoundary',
    `Set permission boundary '${policy.name}' for user '${user.name}'`
  );

  return boundary;
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

  await logAudit(
    requestingUser.id,
    requestingUser.name || requestingUser.email,
    'iam:DeleteUserBoundary',
    `Removed permission boundary from user '${user.name}'`
  );

  return { message: 'Boundary removed from user successfully.' };
};

export const deleteUser = async (requestingUser: UserWithPolicies, userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error: any = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  if (user.isRoot) {
    const error: any = new Error('Root user cannot be deleted.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction([
    prisma.userPolicyAttachment.deleteMany({ where: { userId } }),
    prisma.userBoundary.deleteMany({ where: { userId } }),
    prisma.userGroupMembership.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } })
  ]);

  await logAudit(
    requestingUser.id,
    requestingUser.name || requestingUser.email,
    'iam:DeleteUser',
    `Deleted user account '${user.name}'`
  );

  return { message: 'User deleted successfully.' };
};
