import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  
  constructor(private readonly profileService: ProfileService) {}

  // update profile profile
  @Patch()
   @UseInterceptors(
      FileInterceptor('image', {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 }, 
      }),
    )
  async update(
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req,
    @UploadedFile() image?: Express.Multer.File,
 ) {
    const userId = req.user.userId; 
    return this.profileService.update(
      userId,
      updateProfileDto,
      image
    );
  }

  




}
