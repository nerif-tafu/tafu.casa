export const config = {
  server: {
    port: 9000,
    ssl: process.env.USE_SSL === 'true' ? {
      key: '/app/certs/private.key',
      cert: '/app/certs/certificate.crt'
    } : null
  },
  mediasoup: {
    worker: {
      rtcMinPort: 2000,
      rtcMaxPort: 2020,
    },
    router: {
      mediaCodecs: [
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
      ],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: '127.0.0.1'
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    },
  },
}; 