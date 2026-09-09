import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  requesterId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'title must contain visible characters' })
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(10)
  @Matches(/\S/, { message: 'description must contain visible characters' })
  @MaxLength(2000)
  description: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;
}
