import { Module } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service';
import { RoomModule } from './room/room.module';
import { TransportModule } from './transport/transport.module';
import { ProducerConsumerModule } from './producer-consumer/producer-consumer.module';

@Module({
  imports: [RoomModule, TransportModule, ProducerConsumerModule],
  providers: [MediasoupService],
  exports: [
    MediasoupService,
    RoomModule,
    TransportModule,
    ProducerConsumerModule,
  ],
})
export class MediasoupModule {}
