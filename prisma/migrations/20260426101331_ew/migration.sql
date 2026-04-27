-- CreateEnum
CREATE TYPE "DangerStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "danger" ADD COLUMN     "status" "DangerStatus" NOT NULL DEFAULT 'PENDING';
