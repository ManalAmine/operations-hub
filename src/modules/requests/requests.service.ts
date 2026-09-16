import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RequestStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { RequestLifecycle } from './requests.lifecycle';

const requestInclude = {
  requester: { select: { name: true } },
  department: { select: { name: true } },
  statusEvents: {
    include: { changedBy: { select: { name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.RequestInclude;

type RequestWithDetails = Prisma.RequestGetPayload<{ include: typeof requestInclude }>;

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  getLifecycle() {
    return RequestLifecycle.describe();
  }

  async submit(user: AuthenticatedUser, input: CreateRequestDto) {
    const department = await this.prisma.department.findFirst({
      where: { id: input.departmentId, isActive: true },
    });
    if (!department) {
      throw new BadRequestException('Choose an active department.');
    }

    const request = await this.prisma.request.create({
      data: {
        requesterId: user.id,
        departmentId: input.departmentId,
        title: input.title.trim(),
        description: input.description.trim(),
        statusEvents: {
          create: {
            fromStatus: null,
            toStatus: RequestStatus.SUBMITTED,
            changedByUserId: user.id,
          },
        },
      },
      include: requestInclude,
    });
    return this.toResponse(request);
  }

  async findAll(user: AuthenticatedUser) {
    const where: Prisma.RequestWhereInput = user.isAdmin
      ? {}
      : {
          OR: [
            { requesterId: user.id },
            { departmentId: { in: user.departmentIds } },
          ],
        };
    const requests = await this.prisma.request.findMany({
      where,
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((request) => this.toResponse(request));
  }

  async findOne(user: AuthenticatedUser, requestId: string) {
    const request = await this.requireRequest(requestId);
    if (!this.canView(user, request)) {
      throw new ForbiddenException('You do not have access to this request.');
    }
    return this.toResponse(request);
  }

  async updateStatus(
    user: AuthenticatedUser,
    requestId: string,
    input: UpdateRequestStatusDto,
  ) {
    const request = await this.requireRequest(requestId);
    if (!user.isAdmin && !user.departmentIds.includes(request.departmentId)) {
      throw new ForbiddenException(
        'Only staff in the responsible department can update this request.',
      );
    }
    if (request.currentStatus !== input.expectedCurrentStatus) {
      throw new ConflictException(
        `Request state changed. Expected ${input.expectedCurrentStatus}, but it is ${request.currentStatus}.`,
      );
    }
    if (!RequestLifecycle.canTransition(request.currentStatus, input.status)) {
      throw new ConflictException(
        `Transition ${request.currentStatus} -> ${input.status} is not allowed.`,
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.request.updateMany({
        where: { id: requestId, currentStatus: input.expectedCurrentStatus },
        data: {
          currentStatus: input.status,
          resolvedAt: input.status === RequestStatus.RESOLVED ? new Date() : null,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'The request was updated by someone else. Refresh and try again.',
        );
      }
      await transaction.requestStatusEvent.create({
        data: {
          requestId,
          fromStatus: request.currentStatus,
          toStatus: input.status,
          changedByUserId: user.id,
        },
      });
    });

    return this.toResponse(await this.requireRequest(requestId));
  }

  private async requireRequest(requestId: string): Promise<RequestWithDetails> {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: requestInclude,
    });
    if (!request) {
      throw new NotFoundException(`Request ${requestId} was not found.`);
    }
    return request;
  }

  private canView(user: AuthenticatedUser, request: RequestWithDetails): boolean {
    return (
      user.isAdmin ||
      request.requesterId === user.id ||
      user.departmentIds.includes(request.departmentId)
    );
  }

  private toResponse(request: RequestWithDetails) {
    return {
      id: request.id,
      title: request.title,
      description: request.description,
      currentStatus: request.currentStatus,
      requesterName: request.requester.name,
      departmentId: request.departmentId,
      departmentName: request.department.name,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      resolvedAt: request.resolvedAt?.toISOString() ?? null,
      allowedNextStatuses: RequestLifecycle.nextStatuses(request.currentStatus),
      statusHistory: request.statusEvents.map((event) => ({
        id: event.id,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        changedByName: event.changedBy.name,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }
}
