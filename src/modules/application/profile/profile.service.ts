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

  // get profile details
  async getProfileDetails(userId: string) {
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

    const [reviewAggregate, totalReviews, recentJobs] = await this.prisma.$transaction([
      this.prisma.review.aggregate({
        where: reviewWhere,
        _avg: {
          rating: true,
        },
      }),
      this.prisma.review.count({
        where: reviewWhere,
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

    const average_rating =
      reviewAggregate._avg.rating !== null
        ? Math.round(Number(reviewAggregate._avg.rating) * 10) / 10
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
