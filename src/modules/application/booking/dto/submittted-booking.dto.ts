import { IsEnum, IsNotEmpty, IsSemVer, IsString } from "class-validator";

enum AllowedBookingStatus {
  SUBMITTED = 'SUBMITTED',
}

export class SubmittedBookingDto {

  @IsEnum(AllowedBookingStatus, {
    message: 'status must be either SUBMITTED',
  })
  status: AllowedBookingStatus;

  @IsString()
  maid_note: string;

}
