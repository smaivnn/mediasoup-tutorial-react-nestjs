import React, { createContext, useState, useContext } from "react";

export const MediaStreamContext = createContext();

export const MediaStreamProvider = ({ children }) => {
  const [audioStream, setAudioStream] = useState({});
  const [videoStream, setVideoStream] = useState({});
  const [peerVideoStream, setPeerVideoStream] = useState({});

  return (
    <MediaStreamContext.Provider
      value={{
        audioStream,
        setAudioStream,
        videoStream,
        setVideoStream,
        peerVideoStream,
        setPeerVideoStream,
      }}
    >
      {children}
    </MediaStreamContext.Provider>
  );
};

export const useMediaStream = () => useContext(MediaStreamContext);
