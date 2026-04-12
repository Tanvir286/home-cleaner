-- CreateTable
CREATE TABLE "records" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "title" TEXT,
    "description" TEXT,
    "image" TEXT,
    "type" TEXT,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);
