const prisma = require('../../config/db');
const { POLICY_TYPES } = require('../../config/constants');
const { validateDelegationBypass } = require('../policy/policy.service');

const createGroup = async ({ name, description }) => {
  const existingGroup = await prisma.group.findUnique({
    where: { name }
  });

  if (existingGroup) {
    const error = new Error(`Group with name '${name}' already exists.`);
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

const getAllGroups = async () => {
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

const getGroupById = async (id) => {
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
    const error = new Error('Group not found.');
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

const updateGroup = async (id, { name, description }) => {
  const existingGroup = await prisma.group.findUnique({
    where: { id }
  });

  if (!existingGroup) {
    const error = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  if (name && name !== existingGroup.name) {
    const nameConflict = await prisma.group.findUnique({
      where: { name }
    });
    if (nameConflict) {
      const error = new Error(`Group with name '${name}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
  }

  const updatedData = {};
  if (name) updatedData.name = name;
  if (description !== undefined) updatedData.description = description;

  return await prisma.group.update({
    where: { id },
    data: updatedData
  });
};

const deleteGroup = async (id) => {
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
    const error = new Error('Group not found.');
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

const addUserToGroup = async ({ groupId, userId }) => {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    const error = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const existingMembership = await prisma.userGroupMembership.findUnique({
    where: {
      userId_groupId: { userId, groupId }
    }
  });

  if (existingMembership) {
    const error = new Error('User is already a member of this group.');
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

const removeUserFromGroup = async ({ groupId, userId }) => {
  const membership = await prisma.userGroupMembership.findUnique({
    where: {
      userId_groupId: { userId, groupId }
    }
  });

  if (!membership) {
    const error = new Error('Membership not found.');
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

const attachPolicyToGroup = async (requestingUser, { groupId, policyId }) => {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    const error = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) {
    const error = new Error('Policy not found.');
    error.statusCode = 404;
    throw error;
  }

  if (policy.type !== POLICY_TYPES.MANAGED) {
    const error = new Error('Only MANAGED policies can be attached to a group.');
    error.statusCode = 400;
    throw error;
  }

  // Delegation Bypass Prevention
  validateDelegationBypass(requestingUser, policy.statements.statements);

  const existingAttachment = await prisma.groupPolicyAttachment.findUnique({
    where: {
      groupId_policyId: { groupId, policyId }
    }
  });

  if (existingAttachment) {
    const error = new Error('Policy is already attached to this group.');
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

const detachPolicyFromGroup = async ({ groupId, policyId }) => {
  const attachment = await prisma.groupPolicyAttachment.findUnique({
    where: {
      groupId_policyId: { groupId, policyId }
    }
  });

  if (!attachment) {
    const error = new Error('Policy attachment not found for this group.');
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

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addUserToGroup,
  removeUserFromGroup,
  attachPolicyToGroup,
  detachPolicyFromGroup
};
