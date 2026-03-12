import { IsOptional, IsString } from "class-validator";

export class CreateDestinationDto {

  @IsOptional()
  @IsString()
  pickup_location?: string = "2045 Lodgeville Street, Eagan, MN 55123, USA";

  @IsOptional()
  @IsString()
  dropoff_location?: string = "2700 Pilot Knob Road, Eagan, MN 55121, USA";
}