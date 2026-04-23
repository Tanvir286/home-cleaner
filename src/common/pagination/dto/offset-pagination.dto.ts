import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, IsIn } from 'class-validator';

export class PaginationDto {
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

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['name', 'email'])
  orderby?: 'name' | 'email';


  @IsOptional()
  @IsString()
  @IsIn(['id', 'maid_id', 'user_id', 'created_at'])
  bookingorderby?: 'id' | 'maid_id' | 'user_id' | 'created_at';

}