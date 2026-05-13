/*
  Warnings:

  - You are about to drop the column `order_id` on the `payment_transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[booking_id]` on the table `payment_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "payment_transactions" DROP COLUMN "order_id",
ADD COLUMN     "booking_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_booking_id_key" ON "payment_transactions"("booking_id");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
