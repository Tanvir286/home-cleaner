/*
  Warnings:

  - You are about to drop the `profile` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('GENERAL_CLEANING', 'DEEP_CLEANING');

-- DropForeignKey
ALTER TABLE "profile" DROP CONSTRAINT "profile_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "service_type" "ServiceType"[];

-- DropTable
DROP TABLE "profile";
