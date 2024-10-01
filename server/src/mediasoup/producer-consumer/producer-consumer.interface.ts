import { RtpParameters, RtpCapabilities } from 'mediasoup/node/lib/types';

export interface IProduceParams {
  roomId: string;
  peerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  transportId: string;
}

export interface IConsumeParams {
  roomId: string;
  peerId: string;
  producerId: string;
  rtpCapabilities: RtpCapabilities;
  transportId: string;
}
