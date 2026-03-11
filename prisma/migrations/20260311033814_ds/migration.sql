/*
  Warnings:

  - You are about to drop the column `avater` on the `deep_cleaning_packages` table. All the data in the column will be lost.
  - You are about to drop the column `avater` on the `general_cleaning_packages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "deep_cleaning_packages" DROP COLUMN "avater",
ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "general_cleaning_packages" DROP COLUMN "avater",
ADD COLUMN     "image" TEXT;
