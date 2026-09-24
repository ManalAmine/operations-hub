const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .then(() => console.log('Seeded departments. Use npm run user:provision to create users.'))
  .finally(async () => prisma.$disconnect());
