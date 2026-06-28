import prisma from '../../config/db';
import { ALL_ACTIONS, POLICY_TYPES, EFFECT_TYPES } from '../../config/constants';
import { evaluatePermission } from '../../shared/utils/permission.utils';
import { UserWithPolicies } from '../../types';

interface Statement {
  Effect: 'Allow' | 'Deny';
  Action: string[];
  Resource: string[];
}

/**
 * Validates the policy document statements.
 * Throws an error if invalid.
 */
export const validatePolicyStatements = (statements: any): void => {
  if (!Array.isArray(statements)) {
    const error: any = new Error('Statements must be an array.');
    error.statusCode = 400;
    throw error;
  }

  if (statements.length === 0) {
    const error: any = new Error('Statements array cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  for (const statement of statements) {
    if (!statement || typeof statement !== 'object') {
      const error: any = new Error('Each statement must be a valid JSON object.');
      error.statusCode = 400;
      throw error;
    }

    const { Effect, Action, Resource } = statement;

    // Validate Effect
    if (Effect !== EFFECT_TYPES.ALLOW && Effect !== EFFECT_TYPES.DENY) {
      const error: any = new Error(`Effect must be exactly '${EFFECT_TYPES.ALLOW}' or '${EFFECT_TYPES.DENY}'.`);
      error.statusCode = 400;
      throw error;
    }

    // Validate Action
    if (!Array.isArray(Action) || Action.length === 0) {
      const error: any = new Error('Action must be a non-empty array of strings.');
      error.statusCode = 400;
      throw error;
    }

    for (const act of Action) {
      if (!ALL_ACTIONS.includes(act)) {
        const error: any = new Error(`Action '${act}' is not a valid permission in this system.`);
        error.statusCode = 400;
        throw error;
      }
    }

    // Validate Resource
    if (!Array.isArray(Resource) || Resource.length !== 1 || Resource[0] !== '*') {
      const error: any = new Error('Resource must be exactly ["*"].');
      error.statusCode = 400;
      throw error;
    }
  }
};

/**
 * Validates that the creating/updating user has the permission to delegate these rights.
 * (Delegation Bypass Prevention)
 */
export const validateDelegationBypass = (requestingUser: UserWithPolicies, statements: Statement[]): void => {
  // Root user is not subject to delegation bypass prevention.
  if (requestingUser.isRoot) {
    return;
  }

  for (const statement of statements) {
    if (statement.Effect === EFFECT_TYPES.ALLOW) {
      for (const action of statement.Action) {
        // Evaluate if requesting user holds permission for this action
        const holdsAction = evaluatePermission(requestingUser, action);
        if (!holdsAction) {
          const error: any = new Error(
            `Delegation Bypass Prevention: You cannot grant the action '${action}' because you do not hold it yourself.`
          );
          error.statusCode = 403;
          throw error;
        }
      }
    }
  }
};

export const createPolicy = async (
  requestingUser: UserWithPolicies,
  { name, type, description, statements, userId, groupId }: any
) => {
  // Validate Type
  if (type !== POLICY_TYPES.MANAGED && type !== POLICY_TYPES.INLINE) {
    const error: any = new Error(`Type must be either '${POLICY_TYPES.MANAGED}' or '${POLICY_TYPES.INLINE}'.`);
    error.statusCode = 400;
    throw error;
  }

  if (type === POLICY_TYPES.INLINE) {
    if (!userId && !groupId) {
      const error: any = new Error('An inline policy must be created for a specific user or group.');
      error.statusCode = 400;
      throw error;
    }
    if (userId && groupId) {
      const error: any = new Error('An inline policy cannot be created for both a user and a group.');
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate policy statements structure
  validatePolicyStatements(statements);

  // Validate Delegation Bypass
  validateDelegationBypass(requestingUser, statements);

  // Check unique name
  const existingPolicy = await prisma.policy.findUnique({
    where: { name }
  });

  if (existingPolicy) {
    const error: any = new Error(`Policy with name '${name}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  // Store in database using a transaction if it is an inline policy to link it immediately
  const newPolicy = await prisma.$transaction(async (tx) => {
    const policy = await tx.policy.create({
      data: {
        name,
        type,
        description,
        statements: { statements }
      }
    });

    if (type === POLICY_TYPES.INLINE) {
      if (userId) {
        // Verify user exists
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          const error: any = new Error('User not found.');
          error.statusCode = 404;
          throw error;
        }
        await tx.userPolicyAttachment.create({
          data: {
            userId,
            policyId: policy.id
          }
        });
      } else if (groupId) {
        // Verify group exists
        const group = await tx.group.findUnique({ where: { id: groupId } });
        if (!group) {
          const error: any = new Error('Group not found.');
          error.statusCode = 404;
          throw error;
        }
        await tx.groupPolicyAttachment.create({
          data: {
            groupId,
            policyId: policy.id
          }
        });
      }
    }

    return policy;
  });

  return newPolicy;
};

export const getAllPolicies = async () => {
  return await prisma.policy.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const getPolicyById = async (id: string) => {
  const policy = await prisma.policy.findUnique({
    where: { id }
  });

  if (!policy) {
    const error: any = new Error('Policy not found.');
    error.statusCode = 404;
    throw error;
  }

  return policy;
};

export const updatePolicy = async (
  requestingUser: UserWithPolicies,
  id: string,
  { name, description, statements }: any
) => {
  const existingPolicy = await prisma.policy.findUnique({
    where: { id }
  });

  if (!existingPolicy) {
    const error: any = new Error('Policy not found.');
    error.statusCode = 404;
    throw error;
  }

  // If statements are updating, we must validate them and verify delegation bypass
  if (statements) {
    validatePolicyStatements(statements);
    validateDelegationBypass(requestingUser, statements);
  }

  // If name is updating, check uniqueness
  if (name && name !== existingPolicy.name) {
    const nameConflict = await prisma.policy.findUnique({
      where: { name }
    });
    if (nameConflict) {
      const error: any = new Error(`Policy with name '${name}' already exists.`);
      error.statusCode = 409;
      throw error;
    }
  }

  const updatedData: any = {};
  if (name) updatedData.name = name;
  if (description !== undefined) updatedData.description = description;
  if (statements) updatedData.statements = { statements };

  return await prisma.policy.update({
    where: { id },
    data: updatedData
  });
};

export const deletePolicy = async (requestingUser: UserWithPolicies, id: string) => {
  const policy = await prisma.policy.findUnique({
    where: { id },
    include: {
      users: { include: { user: true } },
      groups: { include: { group: true } }
    }
  });

  if (!policy) {
    const error: any = new Error('Policy not found.');
    error.statusCode = 404;
    throw error;
  }

  // Managed policies checks
  if (policy.type === POLICY_TYPES.MANAGED) {
    const attachedUsersCount = policy.users.length;
    const attachedGroupsCount = policy.groups.length;

    if ((attachedUsersCount > 0 || attachedGroupsCount > 0) && !requestingUser.isRoot) {
      const attachedUserNames = policy.users.map((u: any) => u.user.name).join(', ');
      const attachedGroupNames = policy.groups.map((g: any) => g.group.name).join(', ');
      
      let attachmentDetails = '';
      if (attachedUsersCount > 0) attachmentDetails += `users: [${attachedUserNames}]`;
      if (attachedGroupsCount > 0) {
        if (attachmentDetails) attachmentDetails += ', ';
        attachmentDetails += `groups: [${attachedGroupNames}]`;
      }

      const error: any = new Error(`Managed Policy is currently attached and cannot be deleted. Attached to ${attachmentDetails}.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Delete policy (Database cascade deletes the attachments)
  await prisma.policy.delete({
    where: { id }
  });

  return { message: 'Policy deleted successfully.' };
};
