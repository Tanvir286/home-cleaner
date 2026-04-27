import { IsIn, IsNotEmpty } from 'class-validator';
import { DangerStatus } from '@prisma/client'; 

export class DangerStatusDto {
  @IsNotEmpty()
  @IsIn([DangerStatus.COMPLETED, DangerStatus.REJECTED])
  status: DangerStatus;
}