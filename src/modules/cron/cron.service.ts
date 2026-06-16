import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { autoRejectPendingBookings } from './utils/cron.util';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs every day at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  handleDailyTask() {
    this.logger.debug('Running daily cron task at 2 AM');
    // Add your cron logic here
  }

  // Runs every 30 minutes 
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleInterval() {
    this.logger.debug('Running interval task every 30 minutes');
    await autoRejectPendingBookings(this.prisma);
  }
}
