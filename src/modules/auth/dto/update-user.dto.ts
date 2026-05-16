import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { UserType } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {

  @IsOptional()
  name?: string;

  @IsOptional()
  first_name?: string;

  @IsOptional()
  last_name?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  @Type(() => String)
  @IsEnum(UserType)
  type?: UserType;

}
