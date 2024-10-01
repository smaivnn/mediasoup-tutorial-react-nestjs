import { Module } from '@nestjs/common';
import { ProducerConsumerService } from './producer-consumer.service';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [RoomModule],
  providers: [ProducerConsumerService],
  exports: [ProducerConsumerService],
})
export class ProducerConsumerModule {}
