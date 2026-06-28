export interface Statement {
  Effect: 'Allow' | 'Deny';
  Action: string[];
  Resource: string[];
}

export interface Policy {
  id: string;
  name: string;
  description: string | null;
  type: 'MANAGED' | 'INLINE';
  statements: { statements: Statement[] };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isRoot: boolean;
  groupCount?: number;
  directPolicyCount?: number;
  boundary?: 'yes' | 'no' | Policy | null;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  memberCount?: number;
  policyCount?: number;
  createdAt: string;
  updatedAt: string;
}
