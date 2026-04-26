/*
  Warnings:

  - You are about to drop the `MaidVerification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MaidVerification" DROP CONSTRAINT "MaidVerification_user_id_fkey";

-- DropTable
DROP TABLE "MaidVerification";

-- CreateTable
CREATE TABLE "maid_verifications" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "id_card_front" TEXT,
    "id_card_back" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "maid_verifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "maid_verifications" ADD CONSTRAINT "maid_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
