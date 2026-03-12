import { Controller, Post, Body } from '@nestjs/common';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';

@Controller('destination')
export class DestinationController {

  constructor(private readonly destinationService: DestinationService) {}

  // create destination and return distance in km
  @Post()
  async create(
    @Body() createDestinationDto: CreateDestinationDto) {
    return this.destinationService.create(createDestinationDto);
  }
}
