import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  // get all general_cleaning_package services
  @Get('general-cleaning-package')
  async getAll() {
    return await this.serviceService.getAll();
  }

  //Get all deep_cleaning_package services
  @Get('deep-cleaning-package')
  async getAllDeepCleaningPackage() {
    return await this.serviceService.getAllDeepCleaningPackage();
  }


  

}
