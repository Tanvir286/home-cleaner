import { IsIn, IsNotEmpty } from 'class-validator';
import { VerificationStatus } from '@prisma/client'; 

export class CleanerStatusDto {
  @IsNotEmpty()
  @IsIn([VerificationStatus.VERIFIED, VerificationStatus.REJECTED])
  status: VerificationStatus;
}