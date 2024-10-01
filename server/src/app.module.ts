import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MediasoupModule } from './mediasoup/mediasoup.module';
import { SignalingModule } from './signaling/signaling.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    MediasoupModule,
    SignalingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
