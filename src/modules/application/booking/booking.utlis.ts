import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TanvirStorage } from 'src/common/lib/Disk/TanvirStorage';
import { StringHelper } from 'src/common/helper/string.helper';
import appConfig from 'src/config/app.config';

// Define the available booking slots
export type BookingSlot = 'A' | 'B' | 'C' | 'D';

// Define the time slots for booking
export const bookingSlotTimeMap: Record<BookingSlot, { start: string; end: string }> = {
  A: { start: '07:30am', end: '10:00am' },
  B: { start: '11:00am', end: '01:30pm' },
  C: { start: '01:30pm', end: '04:00pm' },
  D: { start: '04:00pm', end: '07:30pm' },
};

// Function to format booking date
// Use UTC date parts to avoid timezone shift when displaying dates.
export function formatBookingDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Function to resolve package details based on package ID
export async function resolvePackage(prisma: PrismaService, packageId: string) {
  const [generalPackage, deepPackage] = await Promise.all([
    prisma.generalCleaningPackage.findUnique({ where: { id: packageId } }),
    prisma.deepCleaningPackage.findUnique({ where: { id: packageId } }),
  ]);

  if (generalPackage) {
    return {
      general_cleaning_package_id: generalPackage.id,
      deep_cleaning_package_id: null,
      total_price: generalPackage.price ? Number(generalPackage.price) : null,
    };
  }

  if (deepPackage) {
    return {
      general_cleaning_package_id: null,
      deep_cleaning_package_id: deepPackage.id,
      total_price: deepPackage.price ? Number(deepPackage.price) : null,
    };
  }

  throw new NotFoundException('Selected package not found');
}

// Function to validate maid availability and booking constraints
export async function validateMaid(
  prisma: PrismaService,
  maidId: string,
  userId: string,
) {
  const maid = await prisma.user.findUnique({ where: { id: maidId } });

  if (!maid) {
    throw new NotFoundException('Maid not found');
  }

  if (maid.type !== 'MAID') {
    throw new BadRequestException('Selected user is not a maid');
  }

  if (maidId === userId) {
    throw new BadRequestException('You cannot book yourself');
  }
}

// Function to check if the selected slot is available for booking
export async function checkSlotAvailability(
  prisma: PrismaService,
  maidId: string,
  bookingDate: Date,
  slot: string,
) {
  const existingBooking = await prisma.booking.findUnique({
    where: {
      maid_id_booking_date_slot: {
        maid_id: maidId,
        booking_date: bookingDate,
        slot: slot as any,
      },
    },
  });

  if (existingBooking) {
    throw new BadRequestException(
      'This maid is already booked for the selected date and slot',
    );
  }
}

// Function to upload booking images 
export async function uploadBookingImages(
  imageFiles: Express.Multer.File[] = [],
): Promise<string[]> {
  const uploadedFiles: string[] = [];

  for (const image of imageFiles) {
    const fileName = `${StringHelper.randomString()}_${image.originalname}`;
    await TanvirStorage.put(
      `${appConfig().storageUrl.booking}/${fileName}`,
      image.buffer,
    );
    uploadedFiles.push(fileName);
  }

  return uploadedFiles;
}

export async function checkBalance(prisma: PrismaService, userId: string) {

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  return user?.balance ?? 0;
  
}


export async  function checkCommission(prisma: PrismaService) {
 
  const commission = await prisma.commission.findFirst({
    orderBy: { created_at: 'desc' },
  });
  return commission?.percentage ?? 0;
}
