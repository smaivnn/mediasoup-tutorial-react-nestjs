import * as mediasoup from 'mediasoup';

export const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 300,
    },
  },
];

export const webRtcTransport_options: mediasoup.types.WebRtcTransportOptions = {
  listenIps: [
    {
      ip: process.env.WEBRTC_LISTEN_IP || '127.0.0.1',
      announcedIp: process.env.WEBRTC_ANNOUNCED_IP || '127.0.0.1',
    },
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
};
