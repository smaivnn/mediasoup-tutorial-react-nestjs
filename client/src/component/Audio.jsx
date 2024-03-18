import React from "react";
import { useMediaStream } from "../context/MediaStreamContext";

const Audio = () => {
  const { audioStream } = useMediaStream();
  return (
    <div>
      {Object.entries(audioStream).map(([id, { kind, stream }]) =>
        kind === "audio" ? (
          <audio
            key={id}
            ref={(ref) => ref && (ref.srcObject = stream)}
            autoPlay
          />
        ) : (
          <></>
        )
      )}
    </div>
  );
};

export default Audio;
