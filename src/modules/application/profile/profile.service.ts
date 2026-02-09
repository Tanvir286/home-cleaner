import { Injectable } from '@nestjs/common';
import { StringHelper } from 'src/common/helper/string.helper';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // get profile details
  async getProfileDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        location: true,
        bio: true,
        profiles: {
          select: {
            service_type: true,
          },
        },
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
        bio: user.bio,
        service_type: user.profiles?.[0]?.service_type || [],
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
    const profileData: any = {};

    // -------- user fields --------
    if (dto.location !== undefined) userData.location = dto.location;
    if (dto.bio !== undefined) userData.bio = dto.bio;

    // -------- profile fields --------
    if (dto.service_type !== undefined)
      profileData.service_type = dto.service_type;

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
              bio: true,
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
              bio: true,
            },
          });

    // -------- profile (create or update) --------
    let profile = await this.prisma.profile.findFirst({
      where: { user_id: userId },
    });

    if (!profile) {
      profile = await this.prisma.profile.create({
        data: {
          user_id: userId,
          service_type: dto.service_type ?? [],
        },
      });
    } else if (Object.keys(profileData).length > 0) {
      profile = await this.prisma.profile.update({
        where: { id: profile.id },
        data: profileData,
      });
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
        profile,
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
    if (dto.bio !== undefined) userData.bio = dto.bio;

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
              bio: true,
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
              bio: true,
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
