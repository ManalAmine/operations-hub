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
  departmentId: string;

  @ApiProperty()
  departmentName: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ enum: RequestStatus, isArray: true })
  allowedNextStatuses: RequestStatus[];

  @ApiProperty({ type: [RequestStatusEventResponseDto] })
  statusHistory: RequestStatusEventResponseDto[];
}
