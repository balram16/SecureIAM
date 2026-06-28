import { UserWithPolicies } from '../../types';

interface Statement {
  Effect: 'Allow' | 'Deny';
  Action: string[];
  Resource: string[];
}

/**
 * Evaluates whether a user is permitted to perform a given action.
 *
 * @param user - User object fetched with memberships and policies relations
 * @param requestedAction - The action to evaluate (e.g. 'reports:List')
 * @returns - true if permitted, false otherwise
 */
export const evaluatePermission = (user: UserWithPolicies, requestedAction: string): boolean => {
  // Rule 1: Root user bypasses all IAM permission checks.
  if (user.isRoot) {
    return true;
  }

  // Step 1 — Collect all effective statements
  const effectiveStatements: Statement[] = [];

  // Collect direct identity policies statements
  if (user.policies && Array.isArray(user.policies)) {
    for (const attachment of user.policies) {
      if (attachment.policy && attachment.policy.statements) {
        const statementsObj = attachment.policy.statements as any;
        if (statementsObj && Array.isArray(statementsObj.statements)) {
          effectiveStatements.push(...statementsObj.statements);
        }
      }
    }
  }

  // Collect statements from policies attached to groups the user belongs to
  if (user.memberships && Array.isArray(user.memberships)) {
    for (const membership of user.memberships) {
      if (membership.group && membership.group.policies) {
        for (const attachment of membership.group.policies) {
          if (attachment.policy && attachment.policy.statements) {
            const statementsObj = attachment.policy.statements as any;
            if (statementsObj && Array.isArray(statementsObj.statements)) {
              effectiveStatements.push(...statementsObj.statements);
            }
          }
        }
      }
    }
  }

  // Step 2 — Check for an explicit Deny
  const hasExplicitDeny = effectiveStatements.some(stmt => {
    return stmt.Effect === 'Deny' && stmt.Action && stmt.Action.includes(requestedAction);
  });

  if (hasExplicitDeny) {
    return false;
  }

  // Step 3 — Check for an explicit Allow
  const hasExplicitAllow = effectiveStatements.some(stmt => {
    return stmt.Effect === 'Allow' && stmt.Action && stmt.Action.includes(requestedAction);
  });

  if (!hasExplicitAllow) {
    return false;
  }

  // Step 4 — Apply the boundary (if one is set)
  if (!user.boundary || !user.boundary.policy) {
    return true;
  }

  const boundaryPolicy = user.boundary.policy;
  const statementsObj = boundaryPolicy.statements as any;
  const boundaryStatements: Statement[] = (statementsObj && Array.isArray(statementsObj.statements)) ? statementsObj.statements : [];

  const boundaryAllows = boundaryStatements.some(stmt => {
    return stmt.Effect === 'Allow' && stmt.Action && stmt.Action.includes(requestedAction);
  });

  return boundaryAllows;
};

/**
 * Helper to compute the status of all available actions for a user.
 * Useful for building the Effective Permissions Summary.
 *
 * @param user - User object fetched with memberships and policies relations
 * @param allActions - List of all possible actions
 * @returns - Object mapping each action to true (Allowed) or false (Denied)
 */
export const getEffectivePermissionsSummary = (user: UserWithPolicies, allActions: string[]): Record<string, boolean> => {
  const summary: Record<string, boolean> = {};
  for (const action of allActions) {
    summary[action] = evaluatePermission(user, action);
  }
  return summary;
};
