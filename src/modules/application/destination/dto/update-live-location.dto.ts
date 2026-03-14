import { IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLiveLocationDto {
  @IsString()
  booking_id: string;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;
}