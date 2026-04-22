import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';


export class DangerDto {
 
@IsNotEmpty()
  @IsString()
  lat: string;

  @IsNotEmpty()
  @IsString()
  lng: string;

  @IsNotEmpty()
  @IsString()
  booking_id: string; 

 

}

