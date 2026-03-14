import { BadGatewayException, Injectable } from '@nestjs/common';
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

    const { 
      booking_id
    } = createDestinationDto;

    const booking = await this.prisma.booking.findUnique({
      where: { id: booking_id },
      select: {
        maid_location: true,
        homeowner_location: true,
      },
    });


    if (!booking) {
      throw new BadGatewayException("Booking not found");
    }

    // address -> lat,lng
    const pickupCoords = await geocodeAddress(booking.maid_location, this.apiKey);
    const dropoffCoords = await geocodeAddress(booking.homeowner_location, this.apiKey);


    // distance + driving time
    const distanceInfo = await getDrivingDistance(pickupCoords, dropoffCoords, this.apiKey);


    // map link
    const mapLink = generateGoogleMapLink(pickupCoords,dropoffCoords);


    // save to db
    const destination = await this.prisma.destination.create({
      data: {
        pickup_location: booking.maid_location,
        dropoff_location: booking.homeowner_location,
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