import { IsEnum } from "class-validator";

enum AllowedBookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class UpdateBookingDto {

  @IsEnum(AllowedBookingStatus, {
    message: 'status must be either CONFIRMED or CANCELLED',
  })
  status: AllowedBookingStatus;

}
