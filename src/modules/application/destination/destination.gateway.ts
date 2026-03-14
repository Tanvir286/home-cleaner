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

type UpdateDestinationLocationBody = {
	booking_id: string;
	user_id?: string;
	lat: number;
	lng: number;
	timestamp?: string;
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
		client.emit('destinationConnected', { connected: true });
	}

	handleDisconnect(client: Socket) {
		client.emit('destinationDisconnected', { connected: false });
	}

	@SubscribeMessage('joinDestinationRoom')
	joinRoom(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: JoinDestinationRoomBody,
	) {
		const room = `booking_${body.booking_id}`;
		client.join(room);

		client.emit('joinedDestinationRoom', {
			booking_id: body.booking_id,
			room,
		});
	}

	@SubscribeMessage('updateLiveLocation')
	updateLiveLocation(@MessageBody() body: UpdateDestinationLocationBody) {
		const room = `booking_${body.booking_id}`;

		const payload = {
			booking_id: body.booking_id,
			user_id: body.user_id ?? null,
			lat: body.lat,
			lng: body.lng,
			timestamp: body.timestamp ?? new Date().toISOString(),
		};

		this.server.to(room).emit('liveLocationUpdated', payload);

		return {
			success: true,
			room,
		};
	}
}

