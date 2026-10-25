import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { startZmanimEngine } from "../shared/bootstrap.js";
import "./display.css";

// ?at=2026-10-03T10:00 previews the screen at another moment (tests & dashboard).
const at = new URLSearchParams(location.search).get("at");
if (at && !isNaN(Date.parse(at))) {
  const realNow = Date.now.bind(Date);
  const offset = Date.parse(at) - realNow();
  Date.now = () => realNow() + offset;
}


startZmanimEngine();

createRoot(document.getElementById("root")).render(<App />);
