/*
  Warnings:

  - Added the required column `booking_id` to the `destinations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "booking_id" TEXT NOT NULL,
ADD COLUMN     "distance_text" TEXT,
ADD COLUMN     "dropoff_lat" DOUBLE PRECISION,
ADD COLUMN     "dropoff_lng" DOUBLE PRECISION,
ADD COLUMN     "duration_min" DOUBLE PRECISION,
ADD COLUMN     "pickup_lat" DOUBLE PRECISION,
ADD COLUMN     "pickup_lng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "live_locations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "booking_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "live_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_locations_booking_id_idx" ON "live_locations"("booking_id");

-- CreateIndex
CREATE INDEX "destinations_booking_id_idx" ON "destinations"("booking_id");

-- AddForeignKey
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_locations" ADD CONSTRAINT "live_locations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
