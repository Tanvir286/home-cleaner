/*
  Warnings:

  - You are about to drop the column `dropoff_location` on the `destinations` table. All the data in the column will be lost.
  - You are about to drop the column `pickup_location` on the `destinations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "destinations" DROP COLUMN "dropoff_location",
DROP COLUMN "pickup_location";
