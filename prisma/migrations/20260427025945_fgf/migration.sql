/*
  Warnings:

  - The values [CONFIRMED] on the enum `DangerStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DangerStatus_new" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');
ALTER TABLE "danger" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "danger" ALTER COLUMN "status" TYPE "DangerStatus_new" USING ("status"::text::"DangerStatus_new");
ALTER TYPE "DangerStatus" RENAME TO "DangerStatus_old";
ALTER TYPE "DangerStatus_new" RENAME TO "DangerStatus";
DROP TYPE "DangerStatus_old";
ALTER TABLE "danger" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
