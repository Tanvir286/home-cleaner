import { PartialType } from '@nestjs/swagger';
import { CreateTransectionDto } from './create-transection.dto';

export class UpdateTransectionDto extends PartialType(CreateTransectionDto) {}
