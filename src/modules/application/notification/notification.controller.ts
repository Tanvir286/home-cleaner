import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PaginationDto } from 'src/common/pagination';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // get all notification
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Req() req:any,
    @Query() paginationdto: PaginationDto,
    ) {
    const userId = req.user.userId;
    return this.notificationService.findAll(userId, paginationdto);
  }


  //
  





}
