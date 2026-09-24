require('dotenv/config');

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  const name = required('PROVISION_USER_NAME');
  const email = required('PROVISION_USER_EMAIL').toLowerCase();
  const password = required('PROVISION_USER_PASSWORD');
  const isAdmin = process.env.PROVISION_USER_IS_ADMIN?.toLowerCase() === 'true';
  const departmentIds = (process.env.PROVISION_USER_DEPARTMENT_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (password.length < 12) {
    throw new Error('PROVISION_USER_PASSWORD must contain at least 12 characters.');
  }

  const departments = await prisma.department.findMany({
    where: { id: { in: departmentIds }, isActive: true },
    select: { id: true },
  });
  const knownIds = new Set(departments.map((department) => department.id));
  const unknownIds = departmentIds.filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) {
    throw new Error(`Unknown or inactive department IDs: ${unknownIds.join(', ')}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.user.upsert({
      where: { email },
      update: { name, passwordHash, isAdmin },
      create: { name, email, passwordHash, isAdmin },
    });
    await transaction.departmentMembership.deleteMany({ where: { userId: saved.id } });
    if (departmentIds.length > 0) {
      await transaction.departmentMembership.createMany({
        data: departmentIds.map((departmentId) => ({ userId: saved.id, departmentId })),
      });
    }
    return saved;
  });

  console.log(`Provisioned ${user.email} without exposing the password.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
