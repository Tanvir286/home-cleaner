-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "homeowner_latitude" DOUBLE PRECISION,
ADD COLUMN     "homeowner_longitude" DOUBLE PRECISION,
ADD COLUMN     "maid_latitude" DOUBLE PRECISION,
ADD COLUMN     "maid_longitude" DOUBLE PRECISION;
