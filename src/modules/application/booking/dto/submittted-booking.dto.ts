import { IsEnum } from "class-validator";

enum AllowedBookingStatus {
  SUBMITTED = 'SUBMITTED',
}

export class SubmittedBookingDto {

  @IsEnum(AllowedBookingStatus, {
    message: 'status must be either SUBMITTED',
  })
  status: AllowedBookingStatus;

}
