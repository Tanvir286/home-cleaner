import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationDto, paginateResponse } from 'src/common/pagination';

import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PaginationstausDto } from './dto/params-booking.dto';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  /*
  ========================================================
  HELPER METHODS start
  ========================================================
  */

  // Resolve package type (General / Deep Cleaning)
  private async resolvePackage(packageId: string) {
    const [generalPackage, deepPackage] = await Promise.all([
      this.prisma.generalCleaningPackage.findUnique({
        where: { id: packageId },
      }),
      this.prisma.deepCleaningPackage.findUnique({
        where: { id: packageId },
      }),
    ]);

    if (generalPackage) {
      return {
        general_cleaning_package_id: generalPackage.id,
        deep_cleaning_package_id: null,
        total_price: generalPackage.price ? Number(generalPackage.price) : null,
      };
    }

    if (deepPackage) {
      return {
        general_cleaning_package_id: null,
        deep_cleaning_package_id: deepPackage.id,
        total_price: deepPackage.price ? Number(deepPackage.price) : null,
      };
    }

    throw new NotFoundException('Selected package not found');
  }

  // Validate maid existence and type
  private async validateMaid(maidId: string, userId: string) {
    const maid = await this.prisma.user.findUnique({
      where: { id: maidId },
    });

    if (!maid) throw new NotFoundException('Maid not found');

    if (maid.type !== 'MAID') {
      throw new BadRequestException('Selected user is not a maid');
    }

    if (maidId === userId) {
      throw new BadRequestException('You cannot book yourself');
    }
  }

  // Check if maid already booked on the selected slot
  private async checkSlotAvailability(
    maidId: string,
    bookingDate: Date,
    slot: string,
  ) {
    const existingBooking = await this.prisma.booking.findUnique({
      where: {
        maid_id_booking_date_slot: {
          maid_id: maidId,
          booking_date: bookingDate,
          slot: slot as any,
        },
      },
    });

    if (existingBooking) {
      throw new BadRequestException(
        'This maid is already booked for the selected date and slot',
      );
    }
  }

  /*
  ========================================================
  HELPER METHODS end
  ========================================================
  */

  // topic:﹝﹝﹝ available maid and  maid deatils ﹞﹞﹞

  // available maids list
  async getAvailableMaids(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const [total, maids] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { type: 'MAID' } }),
      this.prisma.user.findMany({
        where: { type: 'MAID' },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          location: true,
          experience_years: true,
          service_type: true,
        },
        skip,
        take: perPage,
      }),
    ]);

    return {
      success: true,
      message: 'Available maids retrieved successfully',
      data: paginateResponse(
        maids.map((maid) => ({
          id: maid.id,
          name: maid.name,
          email: maid.email,
          avatar: maid.avatar
            ? TanvirStorage.url(
                appConfig().storageUrl.avatar + '/' + maid.avatar,
              )
            : null,
          location: maid.location,
          experience_years: maid.experience_years,
          service_type: maid.service_type,
        })),
        total,
        page,
        perPage,
      ),
    };
  }

  // available maids list
  async getMaidSlots(maidId: string, month: number, year: number) {
    const maid = await this.prisma.user.findUnique({
      where: { id: maidId },
    });

    if (!maid) throw new NotFoundException('Maid not found');

    if (maid.type !== 'MAID') {
      throw new BadRequestException('Selected user is not a maid');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        maid_id: maidId,
        booking_date: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'PENDING' },
      },
      select: {
        booking_date: true,
        slot: true,
      },
    });

    const bookedMap = new Map<string, Set<string>>();

    for (const booking of bookings) {
      const dateKey = booking.booking_date.toLocaleDateString('en-CA');

      if (!bookedMap.has(dateKey)) {
        bookedMap.set(dateKey, new Set());
      }

      bookedMap.get(dateKey).add(booking.slot);
    }

    const slotTimeMap = {
      A: { start: '07:30', end: '10:00' },
      B: { start: '11:00', end: '01:30' },
      C: { start: '01:30', end: '04:00' },
      D: { start: '04:00', end: '07:30' },
    };

    const totalDays = endDate.getDate();
    const dates = [];

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dateKey = date.toLocaleDateString('en-CA');

      const bookedSlots = bookedMap.get(dateKey) || new Set();

      const slots = Object.entries(slotTimeMap).map(([slot, time]) => ({
        slot,
        label: `${time.start} - ${time.end}`,
        is_available: !bookedSlots.has(slot),
      }));

      const availableCount = slots.filter((s) => s.is_available).length;

      dates.push({
        date: dateKey,
        has_available_slot: availableCount > 0,
        available_count: availableCount,
        slots,
      });
    }

    return {
      success: true,
      message: 'Maid slots retrieved successfully',
      data: {
        maid_id: maidId,
        month,
        year,
        dates,
      },
    };
  }

  // topic:﹝﹝﹝ homeowner part ﹞﹞﹞

  async create(userId: string, dto: CreateBookingDto) {
  
    const { 
      maid_id, 
      package_id, 
      booking_date, 
      address, 
      slot 
    } = dto;

    const parsedDate = new Date(booking_date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);

    if (parsedDate < today) {
      throw new BadRequestException('You cannot book a date in the past');
    }

    await this.validateMaid(maid_id, userId);

    await this.checkSlotAvailability(maid_id, parsedDate, slot);

    const packageData = await this.resolvePackage(package_id);

    const booking = await this.prisma.booking.create({
      data: {
        user_id: userId,
        maid_id,
        booking_date: parsedDate,
        slot,
        address,
        status: 'PENDING',
        ...packageData,
      },
      include: {
        maid: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
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

  async getMyBookings(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;

    const skip = (page - 1) * perPage;

    const whereClause = {
      user_id: userId,
    };

    const [total, bookings] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: whereClause }),

      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          maid: true,
          general_cleaning_package: true,
          deep_cleaning_package: true,
        },
        orderBy: {
          booking_date: 'desc',
        },
        skip,
        take: perPage,
      }),
    ]);

    return {
      success: true,
      message: 'Homeowner bookings retrieved successfully',
      data: paginateResponse(bookings, total, page, perPage),
    };
  }

  async getAllBookingsWithStatus(userId: string, query: PaginationstausDto) {
    const { page, perPage, bookingStatus } = query;

    const skip = (page - 1) * perPage;

    const whereClause = {
      user_id: userId,
      status: bookingStatus as any,
    };

    const [total, bookings] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: whereClause }),

      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          maid: true,
          general_cleaning_package: true,
          deep_cleaning_package: true,
        },
        orderBy: {
          booking_date: 'desc',
        },
        skip,
        take: perPage,
      }),
    ]);

    return {
      success: true,
      message: 'Bookings retrieved successfully',
      data: paginateResponse(bookings, total, page, perPage),
    };
  }

  /*
  ========================================================
  UPDATE BOOKING STATUS
  ========================================================
  */

  async updateBookingStatus(
    bookingId: string,
    userId: string,
    dto: UpdateBookingDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.user_id !== userId) {
      throw new BadRequestException(
        'You are not allowed to update this booking',
      );
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: dto.status,
      },
    });

    return {
      success: true,
      message: 'Booking status updated successfully',
      data: updatedBooking,
    };
  }

  /*
  ========================================================
  MAID BOOKING APIS
  ========================================================
  */

  async getMaidBookings(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;

    const skip = (page - 1) * perPage;

    const whereClause = {
      maid_id: userId,
    };

    const [total, bookings] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: whereClause }),

      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          user: true,
          general_cleaning_package: true,
          deep_cleaning_package: true,
        },
        orderBy: {
          booking_date: 'desc',
        },
        skip,
        take: perPage,
      }),
    ]);

    return {
      success: true,
      message: 'Maid bookings retrieved successfully',
      data: paginateResponse(bookings, total, page, perPage),
    };
  }

  async getAllBookingsWithStatusMaid(
    userId: string,
    query: PaginationstausDto,
  ) {
    const { page, perPage, bookingStatus } = query;

    const skip = (page - 1) * perPage;

    const whereClause = {
      maid_id: userId,
      status: bookingStatus as any,
    };

    const [total, bookings] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: whereClause }),

      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          user: true,
          general_cleaning_package: true,
          deep_cleaning_package: true,
        },
        orderBy: {
          booking_date: 'desc',
        },
        skip,
        take: perPage,
      }),
    ]);

    return {
      success: true,
      message: 'Maid bookings retrieved successfully',
      data: paginateResponse(bookings, total, page, perPage),
    };
  }
}
