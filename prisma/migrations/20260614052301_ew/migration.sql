-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "percentage" DECIMAL(5,2),
    "fixed_fee" DECIMAL(10,2),

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);
