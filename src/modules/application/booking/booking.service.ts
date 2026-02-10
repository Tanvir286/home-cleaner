import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto, ServiceTypeEnum } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a new booking
  async create(userId: string, dto: CreateBookingDto) {
  
    const maid = await this.prisma.user.findUnique({
      where: { id: dto.maid_id },
    });

    if (!maid) {
      throw new NotFoundException('Maid not found');
    }

    if (maid.type !== 'MAID') {
      throw new BadRequestException('Selected user is not a maid');
    }

    if (dto.maid_id === userId) {
      throw new BadRequestException('You cannot book yourself');
    }

    const existingBooking = await this.prisma.booking.findUnique({
      where: {
        maid_id_booking_date_slot: {
          maid_id: dto.maid_id,
          booking_date: new Date(dto.booking_date),
          slot: dto.slot,
        },
      },
    });

    if (existingBooking) {
      throw new BadRequestException(
        'This maid is already booked for the selected date and slot',
      );
    }

   
    let totalPrice: number | null = null;
    let deepCleaningPackageId: string | null = null;
    let generalCleaningPackageId: string | null = null;

    if (dto.service_type === ServiceTypeEnum.GENERAL_CLEANING) {
      const pkg = await this.prisma.generalCleaningPackage.findUnique({
        where: { id: dto.package_id },
      });
      if (!pkg) {
        throw new NotFoundException('General cleaning package not found');
      }
      generalCleaningPackageId = pkg.id;
      totalPrice = pkg.price ? Number(pkg.price) : null;
    }
     else {
      const pkg = await this.prisma.deepCleaningPackage.findUnique({
        where: { id: dto.package_id },
      });
      if (!pkg) {
        throw new NotFoundException('Deep cleaning package not found');
      }
      deepCleaningPackageId = pkg.id;
      totalPrice = pkg.price ? Number(pkg.price) : null;
    }

    // Create the booking
    const booking = await this.prisma.booking.create({
      data: {
        user_id: userId,
        maid_id: dto.maid_id,
        booking_date: new Date(dto.booking_date),
        slot: dto.slot,
        total_price: totalPrice,
        general_cleaning_package_id: generalCleaningPackageId,
        deep_cleaning_package_id: deepCleaningPackageId,
        status: 'PENDING',
      },
      include: {
        maid: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        general_cleaning_package: true,
        deep_cleaning_package: true,
      },
    });

    return {
      success: true,
      message: 'Booking created successfully',
      data: booking,
    };
  }

  
}
