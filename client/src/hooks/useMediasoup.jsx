import * as MediasoupClient from "mediasoup-client";
import MediaStore from "../store/MediaStore";

function useMediasoup() {
  const { media_socket, setAudioParams, setDevice, setSendTransport } =
    MediaStore();

  const getLocalAudioStream = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => audioStreamSuccess(stream, "audio"))
      .catch((err) => console.error(err));
  };

  const audioStreamSuccess = (stream, type) => {
    let audioParams = { track: stream.getAudioTracks()[0], type };
    setAudioParams(audioParams);
    getRtpCapabilities();
  };

  const getLocalDisplayStream = () => {
    navigator.mediaDevices
      .getDisplayMedia({
        video: {
          cursor: "always",
        },
        audio: false,
      })
      .then((stream) => videoStreamSuccess(stream, "display"))
      .catch((err) => {
        console.error(err);
      });
  };

  const getLocalCameraStream = () => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { min: 640, max: 1920 },
          height: { min: 400, max: 1080 },
        },
      })
      .then((stream) => videoStreamSuccess(stream, "camera"))
      .catch((err) => {
        console.error(err);
      });
  };

  const videoStreamSuccess = (stream, type) => {
    let videoParams = { track: stream.getVideoTracks()[0], type };
    const videoStream = {
      [type]: {
        track: stream.getVideoTracks()[0],
      },
    };
    // connectSendTransport("video");
  };

  const getRtpCapabilities = () => {
    const { roomId } = MediaStore.getState();
    console.log(`${roomId} 라우터를 만듭니다.`);
    try {
      media_socket.emit("create-router", roomId, (rtpCapabilities) => {
        createDevice(rtpCapabilities);
      });
    } catch (error) {
      console.error(error);
    }
  };

  const createDevice = async (rtpCapabilities) => {
    try {
      let device = new MediasoupClient.Device();
      setDevice(device);
      await device.load({
        routerRtpCapabilities: rtpCapabilities,
      });

      createSendTransport();
    } catch (error) {
      console.error(error);
      if (error.name === "UnsupportedError")
        console.warn("browser not supported");
    }
  };

  const createSendTransport = () => {
    const { roomId, device } = MediaStore.getState();
    media_socket.emit(
      "create-webRTC-transport",
      {
        isConsumer: false,
        roomId,
      },
      (transportParams) => {
        if (transportParams.error) {
          console.error(transportParams.error);
          return;
        }

        const sendTransport = device.createSendTransport(transportParams);

        sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          try {
            media_socket.emit("transport-connect", {
              dtlsParameters,
              isConsumer: false,
            });
            callback();
          } catch (error) {
            errback(error);
          }
        });

        sendTransport.on("produce", (parameters, callback, errback) => {
          try {
            media_socket.emit(
              "transport-produce",
              {
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
                isConsumer: false,
                roomId,
                mediaTag: parameters.appData.mediaTag,
              },
              ({ producerId, existProducerObj }) => {
                callback({ producerId });
                console.log("여기", existProducerObj);
              }
            );
          } catch (error) {
            errback(error);
          }
        });

        setSendTransport(sendTransport);
        connectSendTransport("audio");
      }
    );
  };

  const connectSendTransport = async (mediaType) => {
    const { audioParams, videoParams, sendTransport } = MediaStore.getState();

    let Params;
    switch (mediaType) {
      case "audio":
        Params = audioParams;
        break;
      case "video":
        Params = videoParams;
        break;
      default:
        break;
    }

    console.log("type 확인 ", Params.type);
    const producer = await sendTransport.produce({
      track: Params.track,
      appData: { mediaTag: Params.type },
    });
  };

  return {
    getLocalAudioStream,
  };
}

export default useMediasoup;
