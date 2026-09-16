import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRequestDto {
  @ApiProperty({ example: 'Laptop cannot connect to VPN', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'title must contain visible characters' })
  @MaxLength(120)
  title: string;

  @ApiProperty({
    example: 'The VPN connection times out after several seconds.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @Matches(/\S/, { message: 'description must contain visible characters' })
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 'department-it' })
  @IsString()
  @IsNotEmpty()
  departmentId: string;
}
