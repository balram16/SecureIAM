import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Hash passwords
  const rootPasswordHash = await bcrypt.hash('root1234', 10);
  const alicePasswordHash = await bcrypt.hash('alice1234', 10);
  const bobPasswordHash = await bcrypt.hash('bob1234', 10);
  const charliePasswordHash = await bcrypt.hash('charlie1234', 10);

  // 2. Clean up existing tables to ensure clean seed
  console.log('Cleaning up existing database...');
  await prisma.userBoundary.deleteMany({});
  await prisma.userPolicyAttachment.deleteMany({});
  await prisma.groupPolicyAttachment.deleteMany({});
  await prisma.userGroupMembership.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.policy.deleteMany({});

  // 3. Create Root User
  console.log('Seeding root user...');
  const root = await prisma.user.create({
    data: {
      name: 'Root',
      email: 'root@org.local',
      passwordHash: rootPasswordHash,
      isRoot: true
    }
  });

  // 4. Create Regular Members
  console.log('Seeding member users...');
  const alice = await prisma.user.create({
    data: {
      name: 'Alice',
      email: 'alice@org.local',
      passwordHash: alicePasswordHash,
      isRoot: false
    }
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob',
      email: 'bob@org.local',
      passwordHash: bobPasswordHash,
      isRoot: false
    }
  });

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie',
      email: 'charlie@org.local',
      passwordHash: charliePasswordHash,
      isRoot: false
    }
  });

  // 5. Create MANAGED Policies
  console.log('Seeding managed policies...');
  const readOnlyAccess = await prisma.policy.create({
    data: {
      name: 'ReadOnlyAccess',
      description: 'Allows read-only access to reports, alerts, and audit logs.',
      type: 'MANAGED',
      statements: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'reports:List',
              'reports:Read',
              'alerts:List',
              'alerts:Read',
              'audit:List',
              'audit:Read'
            ],
            Resource: ['*']
          }
        ]
      }
    }
  });

  const reportsFullAccess = await prisma.policy.create({
    data: {
      name: 'ReportsFullAccess',
      description: 'Allows full administrative control over reports (Create, Read, Update, Delete).',
      type: 'MANAGED',
      statements: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'reports:List',
              'reports:Read',
              'reports:Create',
              'reports:Update',
              'reports:Delete'
            ],
            Resource: ['*']
          }
        ]
      }
    }
  });

  // 6. Create One Group: Viewers
  console.log('Seeding viewers group...');
  const viewers = await prisma.group.create({
    data: {
      name: 'Viewers',
      description: 'Group for users with read-only access to organizational resources.'
    }
  });

  // 7. Attach ReadOnlyAccess policy to Viewers group
  console.log('Attaching policy to group...');
  await prisma.groupPolicyAttachment.create({
    data: {
      groupId: viewers.id,
      policyId: readOnlyAccess.id
    }
  });

  // 8. Add Alice to Viewers group
  console.log('Adding Alice to group...');
  await prisma.userGroupMembership.create({
    data: {
      userId: alice.id,
      groupId: viewers.id
    }
  });

  console.log('Seeding completed successfully!');
  console.log('----------------------------------------');
  console.log('Root User: root@org.local / root1234');
  console.log('Alice (Viewer): alice@org.local / alice1234');
  console.log('Bob: bob@org.local / bob1234');
  console.log('Charlie: charlie@org.local / charlie1234');
  console.log('----------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
