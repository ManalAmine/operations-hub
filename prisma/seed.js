const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await prisma.department.upsert({
    where: { id: 'department-it' },
    update: { name: 'IT', isActive: true },
    create: { id: 'department-it', name: 'IT', isActive: true },
  });
  await prisma.department.upsert({
    where: { id: 'department-hr' },
    update: { name: 'HR', isActive: true },
    create: { id: 'department-hr', name: 'HR', isActive: true },
  });
  await prisma.department.upsert({
    where: { id: 'department-finance' },
    update: { name: 'Finance', isActive: true },
    create: { id: 'department-finance', name: 'Finance', isActive: true },
  });

  const users = [
    { id: 'user-alice', name: 'Alice Employee', email: 'alice@example.com', isAdmin: false },
    { id: 'user-ivan', name: 'Ivan IT', email: 'ivan@example.com', isAdmin: false },
    { id: 'user-hannah', name: 'Hannah HR', email: 'hannah@example.com', isAdmin: false },
    { id: 'user-farah', name: 'Farah Finance', email: 'farah@example.com', isAdmin: false },
    { id: 'user-ada', name: 'Ada Admin', email: 'ada@example.com', isAdmin: true },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash, isAdmin: user.isAdmin },
      create: { ...user, passwordHash },
    });
  }

  await prisma.departmentMembership.upsert({
    where: { userId_departmentId: { userId: 'user-ivan', departmentId: 'department-it' } },
    update: {},
    create: { userId: 'user-ivan', departmentId: 'department-it' },
  });
  await prisma.departmentMembership.upsert({
    where: { userId_departmentId: { userId: 'user-hannah', departmentId: 'department-hr' } },
    update: {},
    create: { userId: 'user-hannah', departmentId: 'department-hr' },
  });
  await prisma.departmentMembership.upsert({
    where: { userId_departmentId: { userId: 'user-farah', departmentId: 'department-finance' } },
    update: {},
    create: { userId: 'user-farah', departmentId: 'department-finance' },
  });
}

main()
  .then(() => console.log('Seeded departments and demo users.'))
  .finally(async () => prisma.$disconnect());
