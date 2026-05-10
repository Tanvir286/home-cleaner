import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {

  constructor(
    private readonly  prisma: PrismaService
  ) {}


  // get all notification 
  async findAll(userId: string) {
   
    const notifications = await this.prisma.notification.findMany({
      where: {
        receiver_id: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        notification_event: {
          select: {
            type: true,
            text: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const data = notifications.map((n) => ({
      id: n.id,
      created_at: n.created_at,
      type: n.notification_event?.type,
      text: n.notification_event?.text,
      sender: n.sender,
    }));

    return {
      success: true,
      message: 'Notifications retrieved successfully',
      data,
    };
  }

    

   
}
