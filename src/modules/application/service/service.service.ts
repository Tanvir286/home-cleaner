import { Injectable } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ServiceService {
  constructor(private readonly prisma: PrismaService) {}

  // get all services by topic
  async getAll() {
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
