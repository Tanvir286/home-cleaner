import { IsEnum } from "class-validator";

enum AllowedBookingStatus {
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED'
}

export class UpdateBookingAcceptOrRejectDto {

  @IsEnum(AllowedBookingStatus, {
    message: 'status must be either CONFIRMED or REJECTED',
  })
  status: AllowedBookingStatus;

}
