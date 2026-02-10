-- CreateEnum
CREATE TYPE "Slot" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "maid_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_type" "serviceType" NOT NULL,
    "package_type" "PackageType" NOT NULL,
    "booking_date" DATE NOT NULL,
    "slot" "Slot" NOT NULL,
    "total_price" DECIMAL(10,2),
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_maid_id_booking_date_slot_key" ON "bookings"("maid_id", "booking_date", "slot");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_maid_id_fkey" FOREIGN KEY ("maid_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
