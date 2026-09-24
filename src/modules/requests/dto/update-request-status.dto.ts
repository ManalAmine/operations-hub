import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus } from '../requests.data';

export class UpdateRequestStatusDto {
  @ApiProperty({ enum: RequestStatus, example: RequestStatus.IN_PROGRESS })
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @ApiProperty({ enum: RequestStatus, example: RequestStatus.SUBMITTED })
  @IsEnum(RequestStatus)
  expectedCurrentStatus: RequestStatus;

  @ApiPropertyOptional({
    description: 'Required when resolving a request.',
    example: 'The approved replacement charger was issued and the laptop now powers on.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Matches(/\S/, { message: 'resolutionNote must contain visible characters' })
  @MaxLength(1000)
  resolutionNote?: string;
}
