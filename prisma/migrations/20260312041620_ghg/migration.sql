/*
  Warnings:

  - Made the column `homeowner_location` on table `bookings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `maid_location` on table `bookings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "homeowner_location" SET NOT NULL,
ALTER COLUMN "maid_location" SET NOT NULL;
