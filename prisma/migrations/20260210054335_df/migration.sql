/*
  Warnings:

  - You are about to drop the column `package_type` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `service_type` on the `bookings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "package_type",
DROP COLUMN "service_type",
ADD COLUMN     "deep_cleaning_package_id" TEXT,
ADD COLUMN     "general_cleaning_package_id" TEXT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_deep_cleaning_package_id_fkey" FOREIGN KEY ("deep_cleaning_package_id") REFERENCES "deep_cleaning_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_general_cleaning_package_id_fkey" FOREIGN KEY ("general_cleaning_package_id") REFERENCES "general_cleaning_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
