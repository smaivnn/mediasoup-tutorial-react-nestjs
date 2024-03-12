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
      consumers: {
        audio: undefined,
        camera: undefined,
        display: undefined,
      },
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
      const { roomId, isConsumer, socketId } = data;
      const router = await this.getRouter(roomId);
      const transport = await router.createWebRtcTransport(
        webRtcTransport_options,
      );
      this.setTransport(isConsumer, socketId, transport);

      console.log('>> transport created for room', roomId);
      return transport;
    } catch (error) {
      console.error(error);
    }
  }

  setTransport(
    isConsumer: boolean,
    socketId: string,
    transport: mediasoup.types.WebRtcTransport,
  ) {
    const mediaResources = this.userMediaResources.get(socketId);
    if (isConsumer) {
      // mediaResources.transports.recvTransport.set(socketId, undefined);
    }
    mediaResources.transports.sendTransport = transport;
  }

  getTransport(isConsumer: boolean, socketId: string) {
    const mediaResources = this.userMediaResources.get(socketId);
    if (isConsumer) {
      // return mediaResources.transports.recvTransport
      return;
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
  }

  setUserInRoom(roomId: string, socketId: string) {
    this.rooms.get(roomId).users.add(socketId);
  }

  getExistProducers(roomId, socketId) {
    const userIds = this.rooms.get(roomId).users;
    const filteredUserIds = Array.from(userIds).filter((id) => id !== socketId);

    const prodcuerIds = filteredUserIds.map((id) => {
      const userMedia = this.userMediaResources.get(id);
      return {
        [id]: {
          audio: userMedia.producers.audio?.id,
          camera: userMedia.producers.camera?.id,
          display: userMedia.producers.display?.id,
        },
      };
    });

    return Object.assign({}, ...prodcuerIds);
  }
}
