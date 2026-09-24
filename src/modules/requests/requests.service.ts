import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RequestStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestAssistanceService } from '../request-assistance/request-assistance.service';
import { CreateRequestCommentDto } from './dto/create-request-comment.dto';
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
  comments: {
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  aiAnalysis: true,
} satisfies Prisma.RequestInclude;

type RequestWithDetails = Prisma.RequestGetPayload<{ include: typeof requestInclude }>;

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assistance: RequestAssistanceService,
  ) {}

  getLifecycle() {
    return RequestLifecycle.describe();
  }

  async submit(user: AuthenticatedUser, input: CreateRequestDto) {
    const assistanceEnabled = this.assistance.isEnabled();
    const departments = await this.prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const department = departments.find((item) => item.id === input.departmentId);
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
        aiAnalysis: assistanceEnabled
          ? {
              create: {
                status: 'PENDING',
                ...this.assistance.pendingMetadata(),
              },
            }
          : undefined,
      },
      include: requestInclude,
    });

    if (!assistanceEnabled) {
      return this.toResponse(request);
    }

    try {
      const result = await this.assistance.interpret({
        title: request.title,
        description: request.description,
        selectedDepartmentId: request.departmentId,
        departments,
      });
      await this.prisma.requestAiAnalysis.update({
        where: { requestId: request.id },
        data: {
          status: 'COMPLETED',
          requestType: result.analysis.requestType,
          summary: result.analysis.summary,
          suggestedDepartmentId: result.analysis.suggestedDepartmentId,
          urgency: result.analysis.urgency,
          needsClarification: result.analysis.needsClarification,
          clarificationQuestion: result.analysis.clarificationQuestion,
          suggestedNextSteps: result.analysis.suggestedNextSteps,
          trustedContextKeys: result.analysis.trustedContextKeys,
          provider: result.provider,
          model: result.model,
          failureCode: null,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const failureCode = this.assistance.failureCode(error);
      this.logger.warn(`AI assistance failed for request ${request.id}: ${failureCode}`);
      await this.prisma.requestAiAnalysis.update({
        where: { requestId: request.id },
        data: {
          status: 'FAILED',
          failureCode,
          completedAt: new Date(),
        },
      });
    }

    return this.toResponse(await this.requireRequest(request.id));
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

    const resolutionNote = input.resolutionNote?.trim();
    if (input.status === RequestStatus.RESOLVED && !resolutionNote) {
      throw new BadRequestException('A resolution note is required to resolve a request.');
    }
    if (input.status !== RequestStatus.RESOLVED && resolutionNote) {
      throw new BadRequestException('A resolution note can only be added when resolving a request.');
    }

    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.request.updateMany({
        where: { id: requestId, currentStatus: input.expectedCurrentStatus },
        data: {
          currentStatus: input.status,
          resolvedAt: input.status === RequestStatus.RESOLVED ? new Date() : null,
          resolutionNote: input.status === RequestStatus.RESOLVED ? resolutionNote : null,
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

  async addComment(
    user: AuthenticatedUser,
    requestId: string,
    input: CreateRequestCommentDto,
  ) {
    const request = await this.requireRequest(requestId);
    if (!this.canView(user, request)) {
      throw new ForbiddenException('You do not have access to this request.');
    }
    if (request.currentStatus === RequestStatus.RESOLVED) {
      throw new ConflictException(
        'Resolved requests are closed and cannot receive new replies.',
      );
    }

    const isRequester = request.requesterId === user.id;
    if (isRequester) {
      if (!input.replyToCommentId) {
        throw new BadRequestException(
          'Employees can reply only to a staff message.',
        );
      }
      const staffMessage = request.comments.find(
        (comment) => comment.id === input.replyToCommentId,
      );
      if (
        !staffMessage
        || staffMessage.authorId === request.requesterId
        || staffMessage.replyToCommentId !== null
      ) {
        throw new BadRequestException(
          'Choose a staff message from this request to reply to.',
        );
      }
      const latestStaffMessage = [...request.comments]
        .reverse()
        .find((comment) => (
          comment.authorId !== request.requesterId
          && comment.replyToCommentId === null
        ));
      if (latestStaffMessage?.id !== staffMessage.id) {
        throw new BadRequestException(
          'Employees can reply only to the latest staff message.',
        );
      }
      if (request.comments.some(
        (comment) => comment.replyToCommentId === staffMessage.id,
      )) {
        throw new ConflictException(
          'This staff message already has an employee reply.',
        );
      }
    } else {
      if (request.currentStatus !== RequestStatus.IN_PROGRESS) {
        throw new ConflictException(
          'Staff can post messages only while the request is in progress.',
        );
      }
      if (input.replyToCommentId) {
        throw new BadRequestException(
          'Staff updates must be posted as new messages.',
        );
      }
    }

    try {
      await this.prisma.requestComment.create({
        data: {
          requestId,
          authorId: user.id,
          replyToCommentId: isRequester ? input.replyToCommentId : null,
          body: input.body.trim(),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This staff message already has an employee reply.',
        );
      }
      throw error;
    }

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
      requesterId: request.requesterId,
      requesterName: request.requester.name,
      departmentId: request.departmentId,
      departmentName: request.department.name,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      resolvedAt: request.resolvedAt?.toISOString() ?? null,
      resolutionNote: request.resolutionNote,
      allowedNextStatuses: RequestLifecycle.nextStatuses(request.currentStatus),
      statusHistory: request.statusEvents.map((event) => ({
        id: event.id,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        changedByName: event.changedBy.name,
        createdAt: event.createdAt.toISOString(),
      })),
      comments: request.comments.map((comment) => ({
        id: comment.id,
        authorName: comment.author.name,
        authorRole: comment.authorId === request.requesterId ? 'EMPLOYEE' : 'STAFF',
        replyToCommentId: comment.replyToCommentId,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      })),
      aiAssistance: request.aiAnalysis
        ? {
            status: request.aiAnalysis.status,
            requestType: request.aiAnalysis.requestType,
            summary: request.aiAnalysis.summary,
            suggestedDepartmentId: request.aiAnalysis.suggestedDepartmentId,
            urgency: request.aiAnalysis.urgency,
            needsClarification: request.aiAnalysis.needsClarification,
            clarificationQuestion: request.aiAnalysis.clarificationQuestion,
            suggestedNextSteps: request.aiAnalysis.suggestedNextSteps,
            model: request.aiAnalysis.model,
            promptVersion: request.aiAnalysis.promptVersion,
            failureCode: request.aiAnalysis.failureCode,
          }
        : null,
    };
  }
}
