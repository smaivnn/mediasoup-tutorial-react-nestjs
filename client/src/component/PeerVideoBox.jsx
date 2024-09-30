import React, { useEffect } from "react";
import { useMediaStream } from "../context/MediaStreamContext";

const PeerVideoBox = () => {
  const { peerVideoStream } = useMediaStream();

  return (
    <div className="peer-video-box">
      {Object.entries(peerVideoStream).map(
        ([id, { kind, stream, produceSocketId }]) =>
          kind === "video" ? (
            <div className="video-container" key={id}>
              <p>{produceSocketId}</p>
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
