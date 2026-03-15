import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateLiveLocationDto } from './dto/update-live-location.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('destination')
export class DestinationController {

  constructor(private readonly destinationService: DestinationService) {}

  // create destination for booking
  @Post()
  async create(
    @Body() createDestinationDto: CreateDestinationDto,
    @Req() req
  ) {
    const user_id = req.user.userId;
    return this.destinationService.create(createDestinationDto, user_id);
  }

 
 







}
