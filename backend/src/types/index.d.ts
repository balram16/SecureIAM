import { User, Policy, Group } from '@prisma/client';

export interface UserWithPolicies extends User {
  policies: { policy: Policy }[];
  memberships: {
    group: Group & {
      policies: { policy: Policy }[];
    };
  }[];
  boundary?: { policy: Policy } | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserWithPolicies;
    }
  }
}
