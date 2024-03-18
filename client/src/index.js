import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { MediaStreamProvider } from "./context/MediaStreamContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <MediaStreamProvider>
    <App />
  </MediaStreamProvider>
);
