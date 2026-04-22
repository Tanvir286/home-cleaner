import { Transform } from 'class-transformer';
import { IsEnum } from 'class-validator';

enum AllowedBookingStatus {
  STARTED = 'STARTED',
}

export class StartedBookingDto {
 
  @IsEnum(AllowedBookingStatus, {
    message: 'status must be either STARTED',
  })
  status: AllowedBookingStatus;

}
