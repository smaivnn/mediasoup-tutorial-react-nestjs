import { mediaCodecs } from './../media.config';
import { Injectable } from '@nestjs/common';
import { IRoom } from './room.interface';
import { MediasoupService } from '../mediasoup.service';

@Injectable()
export class RoomService {
  private rooms: Map<string, IRoom> = new Map();
  constructor(private readonly mediasoupService: MediasoupService) {}

  public async createRoom(roomId: string): Promise<IRoom> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    const worker = this.mediasoupService.getWorker();
    const router = await worker.createRouter({ mediaCodecs });
    const newRoom: IRoom = {
      id: roomId,
      router: { router },
      peers: new Map(),
    };
    this.rooms.set(roomId, newRoom);

    console.log(`>> router created for room ${roomId}`);
    return newRoom;
  }

  public getRoom(roomId: string): IRoom | undefined {
    return this.rooms.get(roomId);
  }

  public removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  public addPeerToRoom(roomId: string, peerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (!room.peers.has(peerId)) {
      room.peers.set(peerId, {
        id: peerId,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      });
    }
  }

  public removePeerFromRoom(roomId: string, peerId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.peers.delete(peerId);
    }
  }
}
