import { IsArray, IsEnum, IsOptional } from 'class-validator';

export enum ServiceType {
  GENERAL_CLEANING = 'GENERAL_CLEANING',
  DEEP_CLEANING = 'DEEP_CLEANING',
}

export class UpdateProfileDto {

  @IsOptional()
  name?: string;
 
  @IsOptional()
  location?: string;

  @IsOptional()
  about_me?: string;

  @IsOptional()
  experience_years?: number;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(ServiceType, { each: true })
  service_type?: ServiceType[];
}
