import * as mediasoup from 'mediasoup';

export interface ITransportData {
  isConsumer?: boolean;
  roomId?: string;
  socketId?: string;
}

export interface TransportConnectData {
  dtlsParameters: mediasoup.types.DtlsParameters;
  isConsumer: boolean;
}
