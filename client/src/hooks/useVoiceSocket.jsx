import { useRef } from "react";
import { io } from "socket.io-client";
import MediaStore from "../store/MediaStore";

function useVoiceSocket() {
  const url = "http://localhost:5000";
  let socket = useRef();

  const { setRoomId, setRooms } = MediaStore();

  const connectSocket = async () => {
    try {
      socket.current = io(url);
      addEvent();
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
  };

  const joinRoom = (roomId) => {
    setRoomId(roomId);
    socket.current.emit("join-room", { roomId });
  };

  const leaveRoom = () => {
    socket.current.emit("leave-room");
  };

  return {
    connectSocket,
    joinRoom,
    leaveRoom,
  };
}

export default useVoiceSocket;
