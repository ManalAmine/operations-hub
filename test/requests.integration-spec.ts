import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaService } from '../src/prisma/prisma.service';
import { RequestsService } from '../src/modules/requests/requests.service';

describe('RequestsService database integration', () => {
  const prisma = new PrismaService();
  const service = new RequestsService(prisma);
  const suffix = randomUUID();
  const userId = `integration-user-${suffix}`;
  const departmentId = `integration-department-${suffix}`;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.department.create({
      data: { id: departmentId, name: `Integration Department ${suffix}` },
    });
    await prisma.user.create({
      data: {
        id: userId,
        name: 'Integration Employee',
        email: `integration-${suffix}@example.com`,
        passwordHash: 'not-used-by-this-test',
      },
    });
  });

  afterAll(async () => {
    await prisma.request.deleteMany({ where: { requesterId: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.department.deleteMany({ where: { id: departmentId } });
    await prisma.$disconnect();
  });

  it('persists a new request and its initial status event', async () => {
    const created = await service.submit(
      {
        id: userId,
        name: 'Integration Employee',
        email: `integration-${suffix}@example.com`,
        isAdmin: false,
        departmentIds: [],
      },
      {
        title: 'Integration test request',
        description: 'This request must be stored in PostgreSQL.',
        departmentId,
      },
    );

    const stored = await prisma.request.findUnique({
      where: { id: created.id },
      include: { statusEvents: true },
    });

    expect(stored?.currentStatus).toBe('SUBMITTED');
    expect(stored?.statusEvents).toHaveLength(1);
    expect(stored?.statusEvents[0].toStatus).toBe('SUBMITTED');
  });
});
