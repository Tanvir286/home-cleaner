import { BookingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';


enum BookingStatus2 {
    COMPLETED = 'COMPLETED',  
}

export class PaginationstausDto {

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perPage: number = 10;

  @IsEnum(BookingStatus2)
  bookingStatus: string;  

}
