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

  // helper
  private async findServiceById(id: string) {
    const general = await this.prisma.generalCleaningPackage.findUnique({
      where: { id },
    });

    if (general) {
      return { service: general, type: 'GENERAL' };
    }

    const deep = await this.prisma.deepCleaningPackage.findUnique({
      where: { id },
    });

    if (deep) {
      return { service: deep, type: 'DEEP' };
    }

    return null;
  }

  // create service
  async create(
    dto: CreateServiceDto, 
    image?: Express.Multer.File
  ) {
    const { serviceType, title, packageType, description, price, duration } = dto;

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
          duration,
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
          duration,
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
    dto: UpdateServiceDto, 
    image?: Express.Multer.File
  ) {
   
    if (dto.serviceType) {
      throw new BadGatewayException('Service type cannot be updated');
    }

    if (dto.packageType) {
      throw new BadGatewayException('Package type cannot be updated');
    }

    const foundService = await this.findServiceById(id);

    if (!foundService) {
      throw new BadGatewayException('Service not found');
    }

    const { type } = foundService;

    const data: any = {};

    if (dto.title) data.title = dto.title;
    if (dto.description) data.description = dto.description;
    if (dto.price) data.price = dto.price;
    if (dto.duration) data.duration = dto.duration;

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

    if (type === 'GENERAL') {
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
        duration: true,
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
        duration: true,
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

  // get all residential cleaning services
  async getAllResidentialCleaning() {
   
    const services = await this.prisma.residentialCleaningPackage.findMany({
      select: {
        id: true,
        title: true,  
        serviceType: true,
        packageType: true,
        image: true,
        price: true,
        description: true,
        duration: true,
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
      message: 'Residential cleaning services retrieved successfully',
      data: {
        services: formattedServices,
      },
    };
  }

}
