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
import {
  bookingSlotTimeMap,
  checkBalance,
  checkCommission,
  checkSlotAvailability,
  findAddress,
  formatBookingDate,
  resolvePackage,
  uploadBookingImages,
  validateMaid,
} from './booking.utlis';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';
import { BookingStatus, UserType, VerificationStatus } from '@prisma/client';
import { HomeownerUpdateBookingDto } from './dto/homeonwer-update-booking.dto';
import { UpdateBookingAcceptOrRejectDto } from './dto/update-booking-acceptorreject.dto';
import { StartedBookingDto } from './dto/started-booking.dto';
import { DangerDto } from './dto/danger.dto';
import { stat } from 'node:fs';
import { SubmittedBookingDto } from './dto/submittted-booking.dto';
import {
  sendAdminNotification,
  sendUserNotification,
} from 'src/common/utils/notification.util';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  /*-------------------------------------------------
  // topic:﹝﹝﹝ available maid and  maid deatils ﹞﹞﹞
  --------------------------------------------------*/

  // available maids list
  async getAvailableMaids(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereCondition: any = {
      type: UserType.MAID,
      availability: true,

      maidVerification: {
        some: {
          status: VerificationStatus.VERIFIED,
        },
      },
    };

    const [total, maids] = await this.prisma.$transaction([
      this.prisma.user.count({ where: whereCondition }),
      this.prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          name: true,
          avatar: true,
          location: true,
          experience_years: true,
          service_type: true,
        },
        skip,
        take: perPage,
      }),
    ]);

    const reviews = await this.prisma.review.groupBy({
      by: ['maid_id'],
      where: {
        maid_id: { in: maids.map((maid) => maid.id) },
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    const reviewMap = new Map(
      reviews.map((review) => [
        review.maid_id,
        {
          average_rating: Number((review._avg.rating ?? 0).toFixed(1)),
          total_reviews: review._count.rating,
        },
      ]),
    );

    return {
      success: true,
      message: 'Available maids retrieved successfully',
      data: paginateResponse(
        maids.map((maid) => ({
          id: maid.id,
          name: maid.name,
          avatar: maid.avatar
            ? TanvirStorage.url(
                appConfig().storageUrl.avatar + '/' + maid.avatar,
              )
            : null,
          location: maid.location,
          experience_years: maid.experience_years,
          service_type: maid.service_type,
          average_rating: reviewMap.get(maid.id)?.average_rating ?? 0,
          total_reviews: reviewMap.get(maid.id)?.total_reviews ?? 0,
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
        status: { not: 'CANCELLED' },
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

  /*-------------------------------------------------
  // topic:﹝﹝﹝ homeowner part ﹞﹞﹞
  --------------------------------------------------*/

  // create booking
  async create(userId: string, dto: CreateBookingDto) {
    
    const { maid_id, package_id, booking_date, slot, address } = dto;

  
    const maid_location = await this.prisma.user.findUnique({
      where: { id: maid_id },
      select: { location: true, latitude: true, longitude: true },
    });

    if (!maid_location) {
      throw new NotFoundException('Maid not found');
    }

    if (!maid_location.latitude) {
      throw new BadRequestException('Maid location is not available');
    }

    if (!maid_location.longitude) {
      throw new BadRequestException('Maid location is not available');
    }

    const { findlocation_name, findlatitude, findlongitude } = await findAddress(this.prisma, address);

    const maidLocationValue = maid_location?.location ?? '';
    const maidLatitude = maid_location?.latitude;
    const maidLongitude = maid_location?.longitude;
    const homeownerLatitude = findlatitude;
    const homeownerLongitude = findlongitude;

    const [year, month, day] = booking_date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(12, 0, 0, 0);

    if (parsedDate < today) {
      throw new BadRequestException('You cannot book a date in the past');
    }

    await validateMaid(this.prisma, maid_id, userId);

    await checkSlotAvailability(this.prisma, maid_id, parsedDate, slot);

    const balance = await checkBalance(this.prisma, userId);

    const { amount: commissionAmount, percentage: commissionPercentage } =
      await checkCommission(this.prisma, balance);

    const packageData = await resolvePackage(this.prisma, package_id);
    const totalPrice = Number(packageData.total_price ?? 0);

    const currentBalance = Number(balance ?? 0);

    if (totalPrice <= 0) {
      throw new BadRequestException('Invalid package price');
    }

    if (currentBalance < totalPrice) {
      throw new BadRequestException('Insufficient balance for this booking');
    }

    let booking;
    try {
      booking = await this.prisma.$transaction(async (tx) => {
        const deducted = await tx.user.updateMany({
          where: {
            id: userId,
            balance: {
              gte: totalPrice,
            },
          },
          data: {
            balance: {
              decrement: totalPrice,
            },
          },
        });

        if (deducted.count === 0) {
          throw new BadRequestException(
            'Insufficient balance for this booking',
          );
        }

        return tx.booking.create({
          data: {
            user: { connect: { id: userId } },
            maid: { connect: { id: maid_id } },
            booking_date: parsedDate,
            slot,
            maid_location: maidLocationValue,
            homeowner_location: findlocation_name,
            maid_latitude: maidLatitude,
            maid_longitude: maidLongitude,
            homeowner_latitude: homeownerLatitude,
            homeowner_longitude: homeownerLongitude,
            status: 'PENDING',
            revenue: commissionAmount,
            total_price: packageData.total_price ?? null,
            ...(packageData.general_cleaning_package_id
              ? {
                  general_cleaning_package: {
                    connect: { id: packageData.general_cleaning_package_id },
                  },
                }
              : {}),
            ...(packageData.deep_cleaning_package_id
              ? {
                  deep_cleaning_package: {
                    connect: { id: packageData.deep_cleaning_package_id },
                  },
                }
              : {}),
            ...(packageData.residential_cleaning_package_id
              ? {
                  residential_cleaning_package: {
                    connect: { id: packageData.residential_cleaning_package_id },
                  },
                }
              : {}),
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
            residential_cleaning_package: true,
          },
        });
      });
    } catch (err: any) {
      console.error('Prisma transaction error in createBooking:', err);
      throw new BadRequestException(
        err?.message ?? 'Invalid data provided for a Prisma operation.',
      );
    }

    await sendAdminNotification({
      sender_id: userId,
      text: `New booking created by ${booking.user.name} for ${booking.maid.name} on ${formatBookingDate(booking.booking_date)}.`,
      type: 'create_booking',
      entity_id: booking.id,
    });

    const formatPackage = (
      pkg:
        | typeof booking.general_cleaning_package
        | typeof booking.deep_cleaning_package
        | typeof booking.residential_cleaning_package,
    ) => {
      if (!pkg) return null;
      return {
        ...pkg,
        image: pkg.image
          ? TanvirStorage.url(appConfig().storageUrl.package + '/' + pkg.image)
          : null,
      };
    };

    return {
      success: true,
      message: 'Booking created successfully',
      data: {
        ...booking,
        commission: {
          percentage: commissionPercentage,
          amount: commissionAmount,
        },
        general_cleaning_package: formatPackage(
          booking.general_cleaning_package,
        ),
        deep_cleaning_package: formatPackage(booking.deep_cleaning_package),
        residential_cleaning_package: formatPackage(
          booking.residential_cleaning_package,
        ),
      },
    };
  }

  // get homeowner bookings list
  // * (pending,upcoming,completed,cancelled) status filter
  // service type,package type,price,address,booking date,slot
  async getAllBookingsWithStatus(userId: string, query: PaginationstausDto) {
    const { page, perPage, bookingStatus } = query;

    const skip = (page - 1) * perPage;

    const whereClause = {
      user_id: userId,
      status: BookingStatus[bookingStatus],
    };

    const [total, bookings] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: whereClause }),

      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          maid: true,
          general_cleaning_package: true,
          deep_cleaning_package: true,
          residential_cleaning_package: true,
          booking_reviews: {
            select: {
              rating: true,
              comment: true,
            },
          },
        },
        orderBy: {
          booking_date: 'asc',
        },
        skip,
        take: perPage,
      }),
    ]);

    const formattedBookings = bookings.map((booking) => {
      const packageData =
        booking.general_cleaning_package || booking.deep_cleaning_package || booking.residential_cleaning_package;

      const serviceType = booking.general_cleaning_package
        ? 'General Cleaning'
        : booking.deep_cleaning_package
        ? 'Deep Cleaning'
        : 'Residential Cleaning';

      const slotTime = bookingSlotTimeMap[booking.slot];

      const hasReview = booking.booking_reviews.length > 0;

      return {
        id: booking.id,
        service: serviceType,
        package: packageData?.packageType,

        package_image: packageData?.image
          ? TanvirStorage.url(
              appConfig().storageUrl.package + '/' + packageData.image,
            )
          : null,

        slot: booking.slot,
        price: packageData?.price,
        address: booking.homeowner_location,
        time: `${slotTime.start} - ${slotTime.end}`,
        booking_date: formatBookingDate(booking.booking_date),
        status: booking.status,
        cancle_reason: booking.cancle_reason ?? null,
        maid: {
          id: booking.maid.id,
          name: booking.maid.name,
          avatar: booking.maid.avatar
            ? TanvirStorage.url(
                appConfig().storageUrl.avatar + '/' + booking.maid.avatar,
              )
            : null,
        },

        is_reviewed: hasReview,

        review: hasReview
          ? {
              rating: booking.booking_reviews[0].rating,
              comment: booking.booking_reviews[0].comment,
            }
          : null,
      };
    });
    return {
      success: true,
      message: 'Bookings retrieved successfully',
      data: paginateResponse(formattedBookings, total, page, perPage),
    };
  }

  // get every booking details information
  async getBookingDetails(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        maid: true,
        user: true,
        general_cleaning_package: true,
        deep_cleaning_package: true,
        residential_cleaning_package: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const packageData =
      booking.general_cleaning_package || booking.deep_cleaning_package || booking.residential_cleaning_package;

    const serviceType = booking.general_cleaning_package
      ? 'General Cleaning'
      : booking.deep_cleaning_package
      ? 'Deep Cleaning'
      : 'Residential Cleaning';

    const slotTime = bookingSlotTimeMap[booking.slot];

    return {
      success: true,
      message: 'Booking details retrieved successfully',
      data: {
        booking_id: booking.id,
        service: serviceType,
        package: packageData?.packageType,
        package_image: packageData?.image
          ? TanvirStorage.url(
              appConfig().storageUrl.package + '/' + packageData.image,
            )
          : null,
        slot: booking.slot,
        address: booking.homeowner_location,
        maid_latitude: booking.maid_latitude,
        maid_longitude: booking.maid_longitude,
        homeowner_latitude: booking.homeowner_latitude,
        homeowner_longitude: booking.homeowner_longitude,
        date_time: `${formatBookingDate(booking.booking_date)}, at ${slotTime.start} - ${slotTime.end}`,
        price: booking.total_price ? `$${booking.total_price}` : null,
        package_details: {
          title: packageData?.title,
          serviceType: packageData?.serviceType,
          packageType: packageData?.packageType,
          description: packageData?.description,
          image: packageData?.image
            ? TanvirStorage.url(
                appConfig().storageUrl.package + '/' + packageData.image,
              )
            : null,
           price: packageData?.price ? `$${packageData.price}` : null, 
          duration: packageData?.duration,
        },
        maid: {
          id: booking.maid.id,
          name: booking.maid.name,
          location: booking.maid.location,
          avatar: booking.maid.avatar
            ? TanvirStorage.url(
                appConfig().storageUrl.avatar + '/' + booking.maid.avatar,
              )
            : null,
          rating: 4.5,
        },
        user: {
          id: booking.user.id,
          name: booking.user.name,
          email: booking.user.email,
        },
        status: booking.status,
        cancle_reason: booking.cancle_reason ?? null,
      },
    };
  }

  // booking status update by homeowner
  async updateBookingStatusByHomeowner(
    userId: string,
    bookingId: string,
    updateBookingDto: HomeownerUpdateBookingDto,
  ) {
    const { status, cancle_reason } = updateBookingDto;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.user_id !== userId) {
      throw new BadRequestException(
        'You are not authorized to cancel this booking',
      );
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be cancelled');
    }

    if (status !== BookingStatus.CANCELLED) {
      throw new BadRequestException('Status must be CANCELLED');
    }

    const refundAmount = Number(booking.total_price ?? 0);

    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      const cancelledBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: status,
          cancle_reason: cancle_reason,
        },
      });

      if (refundAmount > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            balance: {
              increment: refundAmount,
            },
          },
        });
      }

      return cancelledBooking;
    });

    await sendUserNotification({
      sender_id: userId,
      receiver_id: booking.maid_id,
      text: `Booking cancelled by homeowner for ${booking.id} on ${formatBookingDate(booking.booking_date)}. Reason: ${cancle_reason}`,
      type: 'cancel_booking',
      entity_id: booking.id,
    });

    return {
      success: true,
      message: 'Booking cancelled successfully',
      data: updatedBooking,
    };
  }

  /*-------------------------------------------------
  // topic:﹝﹝﹝ maid part ﹞﹞﹞
  --------------------------------------------------*/

  // dashboard data for maid
  async getMaidDashboardData(maidId: string) {
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      monthlyEarningAgg,
      thisMonthCompletedJobsCount,
      totalCompletedJobsCount,
      reviewStats,
    ] = await this.prisma.$transaction([
      this.prisma.booking.aggregate({
        where: {
          maid_id: maidId,
          status: BookingStatus.COMPLETED,
          booking_date: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
        _sum: {
          total_price: true,
        },
      }),
      this.prisma.booking.count({
        where: {
          maid_id: maidId,
          status: BookingStatus.COMPLETED,
          booking_date: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
      }),
      this.prisma.booking.count({
        where: {
          maid_id: maidId,
          status: BookingStatus.COMPLETED,
        },
      }),
      this.prisma.review.aggregate({
        where: { maid_id: maidId },
        _avg: { rating: true },
      }),
    ]);

    const monthlyEarnings = Number(monthlyEarningAgg._sum.total_price ?? 0);
    const averageRating = Number(reviewStats._avg.rating ?? 0);

    return {
      success: true,
      message: 'Maid dashboard data retrieved successfully',
      data: {
        monthlyEarnings,
        jobsCompleted: totalCompletedJobsCount,
        thisMonthJobsCompleted: thisMonthCompletedJobsCount,
        rating: Number(averageRating.toFixed(1)),
      },
    };
  }

  // weekly statistics for maid
  async getMaidWeeklyStatistics(maidId: string) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const completedBookings = await this.prisma.booking.findMany({
      where: {
        maid_id: maidId,
        status: BookingStatus.COMPLETED,
        booking_date: {
          gte: startOfWeek,
          lt: endOfWeek,
        },
      },
      select: {
        booking_date: true,
        slot: true,
      },
    });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullWeekDayNames = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    const slotDurationByHours = {
      A: 2.5,
      B: 2.5,
      C: 2.5,
      D: 3.5,
    } as const;

    const jobsByDay = Array(7).fill(0);
    const hoursByDay = Array(7).fill(0);

    for (const booking of completedBookings) {
      const jsDay = booking.booking_date.getDay();
      const mondayIndex = (jsDay + 6) % 7;
      jobsByDay[mondayIndex] += 1;
      hoursByDay[mondayIndex] += slotDurationByHours[booking.slot] ?? 0;
    }

    const jobsCompleted = completedBookings.length;

    let longestDayIndex = -1;
    let maxHours = 0;
    for (let i = 0; i < hoursByDay.length; i++) {
      if (hoursByDay[i] > maxHours) {
        maxHours = hoursByDay[i];
        longestDayIndex = i;
      }
    }

    const insightText =
      longestDayIndex === -1
        ? 'No completed jobs this week yet.'
        : `${fullWeekDayNames[longestDayIndex]} had your longest job!`;

    return {
      success: true,
      message: 'Maid weekly statistics retrieved successfully',
      data: {
        title: jobsCompleted > 0 ? 'Great week!' : 'New week!',
        jobsCompleted,
        insightText,
        weekChart: weekDays.map((day, index) => ({
          day,
          completedJobs: jobsByDay[index],
        })),
      },
    };
  }

  // booking list individual details for maid
  async getPendingBookingsForMaid(
    maidId: string,
    paginationDto: PaginationDto,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = {
      maid_id: maidId,
      status: BookingStatus.PENDING,
    };

    const [total, bookings] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: whereClause }),
      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          general_cleaning_package: true,
          deep_cleaning_package: true,
          residential_cleaning_package: true,
          user: {
            select: {
              id: true,
              name: true,
              location: true,
              avatar: true,
              phone_number: true,
              latitude: true,
              longitude: true,
            },

          },
        },
        orderBy: {
          booking_date: 'asc',
        },
        skip,
        take: perPage,
      }),
    ]);

    const formattedBookings = bookings.map((booking) => {
      const packageData =
        booking.general_cleaning_package || booking.deep_cleaning_package || booking.residential_cleaning_package;
      const serviceType = booking.general_cleaning_package
        ? 'General Cleaning'
        : booking.deep_cleaning_package
        ? 'Deep Cleaning'
        : 'Residential Cleaning';
      const slotTime = bookingSlotTimeMap[booking.slot];

      return {
        id: booking.id,
        service: serviceType,
        package: packageData?.packageType,
        package_image: packageData?.image
          ? TanvirStorage.url(
              appConfig().storageUrl.package + '/' + packageData.image,
            )
          : null,
        status: booking.status,
        price: packageData?.price,
        description: packageData?.description,
        slot: booking.slot,
        address: booking.homeowner_location,
        time: `${slotTime.start} - ${slotTime.end}`,
        booking_date: formatBookingDate(booking.booking_date),
        user: {
          id: booking.user.id,
          name: booking.user.name,
          location: booking.user.location,
          latitude: booking.user.latitude,
          longitude: booking.user.longitude,
          phone: booking.user.phone_number,
          avatar: booking.user.avatar
            ? TanvirStorage.url(
                appConfig().storageUrl.avatar + '/' + booking.user.avatar,
              )
            : null,
        },
      };
    });
    return {
      success: true,
      message: 'Pending bookings retrieved successfully',
      data: paginateResponse(formattedBookings, total, page, perPage),
    };
  }

  // booking list individual details for maid
  async getBookingDetailsForMaid(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        general_cleaning_package: true,
        deep_cleaning_package: true,
        residential_cleaning_package: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const packageData =
      booking.general_cleaning_package || booking.deep_cleaning_package || booking.residential_cleaning_package;
    const serviceType = booking.general_cleaning_package
      ? 'General Cleaning'
      : booking.deep_cleaning_package
      ? 'Deep Cleaning'
      : 'Residential Cleaning';
    const slotTime = bookingSlotTimeMap[booking.slot];

    return {
      success: true,
      message: 'Booking details retrieved successfully',
      data: {
        id: booking.id,
        service: serviceType,
        package: packageData?.packageType,
        slot: booking.slot,
        package_image: packageData?.image
          ? TanvirStorage.url(
              appConfig().storageUrl.package + '/' + packageData.image,
            )
          : null,

        address: booking.homeowner_location,
        maid_latitude: booking.maid_latitude,
        maid_longitude: booking.maid_longitude,
        homeowner_latitude: booking.homeowner_latitude,
        homeowner_longitude: booking.homeowner_longitude,
        time: `${slotTime.start} - ${slotTime.end}`,
        booking_date: formatBookingDate(booking.booking_date),
        cancle_reason: booking.cancle_reason ?? null,
        bundle: {
          service: serviceType,
          package: packageData?.packageType,
          description: packageData?.description,
          price: packageData?.price,
        },
        user: {
          id: booking.user.id,
          name: booking.user.name,
          location: booking.user.location,
          latitude: booking.user.latitude,
          longitude: booking.user.longitude,
          phone: booking.user.phone_number,
          avatar: booking.user.avatar
            ? TanvirStorage.url(
                appConfig().storageUrl.avatar + '/' + booking.user.avatar,
              )
            : null,
        },
      },
    };
  }

  // booking status update by maid (accept, reject)
  async updateBookingStatusAcceptOrRejectByMaid(
    maidId: string,
    bookingId: string,
    dto: UpdateBookingAcceptOrRejectDto,
  ) {
    const { status } = dto;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.maid_id !== maidId) {
      throw new BadRequestException(
        'You are not authorized to update this booking',
      );
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be updated');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    await sendAdminNotification({
      sender_id: maidId,
      text: `Booking ${status.toLowerCase()} by maid for ${booking.id} on ${formatBookingDate(booking.booking_date)}.`,
      type: (status === BookingStatus.CONFIRMED
        ? 'accept_booking'
        : 'reject_booking') as any,
      entity_id: booking.id,
    });

    return {
      success: true,
      message: `Booking ${status.toLowerCase()} successfully`,
      data: updatedBooking,
    };
  }

  //  booking status (pending, upcoming, completed, cancelled)
  async getBookingsByStatusForMaid(maidId: string, query: PaginationstausDto) {
    const { page, perPage, bookingStatus } = query;
    const skip = (page - 1) * perPage;

    const whereClause = {
      maid_id: maidId,
      status: BookingStatus[bookingStatus],
    };

    const [total, bookings] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: whereClause }),
      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          user: {
            include: {
              _count: {
                select: { homeownerReviews: true },
              },
            },
          },
          general_cleaning_package: true,
          residential_cleaning_package: true,

          deep_cleaning_package: true,
          booking_reviews: {
            select: {
              rating: true,
              comment: true,
            },
          },
        },
        orderBy: { booking_date: 'asc' },
        skip,
        take: perPage,
      }),
    ]);

    const formattedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const packageData =
          booking.general_cleaning_package || booking.deep_cleaning_package || booking.residential_cleaning_package;
        const slotTime = bookingSlotTimeMap[booking.slot];

        const aggregateRating = await this.prisma.review.aggregate({
          where: { homeowner_id: booking.user.id },
          _avg: {
            rating: true,
          },
        });

        const hasReview = booking.booking_reviews.length > 0;

        return {
          id: booking.id,
          service: booking.general_cleaning_package
            ? 'General Cleaning'
            : booking.deep_cleaning_package
            ? 'Deep Cleaning'
            : 'Residential Cleaning',
          package: packageData?.packageType,
          package_image: packageData?.image
            ? TanvirStorage.url(
                appConfig().storageUrl.package + '/' + packageData.image,
              )
            : null,
          price: packageData?.price,
          slot: booking.slot,
          address: booking.homeowner_location,
          maid_latitude: booking.maid_latitude,
          maid_longitude: booking.maid_longitude,
          homeowner_latitude: booking.homeowner_latitude,
          homeowner_longitude: booking.homeowner_longitude,
          time: `${slotTime.start} - ${slotTime.end}`,
          booking_date: formatBookingDate(booking.booking_date),
          status: booking.status,
          cancle_reason: booking.cancle_reason ?? null,
          homeowner: {
            id: booking.user.id,
            name: booking.user.name,  
            location: booking.user.location,
            avatar: booking.user.avatar
              ? TanvirStorage.url(
                  appConfig().storageUrl.avatar + '/' + booking.user.avatar,
                )
              : null,
            rating: Number(aggregateRating._avg.rating?.toFixed(1)) || 0,
            total_reviews: booking.user._count.homeownerReviews,
          },
          is_reviewed: hasReview,
          review: hasReview
            ? {
                rating: booking.booking_reviews[0].rating,
                comment: booking.booking_reviews[0].comment,
              }
            : null,
        };
      }),
    );

    return {
      success: true,
      message: `Bookings with status ${bookingStatus} retrieved successfully`,
      data: paginateResponse(formattedBookings, total, page, perPage),
    };
  }

  // booking start by maid
  async startBookingByMaid(
    maidId: string,
    bookingId: string,
    updateBookingDto: StartedBookingDto,
  ) {
    const { status } = updateBookingDto;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.maid_id !== maidId) {
      throw new BadRequestException(
        'You are not authorized to update this booking',
      );
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be started');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    await sendAdminNotification({
      sender_id: maidId,
      text: `Booking started by maid for ${booking.id} on ${formatBookingDate(booking.booking_date)}.`,
      type: 'started_booking',
      entity_id: booking.id,
    });

    return {
      success: true,
      message: `Booking status updated to ${status.toLowerCase()} successfully`,
      data: updatedBooking,
    };
  }

  // booking complete by maid
  async completeBookingByMaid(
    maidId: string,
    bookingId: string,
    updateBookingDto: SubmittedBookingDto,
    beforeImageFiles: Express.Multer.File[] = [],
    afterImageFiles: Express.Multer.File[] = [],
  ) {
    const { status } = updateBookingDto;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.maid_id !== maidId) {
      throw new BadRequestException(
        'You are not authorized to update this booking',
      );
    }

    if (booking.status !== BookingStatus.STARTED) {
      throw new BadRequestException('Only started bookings can be completed');
    }

    const uploadedBeforePhotos = await uploadBookingImages(beforeImageFiles);
    const uploadedAfterPhotos = await uploadBookingImages(afterImageFiles);

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: status,
        before_photos: uploadedBeforePhotos,
        after_photos: uploadedAfterPhotos,
      },
    });

    return {
      success: true,
      message: 'Booking completed successfully',
      data: {
        ...updatedBooking,
        before_photos_url: uploadedBeforePhotos.map((fileName) =>
          TanvirStorage.url(`${appConfig().storageUrl.booking}/${fileName}`),
        ),
        after_photos_url: uploadedAfterPhotos.map((fileName) =>
          TanvirStorage.url(`${appConfig().storageUrl.booking}/${fileName}`),
        ),
      },
    };
  }

  /*----------------------------------------
  // topic:﹝﹝﹝ danger part ﹞﹞﹞
  -----------------------------------------*/

  // create danger booking
  async createDangerBooking(maidId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        maid_id: true,
        homeowner_location: true,
        booking_date: true,

        danger_notification: {
          select: {
            id: true,
            booking_id: true,
            user_id: true,
            latitude: true,
            longitude: true,
            created_at: true,
          },
        },

        live_locations: {
          where: {
            user_id: maidId,
          },
          orderBy: {
            updated_at: 'desc',
          },
          take: 1,
          select: {
            latitude: true,
            longitude: true,
            updated_at: true,
          },
        },

        booking_destinations: {
          where: {
            user_id: maidId,
          },
          orderBy: {
            updated_at: 'desc',
          },
          take: 1,
          select: {
            pickup_lat: true,
            pickup_lng: true,
            dropoff_lat: true,
            dropoff_lng: true,
            distance_km: true,
            distance_text: true,
            duration_min: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.maid_id !== maidId) {
      throw new BadRequestException(
        'You are not authorized to report danger for this booking',
      );
    }

    const latestLiveLocation = booking.live_locations[0];

    if (!latestLiveLocation) {
      throw new NotFoundException('Live location not found for this booking');
    }

    const destination = booking.booking_destinations[0] ?? null;

    if (booking.danger_notification) {
      return {
        success: true,
        message: 'Danger alert already exists for this booking',
        data: {
          danger: booking.danger_notification,
          maid_live_location: latestLiveLocation,
          destination,
        },
      };
    }

    const danger = await this.prisma.danger.create({
      data: {
        booking_id: booking.id,
        user_id: maidId,
        maid_current_location: booking.homeowner_location,
        latitude: latestLiveLocation.latitude,
        longitude: latestLiveLocation.longitude,
      },
      select: {
        id: true,
        booking_id: true,
        user_id: true,
        maid_current_location: true,
        latitude: true,
        longitude: true,
        created_at: true,
      },
    });

    await sendAdminNotification({
      sender_id: maidId,
      text: `Danger alert reported by maid for ${booking.id} on ${formatBookingDate(booking.booking_date)}.`,
      type: 'danger_request',
      entity_id: booking.id,
    });

    return {
      success: true,
      message: 'Danger alert created successfully',
      data: {
        danger,
        maid_live_location: latestLiveLocation,
        destination,
      },
    };
  }
}
