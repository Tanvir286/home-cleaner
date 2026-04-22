import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BookingStatus, UserType } from '@prisma/client';
import { PaginationDto, paginateResponse } from 'src/common/pagination';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // dashboard overview (only revenew)
  async getOverview() {
    try {
      const [
        totalHomeowners,
        totalCleaners,
        activeBookings,
        completedBookings,
        pendingBookings,
        completedRevenue,
      ] = await this.prisma.$transaction([
        this.prisma.user.count({
          where: { type: UserType.HOMEOWNER },
        }),

        this.prisma.user.count({
          where: { type: UserType.MAID },
        }),

        this.prisma.booking.count({
          where: {
            status: {
              in: [
                BookingStatus.CONFIRMED,
                BookingStatus.STARTED,
                BookingStatus.SUBMITTED,
              ],
            },
          },
        }),

        this.prisma.booking.count({
          where: { status: BookingStatus.COMPLETED },
        }),

        this.prisma.booking.count({
          where: { status: BookingStatus.PENDING },
        }),

        this.prisma.booking.aggregate({
          where: { status: BookingStatus.COMPLETED },
          _sum: {
            total_price: true,
          },
        }),
      ]);

      return {
        success: true,
        data: {
          total_homeowners: totalHomeowners,
          total_cleaners: totalCleaners,
          active_bookings: activeBookings,
          completed_bookings: completedBookings,
          pending_bookings: pendingBookings,
          total_revenue: Number(completedRevenue._sum.total_price ?? 0),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // recent activities (only notifications)

  /*--------------------------------------------
            HOMEOWNER LIST WITH DETAILS
  --------------------------------------------*/

  // get all homeowners with details
  async getAllHomeowners(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const whereCondition = {
        type: UserType.HOMEOWNER,
        deleted_at: null,
      };

      const [total, homeowners] = await this.prisma.$transaction([
        this.prisma.user.count({
          where: whereCondition,
        }),
        this.prisma.user.findMany({
          where: whereCondition,
          skip,
          take: perPage,
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            location: true,
            status: true,
            created_at: true,
            userBookings: {
              where: { deleted_at: null },
              select: {
                id: true,
                total_price: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        }),
      ]);

      const data = homeowners.map((homeowner) => {
        const totalBookings = homeowner.userBookings.length;

        const totalSpent = homeowner.userBookings.reduce(
          (sum, booking) => sum + Number(booking.total_price ?? 0),
          0,
        );

        return {
          id: homeowner.id,
          name: homeowner.name,
          email: homeowner.email,
          phone_number: homeowner.phone_number,
          avatar: homeowner.avatar,
          location: homeowner.location,
          bookings: totalBookings,
          total_spent: totalSpent,
          status: homeowner.status === 1 ? 'active' : 'inactive',
          joined_at: homeowner.created_at,
        };
      });

      return {
        success: true,
        message: `Homeowners retrieved successfully`,
        data: paginateResponse(data, page, perPage, total),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
            Clearner LIST WITH DETAILS
  --------------------------------------------*/

  // get all cleaners with details
  async getAllCleaners(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const [cleaners, total] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            type: UserType.MAID,
            deleted_at: null,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            status: true,
            availability: true,
            created_at: true,

            maidBookings: {
              where: { deleted_at: null },
              select: {
                id: true,
                status: true,
                total_price: true,
              },
            },

            maidReviews: {
              where: { deleted_at: null },
              select: {
                rating: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: perPage,
        }),

        this.prisma.user.count({
          where: {
            type: UserType.MAID,
            deleted_at: null,
          },
        }),
      ]);

      const data = cleaners.map((cleaner) => {
        const totalJobs = cleaner.maidBookings.length;

        const completedJobs = cleaner.maidBookings.filter(
          (b) => b.status === BookingStatus.COMPLETED,
        ).length;

        const completionRate =
          totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

        const totalEarnings = cleaner.maidBookings
          .filter((b) => b.status === BookingStatus.COMPLETED)
          .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);

        const ratings = cleaner.maidReviews
          .map((r) => r.rating)
          .filter((r): r is number => r !== null);

        const avgRating =
          ratings.length > 0
            ? Math.round(
                (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10,
              ) / 10
            : 0;

        // status: availability false হলে "busy", status 0 হলে "inactive", বাকি "active"
        let statusLabel: 'active' | 'inactive';
        if (cleaner.status !== 1) {
          statusLabel = 'inactive';
        } else {
          statusLabel = 'active';
        }

        return {
          id: cleaner.id,
          name: cleaner.name,
          email: cleaner.email,
          phone_number: cleaner.phone_number,
          avatar: cleaner.avatar,
          joined_at: cleaner.created_at,
          rating: avgRating,
          total_reviews: ratings.length,
          jobs: {
            completed: completedJobs,
            total: totalJobs,
            completion_rate: completionRate,
          },
          earnings: totalEarnings,
          status: statusLabel,
        };
      });

      return {
        success: true,
        message: `Cleaners retrieved successfully`,
        data: paginateResponse(data, page, perPage, total),
      };
    } catch (error) {
      throw error;
    }
  }

  



}
