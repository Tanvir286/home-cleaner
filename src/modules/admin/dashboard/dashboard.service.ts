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
  async getAllHomeowners(
    paginationDto: PaginationDto
  ) {
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
        ...paginateResponse(data, total, page, perPage),
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

      const whereCondition = {
        type: UserType.MAID,
        deleted_at: null,
      };

      const [total, cleaners] = await this.prisma.$transaction([
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
            status: true,
            created_at: true,
            maidReviews: {
              where: {
                deleted_at: null,
              },
              select: {
                rating: true,
              },
            },
            maidBookings: {
              where: {
                deleted_at: null,
              },
              select: {
                status: true,
                total_price: true,
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
        }),
      ]);

      const data = cleaners.map((cleaner) => {
        const totalJobs = cleaner.maidBookings.length;

        const completedJobs = cleaner.maidBookings.filter(
          (booking) => booking.status === BookingStatus.COMPLETED,
        ).length;

        const activeJobs = cleaner.maidBookings.filter((booking) =>
          [
            BookingStatus.CONFIRMED,
            BookingStatus.STARTED,
            BookingStatus.SUBMITTED,
          ].includes(booking.status),
        ).length;

        const totalEarnings = cleaner.maidBookings.reduce((sum, booking) => {
          if (booking.status !== BookingStatus.COMPLETED) {
            return sum;
          }

          return sum + Number(booking.total_price ?? 0);
        }, 0);

        const ratings = cleaner.maidReviews
          .map((review) => Number(review.rating ?? 0))
          .filter((rating) => rating > 0);

        const averageRating = ratings.length
          ? Number(
              (
                ratings.reduce((sum, rating) => sum + rating, 0) /
                ratings.length
              ).toFixed(1),
            )
          : 0;

        const completionRate =
          totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

        return {
          id: cleaner.id,
          name: cleaner.name,
          email: cleaner.email,
          phone_number: cleaner.phone_number,
          avatar: cleaner.avatar,
          rating: averageRating,
          rating_count: ratings.length,
          jobs: {
            completed: completedJobs,
            total: totalJobs,
            completion_rate: completionRate,
          },
          earnings: totalEarnings,
          status:
            cleaner.status !== 1
              ? 'inactive'
              : activeJobs > 0
                ? 'busy'
                : 'active',
          joined_at: cleaner.created_at,
        };
      });

      return {
        success: true,
        ...paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }


}
