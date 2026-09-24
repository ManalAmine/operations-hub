import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RequestAssistanceService } from '../../src/modules/request-assistance/request-assistance.service';
import { RequestsService } from '../../src/modules/requests/requests.service';

describe('RequestsService database integration', () => {
  const prisma = new PrismaService();
  const assistance = {
    isEnabled: () => false,
  } as unknown as RequestAssistanceService;
  const service = new RequestsService(prisma, assistance);
  const suffix = randomUUID();
  const userId = `integration-user-${suffix}`;
  const staffId = `integration-staff-${suffix}`;
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
    await prisma.user.create({
      data: {
        id: staffId,
        name: 'Integration Staff',
        email: `integration-staff-${suffix}@example.com`,
        passwordHash: 'not-used-by-this-test',
        memberships: { create: { departmentId } },
      },
    });
  });

  afterAll(async () => {
    await prisma.request.deleteMany({ where: { requesterId: userId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, staffId] } } });
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

  it('persists a validated AI analysis without changing the request lifecycle', async () => {
    const aiAssistance = {
      isEnabled: () => true,
      pendingMetadata: () => ({
        provider: 'test-provider',
        model: 'test-model',
        promptVersion: 'request-interpreter-test',
      }),
      interpret: async () => ({
        provider: 'test-provider',
        model: 'test-model',
        analysis: {
          requestType: 'IT_HARDWARE',
          summary: 'Employee laptop is not working.',
          suggestedDepartmentId: departmentId,
          urgency: 'NORMAL',
          needsClarification: false,
          clarificationQuestion: null,
          suggestedNextSteps: ['Contact the responsible department through Operations Hub.'],
          trustedContextKeys: ['operations.contact.department'],
        },
      }),
      failureCode: () => 'PROVIDER_UNAVAILABLE',
    } as unknown as RequestAssistanceService;
    const aiService = new RequestsService(prisma, aiAssistance);

    const created = await aiService.submit(
      {
        id: userId,
        name: 'Integration Employee',
        email: `integration-${suffix}@example.com`,
        isAdmin: false,
        departmentIds: [],
      },
      {
        title: 'Laptop assistance',
        description: 'The laptop stopped working before an important meeting.',
        departmentId,
      },
    );

    expect(created.currentStatus).toBe('SUBMITTED');
    expect(created.aiAssistance).toMatchObject({
      status: 'COMPLETED',
      requestType: 'IT_HARDWARE',
      model: 'test-model',
    });
  });

  it('keeps the request when the AI provider fails', async () => {
    const unavailableAssistance = {
      isEnabled: () => true,
      pendingMetadata: () => ({
        provider: 'test-provider',
        model: 'test-model',
        promptVersion: 'request-interpreter-test',
      }),
      interpret: async () => {
        throw new Error('provider secret should not leave the backend');
      },
      failureCode: () => 'PROVIDER_UNAVAILABLE',
    } as unknown as RequestAssistanceService;
    const aiService = new RequestsService(prisma, unavailableAssistance);

    const created = await aiService.submit(
      {
        id: userId,
        name: 'Integration Employee',
        email: `integration-${suffix}@example.com`,
        isAdmin: false,
        departmentIds: [],
      },
      {
        title: 'Provider failure request',
        description: 'This request must survive an unavailable AI provider.',
        departmentId,
      },
    );

    expect(created.currentStatus).toBe('SUBMITTED');
    expect(created.aiAssistance).toMatchObject({
      status: 'FAILED',
      failureCode: 'PROVIDER_UNAVAILABLE',
    });
    expect(JSON.stringify(created)).not.toContain('provider secret');
  });

  it('allows staff to start and resolve work without posting comments', async () => {
    const employee = {
      id: userId,
      name: 'Integration Employee',
      email: `integration-${suffix}@example.com`,
      isAdmin: false,
      departmentIds: [],
    };
    const staff = {
      id: staffId,
      name: 'Integration Staff',
      email: `integration-staff-${suffix}@example.com`,
      isAdmin: false,
      departmentIds: [departmentId],
    };
    const created = await service.submit(employee, {
      title: 'No-comment lifecycle request',
      description: 'Status changes must not depend on conversation messages.',
      departmentId,
    });

    const inProgress = await service.updateStatus(staff, created.id, {
      status: 'IN_PROGRESS',
      expectedCurrentStatus: 'SUBMITTED',
    });
    expect(inProgress.comments).toHaveLength(0);

    const resolved = await service.updateStatus(staff, created.id, {
      status: 'RESOLVED',
      expectedCurrentStatus: 'IN_PROGRESS',
      resolutionNote: 'The request was completed without requiring a separate update.',
    });
    expect(resolved.currentStatus).toBe('RESOLVED');
    expect(resolved.comments).toHaveLength(0);
  });

  it('supports optional replies while active and closes the conversation after resolution', async () => {
    const employee = {
      id: userId,
      name: 'Integration Employee',
      email: `integration-${suffix}@example.com`,
      isAdmin: false,
      departmentIds: [],
    };
    const staff = {
      id: staffId,
      name: 'Integration Staff',
      email: `integration-staff-${suffix}@example.com`,
      isAdmin: false,
      departmentIds: [departmentId],
    };
    const created = await service.submit(employee, {
      title: 'Conversation test request',
      description: 'The employee and department need to exchange updates.',
      departmentId,
    });

    await expect(
      service.addComment(employee, created.id, {
        body: 'The employee must not start the conversation.',
      }),
    ).rejects.toThrow('Employees can reply only to a staff message');

    await expect(
      service.addComment(staff, created.id, {
        body: 'Staff must mark the request in progress before posting a message.',
      }),
    ).rejects.toThrow('only while the request is in progress');

    await service.updateStatus(staff, created.id, {
      status: 'IN_PROGRESS',
      expectedCurrentStatus: 'SUBMITTED',
    });

    const withFirstStaffMessage = await service.addComment(staff, created.id, {
      body: 'We have started checking the device.',
    });
    const firstStaffMessageId = withFirstStaffMessage.comments[0].id;
    const withLatestStaffMessage = await service.addComment(staff, created.id, {
      body: 'Does the issue still happen after restarting the device?',
    });
    const staffMessageId = withLatestStaffMessage.comments[1].id;
    await expect(
      service.addComment(employee, created.id, {
        body: 'This response targets an outdated staff message.',
        replyToCommentId: firstStaffMessageId,
      }),
    ).rejects.toThrow('latest staff message');
    const withEmployeeReply = await service.addComment(employee, created.id, {
      body: 'The issue also happens after restarting the device.',
      replyToCommentId: staffMessageId,
    });

    expect(withEmployeeReply.comments.map((comment) => comment.authorName)).toEqual([
      'Integration Staff',
      'Integration Staff',
      'Integration Employee',
    ]);
    expect(withEmployeeReply.comments[2].replyToCommentId).toBe(staffMessageId);
    await expect(
      service.addComment(employee, created.id, {
        body: 'A second reply to the same staff message must be rejected.',
        replyToCommentId: staffMessageId,
      }),
    ).rejects.toThrow('already has an employee reply');
    await expect(
      service.addComment(staff, created.id, {
        body: 'Staff messages must remain top-level updates.',
        replyToCommentId: staffMessageId,
      }),
    ).rejects.toThrow('Staff updates must be posted as new messages');

    await expect(
      service.updateStatus(staff, created.id, {
        status: 'RESOLVED',
        expectedCurrentStatus: 'IN_PROGRESS',
      }),
    ).rejects.toThrow('A resolution note is required');

    const resolved = await service.updateStatus(staff, created.id, {
      status: 'RESOLVED',
      expectedCurrentStatus: 'IN_PROGRESS',
      resolutionNote: 'The approved replacement adapter was issued and tested successfully.',
    });

    expect(resolved.currentStatus).toBe('RESOLVED');
    expect(resolved.resolutionNote).toContain('replacement adapter');
    await expect(
      service.addComment(employee, created.id, {
        body: 'This reply must not be added after resolution.',
        replyToCommentId: staffMessageId,
      }),
    ).rejects.toThrow('Resolved requests are closed');
    await expect(
      service.addComment(staff, created.id, {
        body: 'Staff must not add another update after resolution.',
      }),
    ).rejects.toThrow('Resolved requests are closed');
  });
});
