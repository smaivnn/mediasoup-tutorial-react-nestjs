import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { MediasoupModule } from '../mediasoup/mediasoup.module';

@Module({
  imports: [MediasoupModule],
  providers: [SignalingGateway],
})
export class SignalingModule {}
