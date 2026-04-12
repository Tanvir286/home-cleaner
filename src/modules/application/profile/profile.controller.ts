import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // topic: maid part  ---------->

  // get profile details
  @UseGuards(JwtAuthGuard)
  @Get('me/details')
  async getProfileDetails(@Req() req) {
    const userId = req.user.userId;
    return this.profileService.getProfileDetails(userId);
  }

  
  // maid profile details
  @Get('maid/details/:maidId')
  async getMaidProfileDetails(
    @Param('maidId') maidId: string
  ) {
    return this.profileService.getProfileDetails(maidId);
  }



  // maid profile update
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MAID)
  @Patch('maid/update')
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
    return this.profileService.updatemaid(userId, updateProfileDto, image);
  }

  // review maid by homeowner
  @Get('maid/review/:maidId')
  async reviewMaid(
    @Param('maidId') maidId: string
  ) {
    return this.profileService.reviewMaid(
      maidId
    );
  }
 
  // topic: homeowner part  ---------->

  // get profile details
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @Get('homeowner/details')
  async getHomeownerProfileDetails(@Req() req) {
    const userId = req.user.userId;
    return this.profileService.getHomeownerProfileDetails(userId);
  }

  // homeowner profile update
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOMEOWNER)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Patch('homeowner/update')
  async updateHomeowner(
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const userId = req.user.userId;
    return this.profileService.updateHomeowner(userId, updateProfileDto, image);
  }
}
