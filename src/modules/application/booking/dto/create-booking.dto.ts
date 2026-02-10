import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';

export enum ServiceTypeEnum {
  GENERAL_CLEANING = 'GENERAL_CLEANING',
  DEEP_CLEANING = 'DEEP_CLEANING',
}

export enum SlotEnum {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export class CreateBookingDto {

  @IsNotEmpty()
  @IsString()
  maid_id: string;

  @IsNotEmpty()
  @IsEnum(ServiceTypeEnum)
  service_type: ServiceTypeEnum;

  @ApiProperty({ description: 'Package ID (general or deep cleaning)', example: 'clxyz456' })
  @IsNotEmpty()
  @IsString()
  package_id: string;

  @ApiProperty({ description: 'Booking date (YYYY-MM-DD)', example: '2026-03-15' })
  @IsNotEmpty()
  @IsString()
  booking_date: string;

  @ApiProperty({ description: 'Time slot', enum: SlotEnum, example: 'A' })
  @IsNotEmpty()
  @IsEnum(SlotEnum)
  slot: SlotEnum;
}
