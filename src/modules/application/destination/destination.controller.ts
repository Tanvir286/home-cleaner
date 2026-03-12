import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

@Controller('destination')
export class DestinationController {
 
  constructor(private readonly destinationService: DestinationService) {}


  
 
}
