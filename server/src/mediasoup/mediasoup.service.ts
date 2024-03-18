import { ITransportData } from './interface/media-resources.interfaces';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { mediaCodecs, webRtcTransport_options } from './media.config';
import {
  ITransportInfo,
  IProducerInfo,
  IConsumerInfo,
  IMediaResources,
  IMediaResourcesMap,
  IRoom,
} from './interface/user-resources.interfaces';

import * as mediasoup from 'mediasoup';
import * as os from 'os';

@Injectable()
export class MediasoupService implements OnModuleInit {
  private nextWorkerIndex = 0;
  private workers: mediasoup.types.Worker[] = [];
  private rooms = new Map<string, IRoom>();
  private userMediaResources: IMediaResourcesMap = new Map();

  constructor() {}

  async onModuleInit() {
    const numWorkers = os.cpus().length;

    for (let i = 0; i < numWorkers; ++i) {
      await this.createWorker();
    }
  }

  async createWorker() {
    const worker = await mediasoup.createWorker({
      rtcMinPort: 6002,
      rtcMaxPort: 6202,
    });

    worker.on('died', () => {
      console.error('mediasoup worker has died');
      setTimeout(() => process.exit(1), 2000);
    });

    this.workers.push(worker);
    return worker;
  }

  getWorker() {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  createUserMediaResources(socketId: string) {
    const mediaResources: IMediaResources = {
      transports: {
        sendTransport: undefined,
        recvTransport: new Map(),
      },
      producers: {
        audio: undefined,
        camera: undefined,
        display: undefined,
      },
      consumers: new Map<string, IConsumerInfo>(),
    };

    this.userMediaResources.set(socketId, mediaResources);
  }

  async createRouter(roomId: string): Promise<mediasoup.types.Router> {
    const worker = this.getWorker();
    const router = await worker.createRouter({
      mediaCodecs,
    });
    this.rooms.set(roomId, { router, users: new Set() });
    console.log(`>> router created for room ${roomId}`);

    return router;
  }

  async getRouter(roomId: string): Promise<mediasoup.types.Router> {
    let router = this.rooms.get(roomId)?.router;

    if (!router) {
      router = await this.createRouter(roomId);
    }
    return router;
  }

  async createWebRtcTransport(
    data: ITransportData,
  ): Promise<mediasoup.types.WebRtcTransport> {
    try {
      const { roomId, isConsumer, socketId, produceSocketId } = data;
      const router = await this.getRouter(roomId);
      const transport = await router.createWebRtcTransport(
        webRtcTransport_options,
      );
      this.setTransport(isConsumer, socketId, transport, produceSocketId);

      isConsumer === true
        ? console.log('>> recv transport created for room', roomId)
        : console.log('>> send transport created for room', roomId);

      return transport;
    } catch (error) {
      console.error(error);
    }
  }

  setTransport(
    isConsumer: boolean,
    socketId: string,
    transport: mediasoup.types.WebRtcTransport,
    produceSocketId: string | null,
  ) {
    const mediaResources = this.userMediaResources.get(socketId);
    if (isConsumer) {
      mediaResources.transports.recvTransport.set(produceSocketId, transport);
    }
    mediaResources.transports.sendTransport = transport;
  }

  getTransport(
    isConsumer: boolean,
    socketId: string,
    produceSocketId: string | null = null,
  ) {
    const mediaResources = this.userMediaResources.get(socketId);
    if (isConsumer) {
      return mediaResources.transports.recvTransport.get(produceSocketId);
    }
    return mediaResources.transports.sendTransport;
  }

  setProducer(
    socketId: string,
    mediaTag: string,
    producer: mediasoup.types.Producer,
  ) {
    const mediaResources = this.userMediaResources.get(socketId);
    mediaResources.producers[mediaTag] = producer;
    console.log(
      producer.id,
      '>> producer created for',
      mediaTag,
      'by',
      socketId,
    );
  }

  getProducer(socketId: string, mediaTag: string) {
    const mediaResources = this.userMediaResources.get(socketId);
    console.log(
      mediaResources.producers[mediaTag].id,
      '>> get producer for',
      mediaTag,
      'by',
      socketId,
    );
    return mediaResources.producers[mediaTag];
  }

  getProducers(socketId: string) {
    const mediaResources = this.userMediaResources.get(socketId);
    return mediaResources.producers;
  }

  setConsumer(
    socketId: string,
    produceSocketId: string,
    mediaTag: string,
    consumer: mediasoup.types.Consumer,
  ) {
    const mediaResources = this.userMediaResources.get(socketId);
    let consumerInfo = mediaResources.consumers.get(produceSocketId);
    if (!consumerInfo) {
      consumerInfo = {};
    }
    consumerInfo[mediaTag] = consumer;
    mediaResources.consumers.set(produceSocketId, consumerInfo);
  }

  getConsumer(
    socketId: string,
    produceSocketId: string,
    mediaTag: string,
  ): mediasoup.types.Consumer {
    const mediaResources = this.userMediaResources.get(socketId);
    const consumerInfo = mediaResources.consumers.get(produceSocketId);
    return consumerInfo[mediaTag];
  }

  setUserInRoom(roomId: string, socketId: string) {
    this.rooms.get(roomId).users.add(socketId);
  }

  getExistProducers(roomId, socketId) {
    const userIds = this.rooms.get(roomId).users;
    const filteredUserIds = Array.from(userIds).filter((id) => id !== socketId);

    return filteredUserIds;
  }
}
