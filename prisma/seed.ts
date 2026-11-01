import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma';

const SALT_ROUNDS = 10;
const SEED_PASSWORD = 'Senha123';

const PERMISSIONS = [
  { name: 'users:read', description: 'Read users' },
  { name: 'users:write', description: 'Create/update users' },
  { name: 'roles:read', description: 'Read roles' },
  { name: 'roles:write', description: 'Create/update roles' },
  { name: 'permissions:read', description: 'Read permissions' },
  { name: 'permissions:write', description: 'Create/update permissions' },
  { name: 'payments:read', description: 'Read payments' },
  { name: 'payments:write', description: 'Create/update payments' },
  { name: 'reports:read', description: 'Read reports' },
];

const ROLES: { name: string; description: string; permissions: string[] }[] = [
  {
    name: 'admin',
    description: 'Full access',
    permissions: PERMISSIONS.map((permission) => permission.name),
  },
  {
    name: 'support',
    description: 'Customer support',
    permissions: ['users:read', 'users:write'],
  },
  {
    name: 'financial',
    description: 'Financial operations',
    permissions: ['payments:read', 'payments:write', 'reports:read'],
  },
];

const USERS: { name: string; email: string; role: string }[] = [
  { name: 'Admin', email: 'admin@example.com', role: 'admin' },
  { name: 'Support', email: 'support@example.com', role: 'support' },
  { name: 'Financial', email: 'financial@example.com', role: 'financial' },
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to seed: NODE_ENV=production. This script creates demo accounts with a hardcoded password - never run it against a production database.',
    );
  }

  // The NODE_ENV check above only catches that one specific env var - it
  // does nothing if DATABASE_URL happens to point at a real database while
  // NODE_ENV is still "development" (e.g. someone debugging against
  // staging). Printing the target host/db up front is the best a script
  // with no interactive confirmation can do to catch that before it upserts
  // demo accounts with a hardcoded password into the wrong place.
  const target = new URL(process.env.DATABASE_URL ?? '');
  console.log(
    `Seeding ${target.hostname}:${target.port || 5432}${target.pathname} - Ctrl+C now if this isn't your local dev database.`,
  );

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const permissionIdByName = new Map<string, string>();
  for (const permission of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { name: permission.name },
      create: { id: randomUUID(), ...permission },
      update: { description: permission.description },
    });
    permissionIdByName.set(record.name, record.id);
  }

  const roleIdByName = new Map<string, string>();
  for (const role of ROLES) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      create: {
        id: randomUUID(),
        name: role.name,
        description: role.description,
      },
      update: { description: role.description },
    });
    roleIdByName.set(record.name, record.id);

    for (const permissionName of role.permissions) {
      const permissionId = permissionIdByName.get(permissionName);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: record.id, permissionId },
        },
        create: { roleId: record.id, permissionId },
        update: {},
      });
    }
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);

  for (const user of USERS) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: randomUUID(),
        name: user.name,
        email: user.email,
        passwordHash,
      },
      update: {},
    });

    const roleId = roleIdByName.get(user.role);
    if (!roleId) continue;

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: record.id, roleId } },
      create: { userId: record.id, roleId },
      update: {},
    });
  }

  console.log(
    `Seeded ${PERMISSIONS.length} permissions, ${ROLES.length} roles, ${USERS.length} users (password: "${SEED_PASSWORD}"):`,
  );
  for (const user of USERS) {
    console.log(`  - ${user.email} (${user.role})`);
  }

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
