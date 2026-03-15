import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { geocodeAddress } from './utils/geocode.util';
import appConfig from 'src/config/app.config';
import { getDrivingDistance } from './utils/distance.util';
import { generateGoogleMapLink } from './utils/map.util';
import { UpdateLiveLocationDto } from './dto/update-live-location.dto';
import { DestinationGateway } from './destination.gateway';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class DestinationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly destinationGateway: DestinationGateway,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  private apiKey = appConfig().googleMaps.apiKey;

  // create destination for booking
  async create(
    createDestinationDto: CreateDestinationDto,
    user_id: string
  ) {
    const { booking_id } = createDestinationDto;

    const booking = await this.prisma.booking.findUnique({
      where: { id: booking_id },
      select: {
        maid_location: true,
        homeowner_location: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const existingDestination = await this.prisma.destination.findFirst({
      where: { booking_id },
    });

    if (existingDestination) {
      const mapLink = generateGoogleMapLink(
        { lat: existingDestination.pickup_lat, lng: existingDestination.pickup_lng },
        { lat: existingDestination.dropoff_lat, lng: existingDestination.dropoff_lng },
      );
      return {
        message: 'Destination already exists for this booking',
        destination: existingDestination,
        map_link: mapLink,
      };
    }

    // address -> lat,lng
    const pickupCoords = await geocodeAddress(
      booking.maid_location,
      this.apiKey,
    );
    const dropoffCoords = await geocodeAddress(
      booking.homeowner_location,
      this.apiKey,
    );

    // distance + driving time
    const distanceInfo = await getDrivingDistance(
      pickupCoords,
      dropoffCoords,
      this.apiKey,
    );
    // map link
    const mapLink = generateGoogleMapLink(pickupCoords, dropoffCoords);

    // save to db
    const destination = await this.prisma.destination.create({
      data: {
        user_id,
        booking_id,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        distance_km: distanceInfo.distance_km,
        distance_text: distanceInfo.distance_text,
        duration_min: distanceInfo.duration_seconds / 60,
      },
    });

    const livelocation = await this.prisma.liveLocation.create({
      data: {
        user_id,
        booking_id,
        latitude: pickupCoords.lat,
        longitude: pickupCoords.lng,
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
