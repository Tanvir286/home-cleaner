

import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCommissionDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fixed_fee?: number;
}