import React from "react";
import "./VideoBtnContainer.css";
import useMediasoup from "../hooks/useMediasoup";

const VideoBtnContainer = () => {
  const { getLocalDisplayStream, getLocalCameraStream } = useMediasoup();

  return (
    <div className="video-btn-container">
      <button onClick={getLocalCameraStream}>Start Camera</button>
      <button onClick={getLocalDisplayStream}>Start Display</button>
    </div>
  );
};

export default VideoBtnContainer;
