import { Injectable } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ServiceService {
  constructor(private readonly prisma: PrismaService) {}


  // create service
  async create(
    dto: CreateServiceDto
  ) {
    const { 
      serviceType, 
      title,
      packageType,
      description,
      price,
    } = dto;

    let service;

     if (serviceType === 'GENERAL_CLEANING') {
      service = await this.prisma.generalCleaningPackage.create({
        data: {
          title,
          serviceType,
          packageType,
          description,
          price,
        },
      });
    }

    if (serviceType === 'DEEP_CLEANING') {
      service = await this.prisma.deepCleaningPackage.create({
        data: {
          title,
          serviceType,
          packageType,
          description,
          price,
        },
      });
    }

    return {
      success: true,
      message: 'Service created successfully',
      data: {
        service,
      },
    };
  }

  // update service
  async update(
    id: string,
    dto: UpdateServiceDto  
  ) {
    const {
      serviceType, 
      ...updateData
    } = dto;

    let updatedService;

    if (serviceType === 'GENERAL_CLEANING') {
      updatedService = await this.prisma.generalCleaningPackage.update({
        where: { id },
        data: updateData,
      });
    }

    if (serviceType === 'DEEP_CLEANING') {
      updatedService = await this.prisma.deepCleaningPackage.update({
        where: { id },
        data: updateData,
      });
    }

    return {
      success: true,
      message: 'Service updated successfully',
      data: {
        service: updatedService,
      },
    };
  }

  // get all general-cleaning_package services
  async getAllGeneralCleaningPackages() {
    const services = await this.prisma.generalCleaningPackage.findMany({
      select: {
        id: true,
        title: true,
        serviceType: true,
        packageType: true,
        price: true,
        description: true,
      },
    });

    return {
      success: true,
      message: 'Services retrieved successfully',
      data: {
        services,
      },
    };
  }

  // get all deep_cleaning_package services
  async getAllDeepCleaningPackage() {
    const services = await this.prisma.deepCleaningPackage.findMany({
      select: {
        id: true,
        title: true,
        serviceType: true,
        packageType: true,
        price: true,
        description: true,
      },
    });

    return {
      success: true,
      message: 'Deep cleaning package services retrieved successfully',
      data: {
        services,
      },
    };
  }

  

}
