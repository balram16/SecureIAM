import prisma from '../../config/db';
import { POLICY_TYPES } from '../../config/constants';
import { validateDelegationBypass } from '../policy/policy.service';
import { UserWithPolicies } from '../../types';

export const createGroup = async ({ name, description }: any) => {
  const existingGroup = await prisma.group.findUnique({
    where: { name }
  });

  if (existingGroup) {
    const error: any = new Error(`Group with name '${name}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  return await prisma.group.create({
    data: {
      name,
      description
    }
  });
};

export const getAllGroups = async () => {
  // Returns group list with member count and attached policy count
  const groups = await prisma.group.findMany({
    include: {
      _count: {
        select: {
          memberships: true,
          policies: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return groups.map(group => ({
    id: group.id,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    memberCount: group._count.memberships,
    policyCount: group._count.policies
  }));
};

export const getGroupById = async (id: string) => {
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      policies: {
        include: {
          policy: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      }
    }
  });

  if (!group) {
    const error: any = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  // Flatten structures
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    members: group.memberships.map(m => m.user),
    policies: group.policies.map(p => p.policy)
  };
};

export const updateGroup = async (id: string, { name, description }: any) => {
  const existingGroup = await prisma.group.findUnique({
    where: { id }
  });

  if (!existingGroup) {
    const error: any = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  if (name && name !== existingGroup.name) {
    const nameConflict = await prisma.group.findUnique({
      where: { name }
    });
    if (nameConflict) {
      const error: any = new Error(`Group with name '${name}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
  }

  const updatedData: any = {};
  if (name) updatedData.name = name;
  if (description !== undefined) updatedData.description = description;

  return await prisma.group.update({
    where: { id },
    data: updatedData
  });
};

export const deleteGroup = async (id: string) => {
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      policies: {
        include: {
          policy: true
        }
      }
    }
  });

  if (!group) {
    const error: any = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  // Find all INLINE policies attached to this group so we can delete them
  const inlinePoliciesToDelete = group.policies
    .filter(p => p.policy.type === POLICY_TYPES.INLINE)
    .map(p => p.policy.id);

  // Perform inside a transaction
  await prisma.$transaction([
    // Delete memberships (also handled by cascade, but good to run)
    prisma.userGroupMembership.deleteMany({
      where: { groupId: id }
    }),
    // Delete policy attachments
    prisma.groupPolicyAttachment.deleteMany({
      where: { groupId: id }
    }),
    // Delete the group
    prisma.group.delete({
      where: { id }
    }),
    // Delete the inline policies
    prisma.policy.deleteMany({
      where: {
        id: { in: inlinePoliciesToDelete }
      }
    })
  ]);

  return { message: 'Group deleted successfully.' };
};

export const addUserToGroup = async ({ groupId, userId }: any) => {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    const error: any = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error: any = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const existingMembership = await prisma.userGroupMembership.findUnique({
    where: {
      userId_groupId: { userId, groupId }
    }
  });

  if (existingMembership) {
    const error: any = new Error('User is already a member of this group.');
    error.statusCode = 409;
    throw error;
  }

  return await prisma.userGroupMembership.create({
    data: {
      userId,
      groupId
    }
  });
};

export const removeUserFromGroup = async ({ groupId, userId }: any) => {
  const membership = await prisma.userGroupMembership.findUnique({
    where: {
      userId_groupId: { userId, groupId }
    }
  });

  if (!membership) {
    const error: any = new Error('Membership not found.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.userGroupMembership.delete({
    where: {
      userId_groupId: { userId, groupId }
    }
  });

  return { message: 'User removed from group successfully.' };
};

export const attachPolicyToGroup = async (requestingUser: UserWithPolicies, { groupId, policyId }: any) => {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    const error: any = new Error('Group not found.');
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
    const error: any = new Error('Only MANAGED policies can be attached to a group.');
    error.statusCode = 400;
    throw error;
  }

  // Delegation Bypass Prevention
  const statementsObj = policy.statements as any;
  const statements = (statementsObj && Array.isArray(statementsObj.statements)) ? statementsObj.statements : [];
  validateDelegationBypass(requestingUser, statements);

  const existingAttachment = await prisma.groupPolicyAttachment.findUnique({
    where: {
      groupId_policyId: { groupId, policyId }
    }
  });

  if (existingAttachment) {
    const error: any = new Error('Policy is already attached to this group.');
    error.statusCode = 409;
    throw error;
  }

  return await prisma.groupPolicyAttachment.create({
    data: {
      groupId,
      policyId
    }
  });
};

export const detachPolicyFromGroup = async ({ groupId, policyId }: any) => {
  const attachment = await prisma.groupPolicyAttachment.findUnique({
    where: {
      groupId_policyId: { groupId, policyId }
    }
  });

  if (!attachment) {
    const error: any = new Error('Policy attachment not found for this group.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.groupPolicyAttachment.delete({
    where: {
      groupId_policyId: { groupId, policyId }
    }
  });

  return { message: 'Policy detached from group successfully.' };
};
