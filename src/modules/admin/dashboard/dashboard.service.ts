import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BookingStatus, UserType } from '@prisma/client';

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
  async getAllHomeowners() {
   
    const homeowners = await this.prisma.user.findMany({
      where: {
        type: UserType.HOMEOWNER,
        deleted_at: null,
      },
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
    });

    return homeowners.map((homeowner) => {
     
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
  }
}
