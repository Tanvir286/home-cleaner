import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type JoinDestinationRoomBody = {
  booking_id: string;
};

type LiveLocationPayload = {
  booking_id: string;
  lat: number;
  lng: number;
  timestamp?: string;
  remaining?: {
    distance_km: number;
    distance_text: string;
    duration_text: string;
    duration_seconds: number;
  } | null;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class DestinationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // client room join
  @SubscribeMessage('joinDestinationRoom')
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinDestinationRoomBody,
  ) {
    const room = `booking_${body.booking_id}`;

    client.join(room);

    return {
      success: true,
      room,
      booking_id: body.booking_id,
    };
  }

  // broadcast live location
  broadcastLiveLocation(data: LiveLocationPayload) {
    const room = `booking_${data.booking_id}`;

    const payload = {
      booking_id: data.booking_id,
      lat: data.lat,
      lng: data.lng,
      timestamp: data.timestamp ?? new Date().toISOString(),
      remaining: data.remaining ?? null,
    };

    this.server.to(room).emit('liveLocationUpdated', payload);
  }
}