import { Module } from '@nestjs/common';
import { DestinationService } from './destination.service';
import { DestinationController } from './destination.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DestinationGateway } from './destination.gateway';


@Module({
  imports: [
    PrismaModule
  ],
  controllers: [DestinationController],
  providers: [DestinationService, DestinationGateway],
})
export class DestinationModule {}
