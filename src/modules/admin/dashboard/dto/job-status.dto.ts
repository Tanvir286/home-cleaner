import { BookingStatus } from '@prisma/client';
import { IsIn, IsNotEmpty } from 'class-validator';
 

export class JobStatusDto {
  @IsNotEmpty()
  @IsIn([BookingStatus.COMPLETED, BookingStatus.REJECTED])
  status: BookingStatus;
}