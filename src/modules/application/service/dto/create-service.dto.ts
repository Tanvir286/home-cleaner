import { IsEnum, IsNumber, IsString } from 'class-validator';
import { ServiceType, PackageType } from '@prisma/client';

export class CreateServiceDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsString()
  title: string;

  @IsEnum(PackageType)
  packageType: PackageType;

  @IsString()
  description: string;

  @IsString()
  duration: string;

  @IsNumber()
  price: number;
}