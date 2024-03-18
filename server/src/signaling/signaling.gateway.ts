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

    const roomId = this.socketRoomMap.get(client.id);
    const existUserObj = this.mediasoupService.getExistProducers(
      roomId,
      client.id,
    );

    client.broadcast.to(roomId).emit('new-producer', {
      produceSocket: client.id,
      mediaTag,
    });

    return { producerId: producer.id, existUserObj };
  }

  @SubscribeMessage('consume-all')
  async handleConsumeAll(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { rtpCapabilities, produceSocketId } = data;
      const roomId = this.socketRoomMap.get(client.id);
      const router = await this.mediasoupService.getRouter(roomId);
      const transport = await this.mediasoupService.getTransport(
        true,
        client.id,
        produceSocketId,
      );
      let paramsArray = [];
      const producers = this.mediasoupService.getProducers(produceSocketId);
      for (let mediaTag in producers) {
        if (producers[mediaTag] !== undefined) {
          if (
            router.canConsume({
              producerId: producers[mediaTag].id,
              rtpCapabilities,
            })
          ) {
            try {
              console.log(`consume run ${mediaTag}`);
              const consumer = await transport.consume({
                producerId: producers[mediaTag].id,
                rtpCapabilities,
                paused: true,
              });
              console.log('consumer created : ', consumer.id);
              this.mediasoupService.setConsumer(
                client.id,
                produceSocketId,
                mediaTag,
                consumer,
              );

              const params = {
                id: consumer.id,
                producerId: producers[mediaTag].id,
                produceSocketId: produceSocketId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
              };
              await consumer.resume();

              paramsArray.push({ params });
            } catch (error) {
              console.error('Error creating consumer: ', error);
            }
          }
        }
      }
      return { paramsArray };
    } catch (error) {}
  }
  //
  @SubscribeMessage('consume-single')
  async handleConsume(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const { rtpCapabilities, produceSocketId, mediaTag } = data;
    const roomId = this.socketRoomMap.get(client.id);
    const router = await this.mediasoupService.getRouter(roomId);
    const transport = await this.mediasoupService.getTransport(
      true,
      client.id,
      produceSocketId,
    );

    const producer = this.mediasoupService.getProducer(
      produceSocketId,
      mediaTag,
    );

    if (
      router.canConsume({
        producerId: producer.id,
        rtpCapabilities,
      })
    ) {
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: true,
      });

      console.log(mediaTag, 'consumer created : ', consumer.id);
      this.mediasoupService.setConsumer(
        client.id,
        produceSocketId,
        mediaTag,
        consumer,
      );
      let paramsArray = [];
      const params = {
        id: consumer.id,
        producerId: producer.id,
        produceSocketId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
      await consumer.resume();
      paramsArray.push({ params });
      return { paramsArray };
    }
  }

  @SubscribeMessage('new-video-producer')
  async handleNewVideoProducer(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = this.socketRoomMap.get(client.id);
    const { mediaTag } = data;
    client.broadcast
      .to(roomId)
      .emit('new-producer', { produceSocket: client.id, mediaTag });
  }
  //
  @SubscribeMessage('recv-connect')
  async handleRecvConnect(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const { dtlsParameters, isConsumer, produceSocketId } = data;
    const transport = this.mediasoupService.getTransport(
      isConsumer,
      client.id,
      produceSocketId,
    );
    await transport.connect({ dtlsParameters });
    console.log('recv transport connected');
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
