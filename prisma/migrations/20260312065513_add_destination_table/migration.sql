-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "pickup_location" TEXT NOT NULL,
    "dropoff_location" TEXT NOT NULL,
    "distance_km" DOUBLE PRECISION,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);
