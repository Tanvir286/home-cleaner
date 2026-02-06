import { ApiProperty } from '@nestjs/swagger';
import { UserType } from 'prisma/generated/enums';
import { IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
 
  @IsOptional()
  @ApiProperty()
  name?: string;

  @IsNotEmpty()
  @ApiProperty()
  first_name?: string;

  @IsNotEmpty()
  @ApiProperty()
  last_name?: string;

  @IsNotEmpty()
  @ApiProperty()
  address?: string;

  @IsNotEmpty()
  @ApiProperty()
  email?: string;

  @IsNotEmpty()
  @MinLength(8, { message: 'Password should be minimum 8' })
  @ApiProperty()
  password: string;

  @IsOptional()
  @IsEnum(UserType, { message: 'Invalid user type' })
  @ApiProperty({
    enum: UserType,
    example: UserType.USER,
  })
  type?: UserType;

  
}
