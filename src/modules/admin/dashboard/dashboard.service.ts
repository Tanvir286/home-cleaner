import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BookingStatus, UserType } from '@prisma/client';
import { PaginationDto, paginateResponse } from 'src/common/pagination';
import appConfig from 'src/config/app.config';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import { CleanerStatusDto } from './dto/cleaner-status.dto';

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
  // only activity (mane j j jabe tar vitor notification moto takbe)

  /*--------------------------------------------
            HOMEOWNER LIST WITH DETAILS
  --------------------------------------------*/

  // get all homeowners with details
  async getAllHomeowners(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const search = paginationDto.search?.trim();
      const orderby = paginationDto.orderby || 'name';

      const whereCondition: any = {
        type: UserType.HOMEOWNER,
        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),
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
            [orderby]: 'asc',
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
        data: paginateResponse(data, total, page, perPage),
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

      const search = paginationDto.search?.trim();
      const orderby = paginationDto.orderby || 'name';

      const whereCondition: any = {
        type: UserType.MAID,
        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

      const [cleaners, total] = await Promise.all([
        this.prisma.user.findMany({
          where: whereCondition,
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
          orderBy: {
            [orderby]: 'asc',
          },
          skip,
          take: perPage,
        }),
        this.prisma.user.count({
          where: whereCondition,
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

        // status: availability
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
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
            Booking  WITH DETAILS
  --------------------------------------------*/

  // get all bookings with details
  async getAllBookings(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const search = paginationDto.search?.trim();
      const bookingorderby = paginationDto.bookingorderby || 'created_at';

      const whereCondition: any = {
        deleted_at: null,
        ...(search?.trim() && {
          OR: [
            { id: { contains: search.trim(), mode: 'insensitive' } },
            { maid_id: { contains: search.trim(), mode: 'insensitive' } },
            { user_id: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }),
      };

      const [bookings, total] = await Promise.all([
        this.prisma.booking.findMany({
          where: whereCondition,
          skip,
          take: perPage,
          orderBy: {
            [bookingorderby]: 'asc',
          },
          select: {
            id: true,
            created_at: true,
            booking_date: true,
            slot: true,
            homeowner_location: true,
            status: true,
            total_price: true,
            user: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
            maid: {
              select: {
                id: true,
                name: true,
              },
            },
            general_cleaning_package: {
              select: {
                title: true,
                duration: true,
              },
            },
            deep_cleaning_package: {
              select: {
                title: true,
                duration: true,
              },
            },
          },
        }),
        this.prisma.booking.count({
          where: whereCondition,
        }),
      ]);

      const slotTimeMap = {
        A: '07:30 AM',
        B: '11:00 AM',
        C: '01:30 PM',
        D: '04:00 PM',
      };

      const statusMap = {
        [BookingStatus.PENDING]: 'pending',
        [BookingStatus.CONFIRMED]: 'confirmed',
        [BookingStatus.STARTED]: 'in-progress',
        [BookingStatus.SUBMITTED]: 'in-progress',
        [BookingStatus.COMPLETED]: 'completed',
        [BookingStatus.REJECTED]: 'rejected',
        [BookingStatus.CANCELLED]: 'cancelled',
      };

      const data = bookings.map((booking, index) => {
        const serviceInfo =
          booking.general_cleaning_package || booking.deep_cleaning_package;
        return {
          id: `BK - ${booking.id} `,
          homeowner_name: booking.user?.name || 'Unknown',
          cleaner_name: booking.maid?.name || 'Unknown',
          booking_date: booking.booking_date,
          booking_time: slotTimeMap[booking.slot] || booking.slot,
          location:
            booking.homeowner_location || booking.user?.location || null,
          service_name: serviceInfo?.title || 'Cleaning Service',
          service_duration: serviceInfo?.duration || null,
          amount: Number(booking.total_price ?? 0),
          status:
            statusMap[booking.status] || String(booking.status).toLowerCase(),
        };
      });

      return {
        success: true,
        message: 'Bookings retrieved successfully',
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
     Cleaner Requests with approve part 
   --------------------------------------------*/

  // get all cleaner requests with details
  async getAllCleanerRequests(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const search = paginationDto.search?.trim();
      const orderby = paginationDto.orderby || 'created_at';

      const whereCondition: any = {
        type: UserType.MAID,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const [requests, total] = await Promise.all([
        this.prisma.user.findMany({
          where: whereCondition,
          skip,
          take: perPage,
          orderBy: {
            [orderby]: 'desc',
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar: true,
            location: true,
            maidVerification: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: {
                created_at: true,
                status: true,
                id_card_front: true,
                id_card_back: true,
              },
            },
          },
        }),
        this.prisma.user.count({ where: whereCondition }),
      ]);

      const data = requests.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone_number: item.phone_number,
        avatar: item.avatar,
        location: item.location || 'N/A',
        applied_date: item.maidVerification[0]?.created_at || null,
        status: item.maidVerification[0]?.status?.toLowerCase() || 'pending',
      }));

      return {
        success: true,
        message: 'Cleaner requests retrieved successfully',
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // get cleaner deatils by id
  async getCleanerRequestById(id: string) {
    try {
      const cleaner = await this.prisma.user.findFirst({
        where: {
          id,
          type: UserType.MAID,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          created_at: true,
          location: true,
          address: true,
          city: true,
          state: true,
          zip_code: true,
          maidVerification: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              id: true,
              created_at: true,
              verified_at: true,
              status: true,
              id_card_front: true,
              id_card_back: true,
            },
          },
        },
      });

      if (!cleaner) {
        return {
          success: false,
          message: 'Cleaner not found',
        };
      }

      const verification = cleaner.maidVerification[0];
      if (!verification) {
        return {
          success: false,
          message: 'No verification submission found for this cleaner',
        };
      }

      const data = {
        id: cleaner.id,
        verification_id: verification.id,
        name: cleaner.name,
        email: cleaner.email,
        phone_number: cleaner.phone_number,
        location: cleaner.location || 'N/A',
        status: verification.status?.toLowerCase() || 'pending',
        id_card_front_url: verification.id_card_front
          ? TanvirStorage.url(
              appConfig().storageUrl.maidverification +
                '/' +
                verification.id_card_front,
            )
          : null,
        id_card_back_url: verification.id_card_back
          ? TanvirStorage.url(
              appConfig().storageUrl.maidverification +
                '/' +
                verification.id_card_back,
            )
          : null,
      };

      return {
        success: true,
        message: 'Cleaner details retrieved successfully',
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // approve or reject cleaner request by id
  async updateCleanerRequestById(
    id: string,
    updateDto: CleanerStatusDto,
  ) {
    try {
      const { status } = updateDto;

      if (status !== 'VERIFIED' && status !== 'REJECTED') {
        return {
          success: false,
          message: 'Status must be VERIFIED or REJECTED',
        };
      }

      const verification = await this.prisma.maidVerification.findFirst({
        where: {
          user_id: id,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!verification) {
        return {
          success: false,
          message: 'No verification submission found for this cleaner',
        };
      }

      const updatedVerification = await this.prisma.maidVerification.update({
        where: { id: verification.id },
        data: {
          status,
          verified_at: status === 'VERIFIED' ? new Date() : null,
        },
      });

      return {
        success: true,
        message: 'Cleaner request status updated successfully',
        data: updatedVerification,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*--------------------------------------------
      Danger Requests with approve part
  --------------------------------------------*/
  async getAllDangerRequests(paginationDto: PaginationDto) {
    try {
      const page = paginationDto.page || 1;
      const perPage = paginationDto.perPage || 10;
      const skip = (page - 1) * perPage;

      const search = paginationDto.search?.trim();
      const orderby = 'created_at'; 

      const whereCondition: any = {
        ...(search && {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { maid_current_location: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const [total, dangerRequests] = await this.prisma.$transaction([
        this.prisma.danger.count({
          where: whereCondition,
        }),
        this.prisma.danger.findMany({
          where: whereCondition,
          skip,
          take: perPage,
          orderBy: {
            [orderby]: 'desc', 
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                avatar: true,
                created_at: true,
              },
            },
            booking: {
              select: {
                id: true,
                booking_date: true,
                status: true,
                maid: {
                  select: { name: true }
                },
                user: {
                  select: { name: true }
                }
              },
            },
          },
        }),
      ]);

      const data = dangerRequests.map((danger) => ({
        
        id: danger.id,
        name: danger.user?.name,
        joint_at: danger.user?.created_at,

        applied_date: danger.created_at,
        email: danger.user?.email,
        phone_number: danger.user?.phone_number,
        location: danger.maid_current_location,

        latitude: danger.latitude,
        longitude: danger.longitude,
        status: danger.booking?.status,
        danger_time: danger.created_at,
        
      }));

      return {
        success: true,
        message: 'Danger requests retrieved successfully',
        data: paginateResponse(data, total, page, perPage),
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }




}