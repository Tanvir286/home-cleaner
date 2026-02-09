import { IsArray, IsEnum, IsOptional } from 'class-validator';

export enum ServiceType {
  GENERAL_CLEANING = 'GENERAL_CLEANING',
  DEEP_CLEANING = 'DEEP_CLEANING',
}

export class UpdateProfileDto {
  @IsOptional()
  location?: string;

  @IsOptional()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ServiceType, { each: true })
  service_type?: ServiceType[];
}
