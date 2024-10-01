import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const SERVER_URL = "http://localhost:5000";

function App() {
  const [socket, setSocket] = useState(null);
  const [device, setDevice] = useState(null);
  const [sendTransport, setSendTransport] = useState(null);
  const [recvTransport, setRecvTransport] = useState(null);
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [videoProducer, setVideoProducer] = useState(null);
  const [audioProducer, setAudioProducer] = useState(null);
  const [screenProducer, setScreenProducer] = useState(null);
  const localVideoRef = useRef(null);
  const deviceRef = useRef(null);
  const recvTransportRef = useRef(null);
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server:", newSocket.id);
    });

    newSocket.on("new-peer", ({ peerId }) => {
      setPeers((prevPeers) => [...prevPeers, peerId]);
    });

    newSocket.on("peer-left", ({ peerId }) => {
      setPeers((prevPeers) => prevPeers.filter((id) => id !== peerId));
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const createDevice = async (rtpCapabilities) => {
    const newDevice = new mediasoupClient.Device();
    await newDevice.load({ routerRtpCapabilities: rtpCapabilities });
    setDevice(newDevice);
    deviceRef.current = newDevice; // deviceRef에 값 할당
    return newDevice;
  };

  const createSendTransport = (device, transportOptions) => {
    console.log(device);
    const newSendTransport = device.createSendTransport(transportOptions);
    newSendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
      try {
        socket.emit("connect-transport", {
          transportId: newSendTransport.id,
          dtlsParameters,
          roomId,
          peerId: socket.id,
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    newSendTransport.on(
      "produce",
      ({ kind, rtpParameters }, callback, errback) => {
        try {
          socket.emit(
            "produce",
            {
              transportId: newSendTransport.id,
              kind,
              rtpParameters,
              roomId,
              peerId: socket.id,
            },
            (producerId) => {
              callback({ id: producerId });
            }
          );
        } catch (error) {
          errback(error);
        }
      }
    );
    setSendTransport(newSendTransport);
    return newSendTransport;
  };

  const createRecvTransport = (device, transportOptions) => {
    const newRecvTransport = device.createRecvTransport(transportOptions);
    newRecvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
      try {
        socket.emit("connect-transport", {
          transportId: newRecvTransport.id,
          dtlsParameters,
          roomId,
          peerId: socket.id,
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });
    setRecvTransport(newRecvTransport);
    recvTransportRef.current = newRecvTransport;
    return newRecvTransport;
  };

  const getLocalAudioStreamAndTrack = async () => {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const audioTrack = audioStream.getAudioTracks()[0];
    return audioTrack;
  };

  const joinRoom = () => {
    if (!socket || !roomId) return;

    if (window.confirm("방에 참여하시겠습니까?")) {
      socket.emit(
        "join-room",
        { roomId, peerId: socket.id },
        async (response) => {
          if (response.error) {
            console.error("Error joining room:", response.error);
            return;
          }

          const {
            sendTransportOptions,
            recvTransportOptions,
            rtpCapabilities,
            peerIds,
            existingProducers,
          } = response;

          // Device 생성 및 로드
          const newDevice = await createDevice(rtpCapabilities);

          // 송신용 Transport 생성
          const newSendTransport = createSendTransport(
            newDevice,
            sendTransportOptions
          );

          // 수신용 Transport 생성
          const newRecvTransport = createRecvTransport(
            newDevice,
            recvTransportOptions
          );

          socket.on("new-producer", handleNewProducer);

          // 오디오 스트림 캡처 및 Producer 생성
          const audioTrack = await getLocalAudioStreamAndTrack();
          const newAudioProducer = await newSendTransport.produce({
            track: audioTrack,
          });

          setAudioProducer(newAudioProducer);

          // 기존 참여자 목록 업데이트
          setPeers(peerIds.filter((id) => id !== socket.id));

          // 기존 Producer들에 대한 Consumer 생성
          for (const producerInfo of existingProducers) {
            await consume(producerInfo);
          }

          setJoined(true);
        }
      );
    }
  };

  const leaveRoom = () => {
    if (!socket) return;

    socket.emit("leave-room", (response) => {
      if (response && response.error) {
        console.error("Error leaving room:", response.error);
        return;
      }
      // 로컬 상태 초기화
      setJoined(false);
      setPeers([]);
      // 리소스 정리
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      if (sendTransport) {
        sendTransport.close();
        setSendTransport(null);
      }
      if (recvTransport) {
        recvTransport.close();
        setRecvTransport(null);
      }
      if (device) {
        setDevice(null);
      }
      // 이벤트 리스너 제거
      socket.off("new-producer", handleNewProducer);
    });
  };

  const startCamera = async () => {
    if (!sendTransport) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    setLocalStream(stream);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const videoTrack = stream.getVideoTracks()[0];

    // 비디오 Producer 생성
    const newVideoProducer = await sendTransport.produce({ track: videoTrack });
    setVideoProducer(newVideoProducer);
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (videoProducer) {
      videoProducer.close();
      setVideoProducer(null);
    }
    if (audioProducer) {
      audioProducer.close();
      setAudioProducer(null);
    }
  };

  const startScreenShare = async () => {
    if (!sendTransport) return;

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    const screenTrack = stream.getVideoTracks()[0];

    const newScreenProducer = await sendTransport.produce({
      track: screenTrack,
    });
    setScreenProducer(newScreenProducer);

    screenTrack.onended = () => {
      stopScreenShare();
    };
  };

  const stopScreenShare = () => {
    if (screenProducer) {
      screenProducer.close();
      setScreenProducer(null);
    }
  };

  const handleNewProducer = async ({ producerId, peerId, kind }) => {
    await consume({ producerId, peerId, kind });
  };

  const consume = async ({ producerId, peerId, kind }) => {
    const device = deviceRef.current;
    const recvTransport = recvTransportRef.current;
    if (!device || !recvTransport) {
      console.log("Device or RecvTransport not initialized");
    }

    socket.emit(
      "consume",
      {
        transportId: recvTransport.id,
        producerId,
        roomId,
        peerId: socket.id,
        rtpCapabilities: device.rtpCapabilities,
      },
      async (response) => {
        if (response.error) {
          console.error("Error consuming:", response.error);
          return;
        }

        const { consumerData } = response;

        const consumer = await recvTransport.consume({
          id: consumerData.id,
          producerId: consumerData.producerId,
          kind: consumerData.kind,
          rtpParameters: consumerData.rtpParameters,
        });

        // Consumer를 resume합니다.
        await consumer.resume();

        // 수신한 미디어를 재생
        const remoteStream = new MediaStream();
        remoteStream.addTrack(consumer.track);

        if (consumer.kind === "video") {
          const videoElement = document.createElement("video");
          videoElement.srcObject = remoteStream;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.width = 200;
          document.getElementById("remote-media").appendChild(videoElement);
        } else if (consumer.kind === "audio") {
          const audioElement = document.createElement("audio");
          audioElement.srcObject = remoteStream;
          audioElement.autoplay = true;
          audioElement.controls = true;
          document.getElementById("remote-media").appendChild(audioElement);

          // 브라우저의 자동재생 정책을 우회하기 위해 재생 시도
          try {
            await audioElement.play();
          } catch (err) {
            console.error("Audio playback failed:", err);
          }
        }
      }
    );
  };

  return (
    <div>
      <h1>Mediasoup Demo</h1>
      <h2>My Id: {socket ? socket.id : "Not connected"}</h2>
      <h2>Room: {roomId ? roomId : "-"}</h2>
      {!joined ? (
        <div>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <button onClick={leaveRoom}>Leave Room</button>
          <button onClick={localStream ? stopCamera : startCamera}>
            {localStream ? "Stop Camera" : "Start Camera"}
          </button>
          <button onClick={screenProducer ? stopScreenShare : startScreenShare}>
            {screenProducer ? "Stop Screen Share" : "Start Screen Share"}
          </button>
        </div>
      )}
      <div>
        <h2>Local Video</h2>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          width="400"
        ></video>
      </div>
      <div>
        <h2>Peers in Room</h2>
        <ul>
          {peers.map((peerId) => (
            <li key={peerId}>{peerId}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Remote Media</h2>
        <div id="remote-media"></div>
      </div>
    </div>
  );
}

export default App;
