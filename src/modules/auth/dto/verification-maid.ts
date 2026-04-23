
import { CreateUserDto } from './create-user.dto';
import { IsOptional } from 'class-validator';

export class UpdateUserDto  {

  @IsOptional()
  name?: string;

  @IsOptional()
  first_name?: string;

  @IsOptional()
  last_name?: string;

  @IsOptional()
  address?: string;

}
