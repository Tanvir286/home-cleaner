import { NotificationRepository } from "../repository/notification/notification.repository";
import type { NotificationType } from "../repository/notification/notification.repository";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SendAdminNotificationPayload = {
  sender_id: string;
  text: string;
  type: NotificationType;
  entity_id?: string;
};

export const sendAdminNotification = async (
  payload: SendAdminNotificationPayload,
) => {
  const adminUser = await prisma.user.findFirst({
    where: {
      type: "ADMIN",
    },
  });

  if (!adminUser) {
    return null;
  }

  const notificationPayload = {
    sender_id: payload.sender_id,
    receiver_id: adminUser.id,
    text: payload.text,
    type: payload.type,
    entity_id: payload.entity_id || payload.sender_id,
  };

  return await NotificationRepository.createNotification(notificationPayload);
};