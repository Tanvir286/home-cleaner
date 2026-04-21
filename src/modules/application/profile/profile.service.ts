import { Injectable } from '@nestjs/common';
import { StringHelper } from 'src/common/helper/string.helper';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // topic: maid part)---------->

  // maid availability toggle
  async toggleAvailability(
    userId: string
  ) {
  
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { availability: true },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const newAvailability = !user.availability;

    await this.prisma.user.update({
      where: { id: userId },
      data: { availability: newAvailability },
    });

    return {
      success: true,
      message: `Availability toggled to ${newAvailability}`,
    };

  }

  // get profile details
  async getProfileDetails(
    userId: string
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        avatar: true,
        location: true,
        about_me: true,
        service_type: true,
        experience_years: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const reviewWhere =
      user.type === 'HOMEOWNER'
        ? { homeowner_id: user.id }
        : { maid_id: user.id };

    const [
      reviewAggregate,
      totalReviews,
      jobsDone,
      earningsAggregate,
      completedBookingClients,
      recentJobs,
    ] = await this.prisma.$transaction([
      this.prisma.review.aggregate({
        where: reviewWhere,
        _avg: {
          rating: true,
        },
      }),
      this.prisma.review.count({
        where: reviewWhere,
      }),
      this.prisma.booking.count({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        _sum: {
          total_price: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        select: {
          user_id: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        include: {
          general_cleaning_package: {
            select: {
              title: true,
              image: true,
            },
          },
          deep_cleaning_package: {
            select: {
              title: true,
              image: true,
            },
          },
        },
        orderBy: {
          booking_date: 'desc',
        },
        take: 2,
      }),
    ]);

    const average_rating = Number(reviewAggregate._avg.rating ?? 0);
    const total_earnings = Number(earningsAggregate._sum.total_price ?? 0);
    const clientBookingCount = new Map<string, number>();

    completedBookingClients.forEach((booking) => {
      clientBookingCount.set(
        booking.user_id,
        (clientBookingCount.get(booking.user_id) ?? 0) + 1,
      );
    });

    const totalClients = clientBookingCount.size;
    const repeatedClients = Array.from(clientBookingCount.values()).filter(
      (count) => count > 1,
    ).length;

    const repeat_client_rate =
      totalClients > 0
        ? Number(((repeatedClients / totalClients) * 100).toFixed(2))
        : 0;

    const recent_jobs = recentJobs.map((job) => {
      const pkg = job.general_cleaning_package || job.deep_cleaning_package;

      return {
        id: job.id,
        title: pkg?.title || 'Cleaning Service',
        image_url: pkg?.image
          ? TanvirStorage.url(appConfig().storageUrl.package + '/' + pkg.image)
          : null,
        booking_date: job.booking_date,
        status: job.status,
      };
    });

    return {
      success: true,
      message: 'Profile details retrieved successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avater_url: user.avatar
          ? TanvirStorage.url(appConfig().storageUrl.avatar + '/' + user.avatar)
          : null,
        location: user.location,
        about_me: user.about_me,
        service_type: user.service_type,
        experience_years: user.experience_years,
        jobs_done: jobsDone,
        total_earnings,
        repeat_client_rate,
        last_active: '2 hour',
        average_rating,
        total_reviews: totalReviews,
        recent_jobs,
      },
    };
  }

  // get maid profile details
  async getMaidProfileDetails(maidId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: maidId },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        avatar: true,
        location: true,
        about_me: true,
        service_type: true,
        experience_years: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const reviewWhere =
      user.type === 'HOMEOWNER'
        ? { homeowner_id: user.id }
        : { maid_id: user.id };

    const [
      reviewAggregate,
      totalReviews,
      jobsDone,
      earningsAggregate,
      completedBookingClients,
      recentJobs,
    ] = await this.prisma.$transaction([
      this.prisma.review.aggregate({
        where: reviewWhere,
        _avg: {
          rating: true,
        },
      }),
      this.prisma.review.count({
        where: reviewWhere,
      }),
      this.prisma.booking.count({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        _sum: {
          total_price: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        select: {
          user_id: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          maid_id: user.id,
          status: 'COMPLETED',
        },
        include: {
          general_cleaning_package: {
            select: {
              title: true,
              image: true,
            },
          },
          deep_cleaning_package: {
            select: {
              title: true,
              image: true,
            },
          },
        },
        orderBy: {
          booking_date: 'desc',
        },
        take: 2,
      }),
    ]);

    const average_rating = Number(reviewAggregate._avg.rating ?? 0);
    const total_earnings = Number(earningsAggregate._sum.total_price ?? 0);

    const clientBookingCount = new Map<string, number>();

    completedBookingClients.forEach((booking) => {
      clientBookingCount.set(
        booking.user_id,
        (clientBookingCount.get(booking.user_id) ?? 0) + 1,
      );
    });

    const totalClients = clientBookingCount.size;
    const repeatedClients = Array.from(clientBookingCount.values()).filter(
      (count) => count > 1,
    ).length;

    const repeat_client_rate =
      totalClients > 0
        ? Number(((repeatedClients / totalClients) * 100).toFixed(2))
        : 0;

    const recent_jobs = recentJobs.map((job) => {
      const pkg = job.general_cleaning_package || job.deep_cleaning_package;

      return {
        id: job.id,
        title: pkg?.title || 'Cleaning Service',
        image_url: pkg?.image
          ? TanvirStorage.url(appConfig().storageUrl.package + '/' + pkg.image)
          : null,
        booking_date: job.booking_date,
        status: job.status,
      };
    });

    return {
      success: true,
      message: 'Profile details retrieved successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avater_url: user.avatar
          ? TanvirStorage.url(appConfig().storageUrl.avatar + '/' + user.avatar)
          : null,
        location: user.location,
        about_me: user.about_me,
        service_type: user.service_type,
        experience_years: user.experience_years,
        jobs_done: jobsDone,
        total_earnings,
        repeat_client_rate,
        last_active: '2 hour',
        average_rating,
        total_reviews: totalReviews,
        recent_jobs,
      },
    };
  }

  // maid profile update
  async updatemaid(
    userId: string,
    dto: UpdateProfileDto,
    image?: Express.Multer.File,
  ) {
    const userData: any = {};

    if (dto.location !== undefined) userData.location = dto.location;
    if (dto.about_me !== undefined) userData.about_me = dto.about_me;
    if (dto.service_type !== undefined)
      userData.service_type = dto.service_type;
    if (dto.experience_years !== undefined)
      userData.experience_years = dto.experience_years;

    // -------- image --------

    if (image) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      if (user?.avatar) {
        await TanvirStorage.delete(
          appConfig().storageUrl.avatar + '/' + user.avatar,
        );
      }

      const fileName = `${StringHelper.randomString()}_${image.originalname}`;
      await TanvirStorage.put(
        appConfig().storageUrl.avatar + '/' + fileName,
        image.buffer,
      );

      userData.avatar = fileName;
    }

    // -------- update user --------
    const user =
      Object.keys(userData).length > 0
        ? await this.prisma.user.update({
            where: { id: userId },
            data: userData,
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
              about_me: true,
              service_type: true,
              experience_years: true,
            },
          })
        : await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
              about_me: true,
              service_type: true,
              experience_years: true,
            },
          });

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
      },
    };
  }

  // review maid
  async reviewMaid(maidId: string) {
    const maid = await this.prisma.user.findUnique({
      where: { id: maidId },
      select: { id: true },
    });

    if (!maid) {
      return {
        success: false,
        message: 'Maid not found',
      };
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        maid_id: maidId,
      },
      include: {
        homeowner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        booking: {
          include: {
            general_cleaning_package: {
              select: {
                title: true,
              },
            },
            deep_cleaning_package: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const data = reviews.map((review) => {
      const serviceTitle =
        review.booking.general_cleaning_package?.title ||
        review.booking.deep_cleaning_package?.title ||
        'Cleaning Service';

      return {
        id: review.id,
        reviewer_name: review.homeowner?.name,
        reviewer_avatar_url: review.homeowner?.avatar
          ? TanvirStorage.url(
              appConfig().storageUrl.avatar + '/' + review.homeowner.avatar,
            )
          : null,
        service_title: serviceTitle,
        review_date: review.created_at,
        rating: review.rating ?? 0,
        comment: review.comment,
      };
    });

    return {
      success: true,
      message: 'Reviews retrieved successfully',
      data,
    };
  }

  // topic: homeowner part)---------->

  // get profile details
  async getHomeownerProfileDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        location: true,
        about_me: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }
    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avater_url: user.avatar
          ? TanvirStorage.url(appConfig().storageUrl.avatar + '/' + user.avatar)
          : null,
        location: user.location,
        about_me: user.about_me,
      },
    };
  }

  // homeowner profile update
  async updateHomeowner(
    userId: string,
    dto: UpdateProfileDto,
    image?: Express.Multer.File,
  ) {
    const userData: any = {};

    if (dto.location !== undefined) userData.location = dto.location;
    if (dto.about_me !== undefined) userData.about_me = dto.about_me;

    // -------- update user --------

    // -------- image --------
    if (image) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      if (user?.avatar) {
        await TanvirStorage.delete(
          appConfig().storageUrl.avatar + '/' + user.avatar,
        );
      }

      const fileName = `${StringHelper.randomString()}_${image.originalname}`;
      await TanvirStorage.put(
        appConfig().storageUrl.avatar + '/' + fileName,
        image.buffer,
      );

      userData.avatar = fileName;
    }

    const user =
      Object.keys(userData).length > 0
        ? await this.prisma.user.update({
            where: { id: userId },
            data: userData,
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
              about_me: true,
            },
          })
        : await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              location: true,
              about_me: true,
            },
          });

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
      },
    };
  }
}
