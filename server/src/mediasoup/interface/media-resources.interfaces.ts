import * as mediasoup from 'mediasoup';
import {
  Consumer,
  Producer,
  Router,
  WebRtcTransport,
  Worker,
} from 'mediasoup/node/lib/types';

export interface ITransportData {
  isConsumer?: boolean;
  roomId?: string;
  socketId?: string;
  produceSocketId?: string;
}

export interface TransportConnectData {
  dtlsParameters: mediasoup.types.DtlsParameters;
  isConsumer: boolean;
}

export interface IWorker {
  worker: Worker;
  routers: Map<string, Router>;
}

export interface IRouter {
  router: Router;
}

export interface ITransport {
  transport: WebRtcTransport;
}

export interface IProducer {
  producer: Producer;
}

export interface IConsumer {
  consumer: Consumer;
}
