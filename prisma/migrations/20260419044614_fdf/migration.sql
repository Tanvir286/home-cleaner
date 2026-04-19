-- CreateTable
CREATE TABLE "danger_notifications" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "current_address" TEXT,
    "booking_id" TEXT,
    "user_id" TEXT,

    CONSTRAINT "danger_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "danger_notifications_booking_id_key" ON "danger_notifications"("booking_id");

-- AddForeignKey
ALTER TABLE "danger_notifications" ADD CONSTRAINT "danger_notifications_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "danger_notifications" ADD CONSTRAINT "danger_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
