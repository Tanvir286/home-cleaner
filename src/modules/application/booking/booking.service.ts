import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  // resolve package type and price
  private async resolvePackage(packageId: string) {
    const [generalPkg, deepPkg] = await Promise.all([
      this.prisma.generalCleaningPackage.findUnique({
        where: { id: packageId },
      }),
      this.prisma.deepCleaningPackage.findUnique({ where: { id: packageId } }),
    ]);

    if (generalPkg) {
      return {
        general_cleaning_package_id: generalPkg.id,
        deep_cleaning_package_id: null,
        total_price: generalPkg.price ? Number(generalPkg.price) : null,
      };
    }

    if (deepPkg) {
      return {
        general_cleaning_package_id: null,
        deep_cleaning_package_id: deepPkg.id,
        total_price: deepPkg.price ? Number(deepPkg.price) : null,
      };
    }
    throw new NotFoundException('Package not found');
  }

  // validate maid existence and type
  private async validateMaid(maidId: string, userId: string) {
    const maid = await this.prisma.user.findUnique({
      where: { id: maidId },
    });

    if (!maid) throw new NotFoundException('Maid not found');
    if (maid.type !== 'MAID')
      throw new BadRequestException('Selected user is not a maid');
    if (maidId === userId)
      throw new BadRequestException('You cannot book yourself');
  }

  // maid is available for the given date and slot
  private async checkSlotAvailability(
    maidId: string,
    bookingDate: Date,
    slot: string,
  ) {
    const existing = await this.prisma.booking.findUnique({
      where: {
        maid_id_booking_date_slot: {
          maid_id: maidId,
          booking_date: bookingDate,
          slot: slot as any,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'This maid is already booked for the selected date and slot',
      );
    }
  }

  //Create a new booking
  async create(userId: string, dto: CreateBookingDto) {
    const { maid_id, package_id, booking_date, slot } = dto;
    const parsedDate = new Date(booking_date);

    // Validate maid
    await this.validateMaid(maid_id, userId);

    // Check slot availability
    await this.checkSlotAvailability(maid_id, parsedDate, slot);

    // Resolve package (auto-detect general or deep cleaning)
    const packageData = await this.resolvePackage(package_id);

    // Create booking
    const booking = await this.prisma.booking.create({
      data: {
        user_id: userId,
        maid_id,
        booking_date: parsedDate,
        slot,
        status: 'PENDING',
        ...packageData,
      },
      include: {
        maid: {
          select: { id: true, name: true, email: true },
        },
        user: {
          select: { id: true, name: true, email: true },
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

  // Get maid's available slots for a full month
  async getMaidSlots(maidId: string, month: number, year: number) {
    const maid = await this.prisma.user.findUnique({
      where: { id: maidId },
    });

    if (!maid) throw new NotFoundException('Maid not found');
    if (maid.type !== 'MAID')
      throw new BadRequestException('Selected user is not a maid');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        maid_id: maidId,
        booking_date: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'CANCELLED' },
      },
      select: { booking_date: true, slot: true },
    });

    const bookedMap = new Map<string, Set<string>>();
    for (const b of bookings) {
      const dateKey = b.booking_date.toLocaleDateString('en-CA');
      if (!bookedMap.has(dateKey)) bookedMap.set(dateKey, new Set());
      bookedMap.get(dateKey).add(b.slot);
    }

    const slotTimeMap = {
      A: { start: '07:30', end: '10:00' },
      B: { start: '11:00', end: '01:30' },
      C: { start: '01:30', end: '04:00' },
      D: { start: '04:00', end: '07:30' },
    };

    // Generate all dates in the month with slot availability
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
      data: {
        maid_id: maidId,
        month,
        year,
        dates,
      },
    };
  }
}
