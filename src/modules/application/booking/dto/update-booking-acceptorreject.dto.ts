import { IsEnum } from "class-validator";

enum AllowedBookingStatus {
  CONFIRMED = 'CONFIRMED',

}

export class UpdateBookingAcceptOrRejectDto {

  @IsEnum(AllowedBookingStatus, {
    message: 'status must be either SUBMITTED',
  })
  status: AllowedBookingStatus;

}
