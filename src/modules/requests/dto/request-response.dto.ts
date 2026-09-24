import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus } from '../requests.data';

export class RequestStatusEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ enum: RequestStatus, nullable: true })
  fromStatus: RequestStatus | null;

  @ApiProperty({ enum: RequestStatus })
  toStatus: RequestStatus;

  @ApiProperty()
  changedByName: string;

  @ApiProperty()
  createdAt: string;
}

export class RequestCommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  authorName: string;

  @ApiProperty({ enum: ['EMPLOYEE', 'STAFF'] })
  authorRole: 'EMPLOYEE' | 'STAFF';

  @ApiPropertyOptional({ nullable: true })
  replyToCommentId: string | null;

  @ApiProperty()
  body: string;

  @ApiProperty()
  createdAt: string;
}

export class RequestAiAssistanceResponseDto {
  @ApiProperty({ enum: ['PENDING', 'COMPLETED', 'FAILED'] })
  status: 'PENDING' | 'COMPLETED' | 'FAILED';

  @ApiPropertyOptional({ nullable: true })
  requestType: string | null;

  @ApiPropertyOptional({ nullable: true })
  summary: string | null;

  @ApiPropertyOptional({ nullable: true })
  suggestedDepartmentId: string | null;

  @ApiPropertyOptional({ enum: ['LOW', 'NORMAL', 'HIGH'], nullable: true })
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | null;

  @ApiPropertyOptional({ nullable: true })
  needsClarification: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  clarificationQuestion: string | null;

  @ApiProperty({ type: [String] })
  suggestedNextSteps: string[];

  @ApiPropertyOptional({ nullable: true })
  model: string | null;

  @ApiProperty()
  promptVersion: string;

  @ApiPropertyOptional({ nullable: true })
  failureCode: string | null;
}

export class RequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: RequestStatus })
  currentStatus: RequestStatus;

  @ApiProperty()
  requesterName: string;

  @ApiProperty()
  requesterId: string;

  @ApiProperty()
  departmentId: string;

  @ApiProperty()
  departmentName: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional({ nullable: true })
  resolvedAt: string | null;

  @ApiPropertyOptional({ nullable: true })
  resolutionNote: string | null;

  @ApiProperty({ enum: RequestStatus, isArray: true })
  allowedNextStatuses: RequestStatus[];

  @ApiProperty({ type: [RequestStatusEventResponseDto] })
  statusHistory: RequestStatusEventResponseDto[];

  @ApiProperty({ type: [RequestCommentResponseDto] })
  comments: RequestCommentResponseDto[];

  @ApiPropertyOptional({ type: RequestAiAssistanceResponseDto, nullable: true })
  aiAssistance: RequestAiAssistanceResponseDto | null;
}
