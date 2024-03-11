import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinChannelDto } from './dto/join-channel.dto';
import { rooms } from '../common/mock/mock';
import { SocketRoomMap } from '../types/maps/socketRoomMap';

@WebSocketGateway({
  cors: {
    origin: 'https://localhost:3000',
    credentials: true,
  },
})
export class SignalingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor() {}

  private socketRoomMap: SocketRoomMap = new Map();

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log(`Server initialized`);
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const roomId = this.socketRoomMap.get(client.id);
    if (roomId) {
      this.socketRoomMap.delete(client.id);
      this.removeSocketIdFromRoom(roomId, client.id);
      this.server.emit('status-change', { rooms });
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  async handleJoinChannel(
    @MessageBody() dto: JoinChannelDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = dto;
    client.join(roomId);
    this.socketRoomMap.set(client.id, roomId);
    this.addSocketIdToRoom(roomId, client.id);
    this.server.emit('status-change', { rooms });
  }

  @SubscribeMessage('leave-room')
  handleLeaveChannel(@ConnectedSocket() client: Socket) {
    const roomId = this.socketRoomMap.get(client.id);
    if (roomId) {
      this.socketRoomMap.delete(client.id);
      this.removeSocketIdFromRoom(roomId, client.id);
      this.server.emit('status-change', { rooms });
    }
  }

  addSocketIdToRoom(roomId: string, socketId: string) {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    rooms[roomId].push(socketId);
  }

  removeSocketIdFromRoom(roomId: string, socketId: string) {
    if (!rooms[roomId]) {
      return;
    }
    rooms[roomId] = rooms[roomId].filter((id) => id !== socketId);
    if (rooms[roomId].length === 0) {
      delete rooms[roomId];
    }
  }
}
