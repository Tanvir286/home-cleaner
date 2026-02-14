import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDepositDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Minimum deposit amount is 1 USD' })
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'usd';
}
