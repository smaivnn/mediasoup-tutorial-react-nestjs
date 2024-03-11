import React, { useRef } from "react";
import "./RoomInput.css";
import MediaStore from "../store/MediaStore";

const RoomInput = ({ joinRoom, leaveRoom }) => {
  const inputRef = useRef();
  const { roomId } = MediaStore();

  const confirmBtn = (status) => {
    const confirm = window.confirm(
      `${status} Room : ${inputRef.current.value} ?`
    );
    return confirm;
  };

  const joinRoomHandler = () => {
    const confirm = confirmBtn("Join");
    if (!confirm) {
      return;
    }
    joinRoom(inputRef.current.value);
  };

  const leaveRoomHandler = () => {
    const confirm = confirmBtn("Leave");
    if (!confirm) {
      return;
    }
    leaveRoom();
  };

  return (
    <div>
      <p className="current-room">{`Current Room : ${roomId}`}</p>
      <input ref={inputRef} type="text" placeholder="Room" />
      <button onClick={joinRoomHandler}>Join Room</button>
      <button onClick={leaveRoomHandler}>leave Room</button>
    </div>
  );
};

export default RoomInput;
