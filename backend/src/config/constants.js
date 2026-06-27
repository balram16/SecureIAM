const RESOURCE_ACTIONS = [
  'reports:List',
  'reports:Read',
  'reports:Create',
  'reports:Update',
  'reports:Delete',
  'alerts:List',
  'alerts:Read',
  'alerts:Create',
  'alerts:Acknowledge',
  'alerts:Delete',
  'settings:Read',
  'settings:Update',
  'audit:List',
  'audit:Read'
];

const IAM_ACTIONS = [
  'iam:ListPolicies',
  'iam:GetPolicy',
  'iam:CreatePolicy',
  'iam:UpdatePolicy',
  'iam:DeletePolicy',
  'iam:ListGroups',
  'iam:GetGroup',
  'iam:CreateGroup',
  'iam:UpdateGroup',
  'iam:DeleteGroup',
  'iam:AddUserToGroup',
  'iam:RemoveUserFromGroup',
  'iam:AttachGroupPolicy',
  'iam:DetachGroupPolicy',
  'iam:ListUsers',
  'iam:GetUser',
  'iam:AttachUserPolicy',
  'iam:DetachUserPolicy',
  'iam:PutUserBoundary',
  'iam:DeleteUserBoundary'
];

const ALL_ACTIONS = [...RESOURCE_ACTIONS, ...IAM_ACTIONS];

const POLICY_TYPES = {
  MANAGED: 'MANAGED',
  INLINE: 'INLINE'
};

const EFFECT_TYPES = {
  ALLOW: 'Allow',
  DENY: 'Deny'
};

module.exports = {
  RESOURCE_ACTIONS,
  IAM_ACTIONS,
  ALL_ACTIONS,
  POLICY_TYPES,
  EFFECT_TYPES
};
