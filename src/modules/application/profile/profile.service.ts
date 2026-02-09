import { Injectable } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';
import { StringHelper } from 'src/common/helper/string.helper';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async update(
  userId: string,
  updateProfileDto: UpdateProfileDto,
  image?: Express.Multer.File,
) {
  const { location, bio, service_type } = updateProfileDto;

  const userData: any = {};
  const profileData: any = {};

  // -------- USER DATA --------
  if (location !== undefined) userData.location = location;
  if (bio !== undefined) userData.bio = bio;

  // -------- PROFILE DATA --------
  if (service_type !== undefined)
    profileData.service_type = service_type;

  // -------- IMAGE HANDLING --------
  if (image) {
    const oldUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (oldUser?.avatar) {
      await TanvirStorage.delete(
        appConfig().storageUrl.avatar + '/' + oldUser.avatar,
      );
    }

    const fileName = `${StringHelper.randomString()}_${image.originalname}`;

    await TanvirStorage.put(
      appConfig().storageUrl.avatar + '/' + fileName,
      image.buffer,
    );

    userData.avatar = fileName;
  }

  // -------- TRANSACTION --------
  const [user, profile] = await this.prisma.$transaction([
  
    Object.keys(userData).length > 0 ? 
    this.prisma.user.update({
          where: { id: userId },
          data: userData,
        })
      : this.prisma.user.findUnique({ where: { id: userId } }),

    Object.keys(profileData).length > 0 ? 
    this.prisma.profile.updateMany({
          where: { user_id: userId },
          data: profileData,
        })
      : this.prisma.profile.findFirst({
          where: { user_id: userId },
        }),
  ]);

  return {
    success: true,
    message: 'Profile updated successfully',
    data: {
      user,
      profile,
    },
  };
}

}
