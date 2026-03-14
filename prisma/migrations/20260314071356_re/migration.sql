/*
  Warnings:

  - Added the required column `user_id` to the `destinations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `live_locations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "live_locations" ADD COLUMN     "user_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_locations" ADD CONSTRAINT "live_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
