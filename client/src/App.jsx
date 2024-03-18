import "./App.css";
import React, { useEffect } from "react";
import aixos from "axios";
import RoomInput from "./component/RoomInput";
import RoomDisplay from "./component/RoomDisplay";
import useVoiceSocket from "./hooks/useVoiceSocket";
import MediaStore from "./store/MediaStore";
import VideoBtnContainer from "./component/VideoBtnContainer";
import Audio from "./component/Audio";
import MyVideoBox from "./component/MyVideoBox";
import PeerVideoBox from "./component/PeerVideoBox";

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
        <VideoBtnContainer />
        <Audio />
        <MyVideoBox />
        <PeerVideoBox />
      </section>
    </body>
  );
}

export default App;
