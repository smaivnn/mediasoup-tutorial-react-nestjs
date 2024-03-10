import { Injectable } from '@nestjs/common';
import { rooms } from './common/mock/mock';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getRoomStatus(): Record<string, string[]> {
    return rooms;
  }
}
