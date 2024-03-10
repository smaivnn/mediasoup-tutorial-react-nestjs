import "./App.css";
import React, { useEffect } from "react";
import aixos from "axios";
import RoomInput from "./component/RoomInput";
import RoomDisplay from "./component/RoomDisplay";
import useVoiceSocket from "./hooks/useVoiceSocket";
import MediaStore from "./store/MediaStore";

function App() {
  const { setRooms } = MediaStore();
  const { connectSocket, joinRoom, leaveRoom } = useVoiceSocket();

  useEffect(() => {
    connectSocket();
    const getRoomStatus = async () => {
      const response = await aixos.get("http://localhost:5000/room-status");
      setRooms(response.data);
    };
    getRoomStatus();
    return () => {};
  }, []);

  return (
    <body className="App">
      <header className="App-header">
        <h1>Video Group Chat</h1>
      </header>
      <section className="App-header">
        <RoomInput joinRoom={joinRoom} leaveRoom={leaveRoom} />
        <RoomDisplay />
      </section>
      <section className="App-main">
        {/* 비디오를 나타낸다.*/}
        {/* show video */}
      </section>
    </body>
  );
}

export default App;
