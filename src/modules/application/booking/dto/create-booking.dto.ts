import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum SlotEnum {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export class CreateBookingDto {
 
  @ApiProperty({ description: 'Maid user ID', example: 'clxyz123' })
  @IsNotEmpty()
  @IsString()
  maid_id: string;

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

  @ApiProperty({ description: 'Service address', example: '123 Main St, Cityville' })
  @IsNotEmpty()
  @IsString()
  address: string;

}
