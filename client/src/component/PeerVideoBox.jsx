import React, { useEffect } from "react";
import { useMediaStream } from "../context/MediaStreamContext";

const PeerVideoBox = () => {
  const { peerVideoStream } = useMediaStream();
  useEffect(() => {
    Object.entries(peerVideoStream).forEach(([id, { stream }]) => {
      if (stream) {
        console.log(`Stream ID: ${id}, active: ${stream.active}`);
        console.log(`Tracks:`, stream.getTracks());
      }
    });
  }, [peerVideoStream]);

  return (
    <div className="peer-video-box">
      {Object.entries(peerVideoStream).map(([id, { kind, stream }]) =>
        kind === "video" ? (
          <div className="video-container" key={id}>
            <p>{id}</p>
            <video
              ref={(ref) => ref && (ref.srcObject = stream)}
              autoPlay
              muted
              className="video"
            />
          </div>
        ) : null
      )}
    </div>
  );
};

export default PeerVideoBox;
