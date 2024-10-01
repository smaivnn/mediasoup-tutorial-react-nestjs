import { Injectable } from '@nestjs/common';
import { RoomService } from '../room/room.service';
import { IConsumeParams, IProduceParams } from './producer-consumer.interface';
import { Consumer } from 'mediasoup/node/lib/types';

@Injectable()
export class ProducerConsumerService {
  constructor(private readonly roomService: RoomService) {}

  public async createProducer(params: IProduceParams): Promise<string> {
    const { roomId, peerId, kind, rtpParameters, transportId } = params;
    const room = this.roomService.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const peer = room.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }
    const transportData = peer.transports.get(transportId);
    if (!transportData) {
      throw new Error('Transport not found');
    }

    const producer = await transportData.transport.produce({
      kind,
      rtpParameters,
    });

    peer.producers.set(producer.id, { producer });

    return producer.id;
  }

  public async createConsumer(params: IConsumeParams): Promise<any> {
    const { roomId, peerId, producerId, rtpCapabilities, transportId } = params;
    const room = this.roomService.getRoom(roomId);

    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (!room.router.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error(`Cannot consume producer ${producerId}`);
    }

    const peer = room.peers.get(peerId)!;

    const transportData = peer.transports.get(transportId);
    if (!transportData) {
      throw new Error('Transport not found');
    }

    const consumer: Consumer = await transportData.transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });

    peer.consumers.set(consumer.id, { consumer });

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }
}
