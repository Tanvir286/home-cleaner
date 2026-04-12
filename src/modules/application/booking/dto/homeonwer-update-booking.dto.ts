import { IsEnum } from "class-validator";

enum AllowedBookingStatus {
  CANCELLED = 'CANCELLED',
}

export class HomeownerUpdateBookingDto {

  @IsEnum(AllowedBookingStatus, {
    message: 'status must be either CANCELLED',
  })
  status: AllowedBookingStatus;

}
