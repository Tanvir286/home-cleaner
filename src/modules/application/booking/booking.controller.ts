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

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * ------------------------------------------------
   * Create Booking (Homeowner)
   * ------------------------------------------------
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @Post()
  async createBooking(
    @Body() createBookingDto: CreateBookingDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.bookingService.create(userId, createBookingDto);
  }

  /**
   * ------------------------------------------------
   * Get Maid Monthly Slot Availability
   * ------------------------------------------------
   */
  @Get('slots/:maidId')
  async getMaidSlots(
    @Param('maidId') maidId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.bookingService.getMaidSlots(maidId, +month, +year);
  }

  /**
   * ------------------------------------------------
   * Homeowner Booking APIs
   * ------------------------------------------------
   */

  /**
   * Get All Bookings of Logged-in Homeowner
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @Get('homeowner/my-bookings')
  async getMyBookings(
    @Req() req,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = req.user.userId;
    return this.bookingService.getMyBookings(userId, paginationDto);
  }

  /**
   * Get Homeowner Bookings with Status Filter
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @Get('homeowner/bookings-by-status')
  async getBookingsByStatus(
    @Req() req,
    @Query() query: PaginationstausDto,
  ) {
    const userId = req.user.userId;
    return this.bookingService.getAllBookingsWithStatus(userId, query);
  }

  /**
   * ------------------------------------------------
   * Update Booking Status
   * ------------------------------------------------
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @Patch(':id')
  async updateBookingStatus(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.bookingService.updateBookingStatus(
      id,
      userId,
      updateBookingDto,
    );
  }

  /**
   * ------------------------------------------------
   * Maid Booking APIs
   * ------------------------------------------------
   */

  /**
   * Get Bookings Assigned to Maid
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Get('maid/my-bookings')
  async getMaidBookings(
    @Req() req,
    @Query() paginationDto: PaginationDto,
  ) {
    const userId = req.user.userId;
    return this.bookingService.getMaidBookings(userId, paginationDto);
  }

  /**
   * Get Maid Bookings with Status Filter
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Get('maid/bookings-by-status')
  async getMaidBookingsByStatus(
    @Req() req,
    @Query() query: PaginationstausDto,
  ) {
    const userId = req.user.userId;
    return this.bookingService.getAllBookingsWithStatusMaid(userId, query);
  }
}