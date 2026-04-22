/*
  Warnings:

  - You are about to drop the `danger_notifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "danger_notifications" DROP CONSTRAINT "danger_notifications_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "danger_notifications" DROP CONSTRAINT "danger_notifications_user_id_fkey";

-- DropTable
DROP TABLE "danger_notifications";

-- CreateTable
CREATE TABLE "danger" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "booking_id" TEXT,
    "user_id" TEXT,

    CONSTRAINT "danger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "danger_booking_id_key" ON "danger"("booking_id");

-- AddForeignKey
ALTER TABLE "danger" ADD CONSTRAINT "danger_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danger" ADD CONSTRAINT "danger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
