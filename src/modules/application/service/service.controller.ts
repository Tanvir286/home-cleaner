import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('service')
export class ServiceController {
  
  constructor(private readonly serviceService: ServiceService) {}


  // create service
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return await this.serviceService.create(createServiceDto, image);
  }

  // update service
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return await this.serviceService.update(id, updateServiceDto, image);
  }

  // get all general_cleaning_package services
  @Get('general-cleaning-package')
  async getAll() {
    return await this.serviceService.getAllGeneralCleaningPackages();
  }

  //Get all deep_cleaning_package services
  @Get('deep-cleaning-package')
  async getAllDeepCleaningPackage() {
    return await this.serviceService.getAllDeepCleaningPackage();
  }


  

}
