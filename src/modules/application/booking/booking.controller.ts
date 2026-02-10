import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {

  constructor(private readonly bookingService: BookingService) {}

  // Create a new booking
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @Post()
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Req() req) {
    const userId = req.user.userId;
    return await this.bookingService.create(userId, createBookingDto);
  }

  //  






  
}
