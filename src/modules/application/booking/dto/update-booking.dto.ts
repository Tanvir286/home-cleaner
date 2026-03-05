import { IsEnum } from "class-validator";
import { Booking } from "../entities/booking.entity";
import { BookingStatus } from "@prisma/client";

export class UpdateBookingDto {

    @IsEnum(BookingStatus)
    status: BookingStatus;


}
