import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  REQUESTS,
  RequestStatus,
  RequestStatusEvent,
  ServiceRequest,
} from './requests.data';
import { RequestLifecycle } from './requests.lifecycle';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@Injectable()
export class RequestsService {
  getLifecycle() {
    return RequestLifecycle.describe();
  }

  submit(input: CreateRequestDto) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const creationEvent: RequestStatusEvent = {
      id: randomUUID(),
      requestId: id,
      fromStatus: null,
      toStatus: RequestStatus.SUBMITTED,
      createdAt: now,
    };
    const request: ServiceRequest = {
      id,
      ...input,
      currentStatus: RequestStatus.SUBMITTED,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      statusHistory: [creationEvent],
    };

    REQUESTS.push(request);
    return this.withNextStatuses(request);
  }

  findAll() {
    return [...REQUESTS]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((request) => this.withNextStatuses(request));
  }

  findOne(requestId: string) {
    return this.withNextStatuses(this.requireRequest(requestId));
  }

  updateStatus(requestId: string, input: UpdateRequestStatusDto) {
    const request = this.requireRequest(requestId);

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

    const now = new Date().toISOString();
    request.statusHistory.push({
      id: randomUUID(),
      requestId,
      fromStatus: request.currentStatus,
      toStatus: input.status,
      createdAt: now,
    });
    request.currentStatus = input.status;
    request.updatedAt = now;
    request.resolvedAt =
      input.status === RequestStatus.RESOLVED ? now : null;

    return this.withNextStatuses(request);
  }

  private requireRequest(requestId: string): ServiceRequest {
    const request = REQUESTS.find((item) => item.id === requestId);

    if (!request) {
      throw new NotFoundException(`Request ${requestId} was not found.`);
    }

    return request;
  }

  private withNextStatuses(request: ServiceRequest) {
    return {
      ...structuredClone(request),
      allowedNextStatuses: RequestLifecycle.nextStatuses(request.currentStatus),
    };
  }
}
