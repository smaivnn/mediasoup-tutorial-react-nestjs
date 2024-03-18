import * as MediasoupClient from "mediasoup-client";
import MediaStore from "../store/MediaStore";
import { useMediaStream } from "../context/MediaStreamContext";

function useMediasoup() {
  const {
    media_socket,
    setAudioParams,
    setVideoParams,
    setDevice,
    setSendTransport,
    setRecvTransport,
    getRecvTransport,
  } = MediaStore();

  const { setAudioStream, setVideoStream, setPeerVideoStream } =
    useMediaStream();

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

    setVideoParams(videoParams);
    setVideoStream((prevStream) => ({
      ...prevStream,
      ...videoStream,
    }));
    connectSendTransport("video");
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
      console.log("디바이스를 만듭니다.");
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
              ({ producerId, existUserObj }) => {
                callback({ producerId });

                if (parameters.kind === "audio" && existUserObj.length > 0) {
                  existUserObj.forEach((socketId) => {
                    consumeAllUser(socketId);
                  });
                }
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
    console.log(Params);
    const producer = await sendTransport.produce({
      track: Params.track,
      appData: { mediaTag: Params.type },
    });

    // producer 저장하기
  };

  const consumeAllUser = async (socketId) => {
    const recvTransport = await createRecvTransport(socketId);
    const consumeEvent = "consume-all";
    connectRecvTransport(consumeEvent, recvTransport, socketId);
  };

  const consumeSingleUser = async (socketId, mediaTag) => {
    const recvTransport = getRecvTransport(socketId)(MediaStore.getState())
      ? getRecvTransport(socketId)(MediaStore.getState())
      : await createRecvTransport(socketId);

    const consumeEvent = "consume-single";
    connectRecvTransport(consumeEvent, recvTransport, socketId, mediaTag);
  };

  const createRecvTransport = (socketId) => {
    return new Promise((resolve, reject) => {
      const { roomId, device, media_socket } = MediaStore.getState();

      try {
        media_socket.emit(
          "create-webRTC-transport",
          { isConsumer: true, roomId, produceSocketId: socketId },
          (transportParams) => {
            if (transportParams.error) {
              console.error(transportParams.error);
              reject(transportParams.error);
              return;
            }
            const recvTransport = device.createRecvTransport(transportParams);

            recvTransport.on(
              "connect",
              async ({ dtlsParameters }, callback, errback) => {
                try {
                  await media_socket.emit("recv-connect", {
                    dtlsParameters,
                    isConsumer: true,
                    produceSocketId: socketId,
                  });

                  callback();
                } catch (error) {
                  errback(error);
                }
              }
            );
            console.log("recvTransport", recvTransport.id, "생성됨");
            setRecvTransport(socketId, recvTransport);
            resolve(recvTransport);
          }
        );
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  };

  const connectRecvTransport = (
    consumeEvent,
    recvTransport,
    produceSocketId,
    mediaTag = null
  ) => {
    const { device, media_socket } = MediaStore.getState();

    try {
      media_socket.emit(
        consumeEvent,
        {
          rtpCapabilities: device.rtpCapabilities,
          produceSocketId,
          mediaTag,
        },
        async ({ paramsArray }) => {
          for (let { params } of paramsArray) {
            if (params.error) {
              console.log(params.error);
              return;
            }
            const consumer = await recvTransport.consume({
              id: params.id,
              producerId: params.producerId,
              kind: params.kind,
              rtpParameters: params.rtpParameters,
            });
            const { track } = consumer;
            const mediaStream = new MediaStream([track]);

            if (params.kind === "audio") {
              setAudioStream((prevStreams) => ({
                ...prevStreams,
                [params.produceSocketId]: {
                  kind: params.kind,
                  stream: mediaStream,
                  remoteProducerId: params.producerId,
                },
              }));
            }
            if (params.kind === "video") {
              console.log(consumer.id);
              setPeerVideoStream((prevStreams) => ({
                ...prevStreams,
                [params.producerId]: {
                  kind: params.kind,
                  stream: mediaStream,
                  consumerId: params.id,
                  produceSocketId,
                },
              }));
            }
          }
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  return {
    getLocalAudioStream,
    getLocalDisplayStream,
    getLocalCameraStream,
    consumeSingleUser,
  };
}

export default useMediasoup;
