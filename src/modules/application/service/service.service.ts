import { BadGatewayException, Injectable } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { StringHelper } from 'src/common/helper/string.helper';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import appConfig from 'src/config/app.config';
import { find } from 'rxjs';

@Injectable()
export class ServiceService {
  constructor(private readonly prisma: PrismaService) {}

  // create service
  async create(dto: CreateServiceDto, image?: Express.Multer.File) {
    const { serviceType, title, packageType, description, price } = dto;

    // upload image to storage
    let fileName: string | undefined;

    if (image) {
      fileName = `${StringHelper.randomString()}_${image.originalname}`;
      await TanvirStorage.put(
        appConfig().storageUrl.package + '/' + fileName,
        image.buffer,
      );
    }

    let service;

    if (serviceType === 'GENERAL_CLEANING') {
      service = await this.prisma.generalCleaningPackage.create({
        data: {
          title,
          serviceType,
          packageType,
          image: fileName,
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
          image: fileName,
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
  async update(id: string, dto: UpdateServiceDto, image?: Express.Multer.File) {
    if (dto.serviceType) {
      throw new BadGatewayException('Service type cannot be updated');
    }

    if (dto.packageType) {
      throw new BadGatewayException('Package type cannot be updated');
    }

    // find service in both tables
    const generalService = await this.prisma.generalCleaningPackage.findUnique({
      where: { id },
    });

    const deepService = !generalService
      ? await this.prisma.deepCleaningPackage.findUnique({
          where: { id },
        })
      : null;

    const existingService = generalService || deepService;

    if (!existingService) {
      throw new BadGatewayException('Service not found');
    }

    const data: any = {};

    if (dto.title) data.title = dto.title;
    if (dto.description) data.description = dto.description;
    if (dto.price) data.price = dto.price;

    if (image) {
      // delete old image
      const oldService =
        (await this.prisma.generalCleaningPackage.findUnique({
          where: { id },
        })) ||
        (await this.prisma.deepCleaningPackage.findUnique({
          where: { id },
        }));

      if (oldService?.image) {
        await TanvirStorage.delete(
          appConfig().storageUrl.package + '/' + oldService.image,
        );
      }

      // upload new image
      const fileName = `${StringHelper.randomString()}_${image.originalname}`;
      await TanvirStorage.put(
        appConfig().storageUrl.package + '/' + fileName,
        image.buffer,
      );
      data.image = fileName;
    }

    let updatedService;

    if (generalService) {
      updatedService = await this.prisma.generalCleaningPackage.update({
        where: { id },
        data,
      });
    } else {
      updatedService = await this.prisma.deepCleaningPackage.update({
        where: { id },
        data,
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
        image: true,
        price: true,
        description: true,
      },
    });

    const formattedServices = services.map((service) => ({
      ...service,
      image_url: service.image
        ? TanvirStorage.url(
            appConfig().storageUrl.package + '/' + service.image,
          )
        : null,
    }));

    return {
      success: true,
      message: 'Services retrieved successfully',
      data: {
        services: formattedServices,
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
        image: true,
        price: true,
        description: true,
      },
    });

    const formattedServices = services.map((service) => ({
      ...service,
      image_url: service.image
        ? TanvirStorage.url(
            appConfig().storageUrl.package + '/' + service.image,
          )
        : null,
    }));

    return {
      success: true,
      message: 'Deep cleaning package services retrieved successfully',
      data: {
        services: formattedServices,
      },
    };
  }
}
