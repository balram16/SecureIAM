export const RESOURCE_ACTIONS: string[] = [
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

export const IAM_ACTIONS: string[] = [
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

export const ALL_ACTIONS: string[] = [...RESOURCE_ACTIONS, ...IAM_ACTIONS];

export const POLICY_TYPES = {
  MANAGED: 'MANAGED',
  INLINE: 'INLINE'
} as const;

export const EFFECT_TYPES = {
  ALLOW: 'Allow',
  DENY: 'Deny'
} as const;
