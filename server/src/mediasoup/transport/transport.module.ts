import { Module } from '@nestjs/common';
import { TransportService } from './transport.service';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [RoomModule],
  providers: [TransportService],
  exports: [TransportService],
})
export class TransportModule {}
