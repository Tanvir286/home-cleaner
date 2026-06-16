import { Logger } from '@nestjs/common';
import { BookingStatus, PrismaClient } from '@prisma/client';
import { sendUserNotification } from 'src/common/utils/notification.util';

const logger = new Logger('CronUtils');


export async function autoRejectPendingBookings(prisma: PrismaClient) {
  try {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    // Find all pending bookings older than 3 hours
    const pendingBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        created_at: {
          lt: threeHoursAgo,
        },
        deleted_at: null,
      },
    });

    if (pendingBookings.length === 0) {
      return;
    }

    logger.log(`Found ${pendingBookings.length} pending booking(s) older than 3 hours for auto-rejection.`);

    for (const booking of pendingBookings) {
      const amount = Number(booking.total_price ?? 0);
      const userId = booking.user_id;
      const maidId = booking.maid_id;

      try {
        await prisma.$transaction(async (tx) => {
          // Update booking status to REJECTED
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.REJECTED },
          });

          // Refund to homeowner balance if amount > 0
          if (amount > 0 && userId) {
            await tx.user.update({
              where: { id: userId },
              data: {
                balance: {
                  increment: amount,
                },
              },
            });

            // Create refund payment transaction record
            await tx.paymentTransaction.create({
              data: {
                booking_id: booking.id,
                user_id: userId,
                type: 'refund',
                status: 'completed',
                amount: amount,
              },
            });
          }
        });

        // Send notification to Homeowner
        if (userId) {
          await sendUserNotification({
            sender_id: 'system',
            receiver_id: userId,
            text: `Your booking (ID: ${booking.id}) has been automatically rejected as the maid did not approve it within 3 hours. The amount of $${amount} has been refunded to your balance.`,
            type: 'cancel_booking',
            entity_id: booking.id,
          }).catch((err) => {
            logger.error(`Failed to send auto-reject notification to homeowner ${userId}: ${err.message}`);
          });
        }

        // Send notification to Maid
        if (maidId) {
          await sendUserNotification({
            sender_id: 'system',
            receiver_id: maidId,
            text: `Booking (ID: ${booking.id}) has been automatically rejected because it was not approved within 3 hours.`,
            type: 'cancel_booking',
            entity_id: booking.id,
          }).catch((err) => {
            logger.error(`Failed to send auto-reject notification to maid ${maidId}: ${err.message}`);
          });
        }

        logger.log(`Booking ${booking.id} auto-rejected and refunded successfully.`);
      } catch (err: any) {
        logger.error(`Failed to auto-reject booking ${booking.id}: ${err.message}`);
      }
    }
  } catch (error: any) {
    logger.error(`Error in autoRejectPendingBookings: ${error.message}`);
  }
}
