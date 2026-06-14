-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "residential_cleaning_package_id" TEXT;

-- CreateTable
CREATE TABLE "residential_cleaning_packages" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "title" TEXT,
    "serviceType" "serviceType" NOT NULL DEFAULT 'RESIDENTIAL_CLEANING',
    "packageType" "PackageType" NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "duration" TEXT,
    "price" DECIMAL(10,2),

    CONSTRAINT "residential_cleaning_packages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_residential_cleaning_package_id_fkey" FOREIGN KEY ("residential_cleaning_package_id") REFERENCES "residential_cleaning_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
