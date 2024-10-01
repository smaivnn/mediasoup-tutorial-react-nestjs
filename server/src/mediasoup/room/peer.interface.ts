import {
  IConsumer,
  IProducer,
  ITransport,
} from '../interface/media-resources.interfaces';

export interface Peer {
  id: string;
  transports: Map<string, ITransport>;
  producers: Map<string, IProducer>;
  consumers: Map<string, IConsumer>;
}
