import { useRef } from "react";
import { io } from "socket.io-client";
import MediaStore from "../store/MediaStore";
import useMediasoup from "./useMediasoup";

function useVoiceSocket() {
  const url = "http://localhost:5000";
  let socket = useRef();

  const { setSocket, setRoomId, setRooms, removeRoomId } = MediaStore();
  const { getLocalAudioStream, setPeerVideoStream, consumeSingleUser } =
    useMediasoup();

  const connectSocket = async () => {
    try {
      socket.current = io(url);
      addEvent();
      setSocket(socket.current);
    } catch (error) {
      console.error("소켓 연결에 실패했습니다:", error);
    }
  };

  const addEvent = () => {
    socket.current.on("connect", () => {
      console.log("소켓 연결에 성공하였습니다.", socket.current.id);
    });

    socket.current.on("status-change", ({ rooms }) => {
      setRooms(rooms);
    });

    socket.current.on("new-producer", ({ produceSocket, mediaTag }) => {
      consumeSingleUser(produceSocket, mediaTag);
    });
  };

  const joinRoom = (roomId) => {
    setRoomId(roomId);
    socket.current.emit("join-room", { roomId });
    getLocalAudioStream();
  };

  const leaveRoom = () => {
    removeRoomId();
    socket.current.emit("leave-room");
  };

  return {
    connectSocket,
    joinRoom,
    leaveRoom,
  };
}

export default useVoiceSocket;
