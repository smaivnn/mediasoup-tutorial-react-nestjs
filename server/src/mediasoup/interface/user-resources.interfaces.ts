import * as mediasoup from 'mediasoup';

export interface ITransportInfo {
  sendTransport?: mediasoup.types.Transport;
  recvTransport?: Map<string, mediasoup.types.Transport>;
}

export interface IProducerInfo {
  audio?: mediasoup.types.Producer;
  camera?: mediasoup.types.Producer;
  display?: mediasoup.types.Producer;
}

export interface IConsumerInfo {
  audio?: mediasoup.types.Producer;
  camera?: mediasoup.types.Producer;
  display?: mediasoup.types.Producer;
}

export interface IMediaResources {
  transports?: ITransportInfo;
  producers?: IProducerInfo;
  consumers?: Map<string, IConsumerInfo>;
}

export type IMediaResourcesMap = Map<string, IMediaResources>;

export interface IRoom {
  router: mediasoup.types.Router;
  users: Set<string>;
}
