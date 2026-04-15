import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as path from 'path';
import * as fs from 'fs';
import appConfig from '../../../config/app.config';

// Temporary enum
enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  PENDING = 'PENDING',
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 1e8,
})
export class MessageGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  public clients = new Map<string, string>();
  private activeUsers = new Map<string, string>();

  onModuleInit() {}

  afterInit(server: Server) {
    console.log('Websocket server started');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const authHeader = client.handshake.headers.authorization;

      if (!authHeader) {
        client.disconnect();
        return;
      }

      const token = authHeader.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const decoded: any = jwt.verify(token, appConfig().jwt.secret);

      const { sub: userId } = decoded;

      if (!userId) {
        client.disconnect();
        return;
      }

      this.clients.set(userId, client.id);

      client.join(`user_${userId}`);

      console.log(`User joined room: user_${userId}`);
    } catch (error: any) {
      console.error('Error handling connection:', error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = [...this.clients.entries()].find(
      ([, socketId]) => socketId === client.id,
    )?.[0];

    if (userId) {
      this.clients.delete(userId);

      const username = [...this.activeUsers.entries()].find(
        ([, id]) => id === client.id,
      )?.[0];
      if (username) {
        this.activeUsers.delete(username);
      }

      this.server.emit('userStatusChange', {
        user_id: userId,
        status: 'offline',
      });

      console.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('joinroom')
  handleRoomJoin(client: Socket, body: { room_id: string }) {
    const room_id = body.room_id;
    console.log('room connected', room_id);
    client.join(room_id);
    client.emit('joinedRoom', { room_id: room_id });
  }

  @SubscribeMessage('sendMessage')
  async listenForMessages(
    client: Socket,
    @MessageBody() body: { to: string; data: any },
  ) {
    const recipientSocketId = this.clients.get(body.to);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('message', {
        from: body.data.sender.id,
        data: body.data,
      });
    }
  }

  @SubscribeMessage('updateMessageStatus')
  async updateMessageStatus(
    client: Socket,
    @MessageBody() body: { message_id: string; status: MessageStatus },
  ) {
    this.server.emit('messageStatusUpdated', {
      message_id: body.message_id,
      status: body.status,
    });
  }
}

