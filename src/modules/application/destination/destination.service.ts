import { Injectable } from '@nestjs/common';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DestinationService {
  
  constructor(private readonly prisma: PrismaService) {}




  
}
