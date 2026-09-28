import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports liveness without depending on the database', () => {
    const prisma = {} as PrismaService;
    const controller = new HealthController(prisma);

    expect(controller.live()).toEqual({
      status: 'ok',
      service: 'operations-hub-api',
    });
  });

  it('reports readiness when the database responds', async () => {
    const queryRaw = jest.fn<PrismaService['$queryRaw']>().mockResolvedValue([{ '?column?': 1 }]);
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
    const controller = new HealthController(prisma);

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up' },
    });
  });

  it('returns service unavailable when the database cannot be reached', async () => {
    const queryRaw = jest.fn<PrismaService['$queryRaw']>().mockRejectedValue(new Error('offline'));
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
    const controller = new HealthController(prisma);

    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
