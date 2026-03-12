import { Injectable } from '@nestjs/common';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { geocodeAddress } from './utils/geocode.util';
import appConfig from 'src/config/app.config';
import { getDrivingDistance } from './utils/distance.util';
import { generateGoogleMapLink } from './utils/map.util';

@Injectable()
export class DestinationService {
  
  constructor(private readonly prisma: PrismaService) {}

  private apiKey = appConfig().googleMaps.apiKey;

  // create destination
  async create(createDestinationDto: CreateDestinationDto) {

    const { pickup_location, dropoff_location } = createDestinationDto;

    // address -> lat,lng
    const pickupCoords = await geocodeAddress(pickup_location, this.apiKey);
    const dropoffCoords = await geocodeAddress(dropoff_location, this.apiKey);


    // distance + driving time
    const distanceInfo = await getDrivingDistance(pickupCoords, dropoffCoords, this.apiKey);


    // map link
    const mapLink = generateGoogleMapLink(pickupCoords,dropoffCoords);


    // save to db
    const destination = await this.prisma.destination.create({
      data: {
        pickup_location: pickup_location,
        dropoff_location: dropoff_location,
        distance_km: distanceInfo.distance_km,
      },
    });


    return {
      id: destination.id,
      coordinates: {
        pickup: pickupCoords,
        dropoff: dropoffCoords,
      },
      distance_km: distanceInfo.distance_km,
      distance_text: distanceInfo.distance_text,
      duration: distanceInfo.duration_seconds,
      duration_text: distanceInfo.duration_text,
      map_link: mapLink,
      
    };


    
  }
}