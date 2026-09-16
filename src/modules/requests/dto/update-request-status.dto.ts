import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RequestStatus } from '../requests.data';

export class UpdateRequestStatusDto {
  @ApiProperty({ enum: RequestStatus, example: RequestStatus.IN_PROGRESS })
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @ApiProperty({ enum: RequestStatus, example: RequestStatus.SUBMITTED })
  @IsEnum(RequestStatus)
  expectedCurrentStatus: RequestStatus;
}
