import { IsOptional, IsString } from "class-validator";

export class CreateDestinationDto {

  @IsString()
  booking_id: string;

}