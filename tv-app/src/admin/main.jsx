import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./admin.css";

// Zmanim engine, so relative times ("15 min before sunset") can be previewed.
const s = document.createElement("script");
s.type = "module";
s.src = "/assets/js/tv/zmanim-bridge.js";
document.head.appendChild(s);

createRoot(document.getElementById("root")).render(<App />);
