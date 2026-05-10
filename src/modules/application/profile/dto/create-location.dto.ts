import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LocationType } from '@prisma/client';

export class CreateLocationDto {
  @IsOptional()
  @IsString()
  location_name?: string;

  @IsOptional()
  @IsEnum(LocationType)
  location_type?: LocationType;

  
}