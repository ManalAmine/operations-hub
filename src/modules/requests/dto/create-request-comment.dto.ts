import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateRequestCommentDto {
  @ApiProperty({
    description: 'Optional staff message or targeted employee reply for an IN_PROGRESS request.',
    example: 'I restarted the laptop, but the screen is still blank.',
    maxLength: 2000,
  })
  @IsString()
  @Matches(/\S/, { message: 'body must contain visible characters' })
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({
    description: 'Required for an employee reply; identifies the staff message being answered.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  replyToCommentId?: string;
}
