import { UserWithPolicies } from '../../types';

interface Statement {
  Effect: 'Allow' | 'Deny';
  Action: string[];
  Resource: string[];
}

/**
 * Helper to match resource targets using wildcards.
 */
const isResourceMatch = (
  resourcePatterns: string[], 
  target: string, 
  namespace: string, 
  requestedAction: string
): boolean => {
  if (!Array.isArray(resourcePatterns)) return false;
  return resourcePatterns.some(pattern => {
    if (pattern === '*') return true;
    
    // If target is '*' (global collection endpoint, e.g. List / Create) and pattern targets the same namespace
    if (
      target === '*' && 
      (requestedAction.endsWith(':List') || requestedAction.endsWith(':Create')) && 
      pattern.startsWith(`${namespace}:`)
    ) {
      return true;
    }
    
    // Simple wildcard support: e.g. "reports:*" matches "reports:123"
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('^' + escaped.split('*').join('.*') + '$');
    return regex.test(target);
  });
};

/**
 * Evaluates whether a user is permitted to perform a given action on a target resource.
 *
 * @param user - User object fetched with memberships and policies relations
 * @param requestedAction - The action to evaluate (e.g. 'reports:List')
 * @param targetResource - The resource target context (defaults to '*')
 * @returns - true if permitted, false otherwise
 */
export const evaluatePermission = (
  user: UserWithPolicies,
  requestedAction: string,
  targetResource: string = '*'
): boolean => {
  // Rule 1: Root user bypasses all IAM permission checks.
  if (user.isRoot) {
    return true;
  }

  const namespace = requestedAction.split(':')[0];

  // Step 1 — Collect all effective statements
  const effectiveStatements: Statement[] = [];

  // Collect direct identity policies statements
  if (user.policies && Array.isArray(user.policies)) {
    for (const attachment of user.policies) {
      if ((attachment as any).expiresAt && new Date((attachment as any).expiresAt) <= new Date()) {
        continue;
      }
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
          if ((attachment as any).expiresAt && new Date((attachment as any).expiresAt) <= new Date()) {
            continue;
          }
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
    return stmt.Effect === 'Deny' && 
           stmt.Action && 
           stmt.Action.includes(requestedAction) &&
           isResourceMatch(stmt.Resource, targetResource, namespace, requestedAction);
  });

  if (hasExplicitDeny) {
    return false;
  }

  // Step 3 — Check for an explicit Allow
  const hasExplicitAllow = effectiveStatements.some(stmt => {
    return stmt.Effect === 'Allow' && 
           stmt.Action && 
           stmt.Action.includes(requestedAction) &&
           isResourceMatch(stmt.Resource, targetResource, namespace, requestedAction);
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
    return stmt.Effect === 'Allow' && 
           stmt.Action && 
           stmt.Action.includes(requestedAction) &&
           isResourceMatch(stmt.Resource, targetResource, namespace, requestedAction);
  });

  return boundaryAllows;
};

export interface PermissionDetail {
  status: 'ALLOWED' | 'DENIED' | 'LIMITED';
  resources?: string[];
}

/**
 * Helper to compute the status of all available actions for a user.
 * Useful for building the Effective Permissions Summary.
 */
export const getEffectivePermissionsSummary = (
  user: UserWithPolicies,
  allActions: string[]
): Record<string, PermissionDetail> => {
  const summary: Record<string, PermissionDetail> = {};

  if (user.isRoot) {
    for (const action of allActions) {
      summary[action] = { status: 'ALLOWED' };
    }
    return summary;
  }

  // 1. Gather all active statements (ignoring expired ones)
  const effectiveStatements: Statement[] = [];

  if (user.policies && Array.isArray(user.policies)) {
    for (const attachment of user.policies) {
      if ((attachment as any).expiresAt && new Date((attachment as any).expiresAt) <= new Date()) {
        continue;
      }
      if (attachment.policy && attachment.policy.statements) {
        const statementsObj = attachment.policy.statements as any;
        if (statementsObj && Array.isArray(statementsObj.statements)) {
          effectiveStatements.push(...statementsObj.statements);
        }
      }
    }
  }

  if (user.memberships && Array.isArray(user.memberships)) {
    for (const membership of user.memberships) {
      if (membership.group && membership.group.policies) {
        for (const attachment of membership.group.policies) {
          if ((attachment as any).expiresAt && new Date((attachment as any).expiresAt) <= new Date()) {
            continue;
          }
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

  for (const action of allActions) {
    const namespace = action.split(':')[0];

    // Check if allowed globally (on '*')
    const isGloballyAllowed = evaluatePermission(user, action, '*');

    if (isGloballyAllowed) {
      summary[action] = { status: 'ALLOWED' };
      continue;
    }

    // If not globally allowed, let's see if there are any Allows matching this action on specific resources
    const matchingAllows = effectiveStatements.filter(stmt => {
      return stmt.Effect === 'Allow' && 
             stmt.Action && 
             stmt.Action.includes(action);
    });

    if (matchingAllows.length > 0) {
      // Collect the resources listed in these Allows
      const specificResources = Array.from(
        new Set(matchingAllows.flatMap(stmt => stmt.Resource || []))
      ).filter(r => r !== '*'); // exclude '*'

      if (specificResources.length > 0) {
        // Also check if any of these specific resources are denied
        const allowedResources = specificResources.filter(res => {
          return evaluatePermission(user, action, res);
        });

        if (allowedResources.length > 0) {
          summary[action] = { status: 'LIMITED', resources: allowedResources };
          continue;
        }
      }
    }

    // Default to DENIED
    summary[action] = { status: 'DENIED' };
  }

  return summary;
};
