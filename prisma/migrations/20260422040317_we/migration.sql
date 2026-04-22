/*
  Warnings:

  - You are about to drop the column `current_address` on the `danger_notifications` table. All the data in the column will be lost.
  - Added the required column `latitude` to the `danger_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `danger_notifications` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "danger_notifications" DROP CONSTRAINT "danger_notifications_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "danger_notifications" DROP CONSTRAINT "danger_notifications_user_id_fkey";

-- AlterTable
ALTER TABLE "danger_notifications" DROP COLUMN "current_address",
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL;

-- AddForeignKey
ALTER TABLE "danger_notifications" ADD CONSTRAINT "danger_notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danger_notifications" ADD CONSTRAINT "danger_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
