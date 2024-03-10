import React from "react";
import "./RoomDisplay.css";
import MediaStore from "../store/MediaStore";

const RoomDisplay = () => {
  const { rooms } = MediaStore();
  

  return (
    <div>
      {Object.keys(rooms).map((room) => (
        <div className="room-container" key={room}>
          <span className="room-id">{room}</span>
          <div className="room-user-container">
            [
            {rooms[room].map((user) => (
              <span className="room-user" key={user}>
                {user + ", "}
              </span>
            ))}
            ]
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoomDisplay;
