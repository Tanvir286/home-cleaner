import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';

import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

import { PaginationDto } from 'src/common/pagination';
import { PaginationstausDto } from './dto/params-booking.dto';

import { ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { HomeownerUpdateBookingDto } from './dto/homeonwer-update-booking.dto';
import { UpdateBookingAcceptOrRejectDto } from './dto/update-booking-acceptorreject.dto';
import { StartedBookingDto } from './dto/started-booking.dto';
import { DangerDto } from './dto/danger.dto';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /*-------------------------------------------------
  // topic:﹝﹝﹝ available maid and  maid deatils ﹞﹞﹞
  --------------------------------------------------*/

  // available maids list
  @Get('available-maidlist')
  async getAvailableMaids(@Query() paginationDto: PaginationDto) {
    return this.bookingService.getAvailableMaids(paginationDto);
  }

  // maid individual details slot
  @Get('slots/:maidId')
  async getMaidSlots(
    @Param('maidId') maidId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.bookingService.getMaidSlots(maidId, +month, +year);
  }

  /*-------------------------------------------------
  // topic:﹝﹝﹝ homeowner part ﹞﹞﹞
  --------------------------------------------------*/

  // create booking
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @Post()
  async createBooking(@Body() createBookingDto: CreateBookingDto, @Req() req) {
    const userId = req.user.userId;
    return this.bookingService.create(userId, createBookingDto);
  }

  // get homeowner bookings list
  // * (pending,upcoming,completed,cancelled) status filter
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @Get('homeowner/bookings-by-status')
  async getBookingsByStatus(@Req() req, @Query() query: PaginationstausDto) {
    const userId = req.user.userId;
    return this.bookingService.getAllBookingsWithStatus(userId, query);
  }

  // get every booking details information
  @Get('details/:id')
  async getBookingDetails(@Param('id') id: string) {
    return this.bookingService.getBookingDetails(id);
  }

  // booking cancel by homeowner  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @Patch('homeowner/cancel-booking/:id')
  async cancelBooking(
    @Req() req,
    @Param('id') id: string,
    @Body() updateBookingDto: HomeownerUpdateBookingDto,
  ) {
    const userId = req.user.userId;
    return this.bookingService.updateBookingStatusByHomeowner(
      userId,
      id,
      updateBookingDto,
    );
  }

  /*----------------------------------------
  // topic:﹝﹝﹝ maid part ﹞﹞﹞
  -----------------------------------------*/

  // dashboard data for maid
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Get('maid/dashboard')
  async getMaidDashboardData(@Req() req) {
    const maidId = req.user.userId;
    return this.bookingService.getMaidDashboardData(maidId);
  }

  // weekly statistics for maid
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Get('maid/weekly-statistics')
  async getMaidWeeklyStatistics(@Req() req) {
    const maidId = req.user.userId;
    return this.bookingService.getMaidWeeklyStatistics(maidId);
  }

  //  booking list pending for maid
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Get('maid/pending-bookings')
  async getPendingBookingsForMaid(
    @Req() req,
    @Query() paginationDto: PaginationDto,
  ) {
    const maidId = req.user.userId;
    return this.bookingService.getPendingBookingsForMaid(maidId, paginationDto);
  }

  // booking list individual details for maid
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Get('maid/booking-details/:id')
  async getBookingDetailsForMaid(@Req() req, @Param('id') id: string) {
    return this.bookingService.getBookingDetailsForMaid(id);
  }

  // booking status update by maid (accept, reject)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @UseInterceptors(
    FileFieldsInterceptor([], {
      storage: memoryStorage(),
    }),
  )
  @Patch('maid/update-booking-status/:id')
  async updateBookingStatusByMaid(
    @Req() req,
    @Param('id') id: string,
    @Body() UpdateBookingAcceptOrRejectDto: UpdateBookingAcceptOrRejectDto,
  ) {
    const maidId = req.user.userId;
    return this.bookingService.updateBookingStatusAcceptOrRejectByMaid(
      maidId,
      id,
      UpdateBookingAcceptOrRejectDto,
    );
  }

  // booking status (pending, upcoming, completed, cancelled,started)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Get('maid/booking-by-status')
  async getBookingsByStatusForMaid(
    @Req() req,
    @Query() query: PaginationstausDto,
  ) {
    const maidId = req.user.userId;
    return this.bookingService.getBookingsByStatusForMaid(maidId, query);
  }

  // booking started by maid
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Patch('maid/start-booking/:id')
  async startBookingByMaid(
    @Req() req,
    @Param('id') id: string,
    @Body() StartedBookingDto: StartedBookingDto,
  ) {
    const maidId = req.user.userId;
    return this.bookingService.startBookingByMaid(
      maidId,
      id,
      StartedBookingDto,
    );
  }

  // booking complete by maid
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'before_photos', maxCount: 5 },
        { name: 'after_photos', maxCount: 5 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  @Patch('maid/complete-booking/:id')
  async completeBookingByMaid(
    @Req() req,
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @UploadedFiles()
    imageFiles?: {
      before_photos?: Express.Multer.File[];
      after_photos?: Express.Multer.File[];
    },
  ) {
    const maidId = req.user.userId;
    return this.bookingService.completeBookingByMaid(
      maidId,
      id,
      updateBookingDto,
      imageFiles?.before_photos ?? [],
      imageFiles?.after_photos ?? [],
    );
  }

  /*----------------------------------------
  // topic:﹝﹝﹝ danger part ﹞﹞﹞
  -----------------------------------------*/

  // create danger booking
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Post('maid/create-danger/:id')
  async createDangerBooking(@Req() req, @Param('id') id: string) {
    const maidId = req.user.userId;
    return this.bookingService.createDangerBooking(maidId, id);
  }
}
