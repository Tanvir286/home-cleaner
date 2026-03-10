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


  // create service
  @Post()
  async create(@Body() createServiceDto: CreateServiceDto) {
    return await this.serviceService.create(createServiceDto);
  }

  // update
   @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return await this.serviceService.update(id, updateServiceDto);
  }


  // delete

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
