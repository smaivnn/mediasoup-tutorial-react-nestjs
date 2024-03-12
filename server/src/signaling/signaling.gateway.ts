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
import * as mediasoup from 'mediasoup';
import { Server, Socket } from 'socket.io';
import { JoinChannelDto } from './dto/join-channel.dto';
import { rooms } from '../common/mock/mock';
import { SocketRoomMap } from '../types/maps/socketRoomMap';
import { MediasoupService } from 'src/mediasoup/mediasoup.service';
import {
  ITransportData,
  TransportConnectData,
} from 'src/mediasoup/interface/media-resources.interfaces';

@WebSocketGateway({
  cors: {
    origin: 'https://localhost:3000',
    credentials: true,
  },
})
export class SignalingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly mediasoupService: MediasoupService) {}

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
    this.mediasoupService.createUserMediaResources(client.id);
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

  @SubscribeMessage('create-router')
  async hanldeRTPcapabilities(
    @MessageBody() roomId: string,
  ): Promise<mediasoup.types.RtpCapabilities> {
    const router: mediasoup.types.Router =
      await this.mediasoupService.getRouter(roomId);

    return router.rtpCapabilities;
  }

  @SubscribeMessage('create-webRTC-transport')
  async createTransport(
    @MessageBody() data: ITransportData,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;
    if (!roomId) {
      return;
    }
    const newData = { ...data, socketId: client.id };
    const transport =
      await this.mediasoupService.createWebRtcTransport(newData);
    const transportParams = {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
    return transportParams;
  }

  @SubscribeMessage('transport-connect')
  async handleConnectTransport(
    @MessageBody() data: TransportConnectData,
    @ConnectedSocket() client: Socket,
  ) {
    const { dtlsParameters, isConsumer } = data;
    const roomId = this.socketRoomMap.get(client.id);
    try {
      const transport = this.mediasoupService.getTransport(
        isConsumer,
        client.id,
      );
      await transport.connect({ dtlsParameters });
      this.mediasoupService.setUserInRoom(roomId, client.id);
    } catch (error) {
      console.error(error);
    }
  }

  @SubscribeMessage('transport-produce')
  async handleProduceTransport(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const { kind, rtpParameters, isConsumer, mediaTag } = data;
    const transport = this.mediasoupService.getTransport(isConsumer, client.id);
    const producer = await transport.produce({ kind, rtpParameters });
    this.mediasoupService.setProducer(client.id, mediaTag, producer);

    // 방에 사람이 있는지 전달한다.
    const roomId = this.socketRoomMap.get(client.id);
    const existProducerObj = this.mediasoupService.getExistProducers(
      roomId,
      client.id,
    );

    return { producerId: producer.id, existProducerObj };
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
