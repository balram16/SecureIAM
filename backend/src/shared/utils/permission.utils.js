/**
 * Evaluates whether a user is permitted to perform a given action.
 *
 * @param {object} user - User object fetched with memberships and policies relations
 * @param {string} requestedAction - The action to evaluate (e.g. 'reports:List')
 * @returns {boolean} - true if permitted, false otherwise
 */
const evaluatePermission = (user, requestedAction) => {
  // Rule 1: Root user bypasses all IAM permission checks.
  if (user.isRoot) {
    return true;
  }

  // Step 1 — Collect all effective statements
  const effectiveStatements = [];

  // Collect direct identity policies statements
  if (user.policies && Array.isArray(user.policies)) {
    for (const attachment of user.policies) {
      if (attachment.policy && attachment.policy.statements && attachment.policy.statements.statements) {
        effectiveStatements.push(...attachment.policy.statements.statements);
      }
    }
  }

  // Collect statements from policies attached to groups the user belongs to
  if (user.memberships && Array.isArray(user.memberships)) {
    for (const membership of user.memberships) {
      if (membership.group && membership.group.policies) {
        for (const attachment of membership.group.policies) {
          if (attachment.policy && attachment.policy.statements && attachment.policy.statements.statements) {
            effectiveStatements.push(...attachment.policy.statements.statements);
          }
        }
      }
    }
  }

  // Step 2 — Check for an explicit Deny
  // If any statement in the effective list has Effect: "Deny" and its Action array includes the requested action:
  // -> DENY immediately. This is final.
  const hasExplicitDeny = effectiveStatements.some(stmt => {
    return stmt.Effect === 'Deny' && stmt.Action && stmt.Action.includes(requestedAction);
  });

  if (hasExplicitDeny) {
    return false;
  }

  // Step 3 — Check for an explicit Allow
  // If no statement has Effect: "Allow" with the requested action in its Action array:
  // -> DENY (implicit deny).
  const hasExplicitAllow = effectiveStatements.some(stmt => {
    return stmt.Effect === 'Allow' && stmt.Action && stmt.Action.includes(requestedAction);
  });

  if (!hasExplicitAllow) {
    return false;
  }

  // Step 4 — Apply the boundary (if one is set)
  // If the user has no boundary → ALLOW the request.
  // If the user has a boundary → scan the boundary's statements. If the boundary has Effect: "Allow" for the requested action → ALLOW the request.
  // If the boundary does not have Effect: "Allow" for the requested action → DENY.
  if (!user.boundary || !user.boundary.policy) {
    return true;
  }

  const boundaryPolicy = user.boundary.policy;
  const boundaryStatements = (boundaryPolicy.statements && boundaryPolicy.statements.statements) || [];

  const boundaryAllows = boundaryStatements.some(stmt => {
    return stmt.Effect === 'Allow' && stmt.Action && stmt.Action.includes(requestedAction);
  });

  return boundaryAllows;
};

/**
 * Helper to compute the status of all available actions for a user.
 * Useful for building the Effective Permissions Summary.
 *
 * @param {object} user - User object fetched with memberships and policies relations
 * @param {string[]} allActions - List of all possible actions
 * @returns {object} - Object mapping each action to true (Allowed) or false (Denied)
 */
const getEffectivePermissionsSummary = (user, allActions) => {
  const summary = {};
  for (const action of allActions) {
    summary[action] = evaluatePermission(user, action);
  }
  return summary;
};

module.exports = {
  evaluatePermission,
  getEffectivePermissionsSummary
};
