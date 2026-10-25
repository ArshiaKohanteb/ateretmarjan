import React, { useState } from "react";
import { ExternalLink, RotateCw, PauseCircle } from "lucide-react";
import { Segmented, Toggle } from "../ui.jsx";
import { patchTv, isDemo } from "../../shared/store.js";

// The TV exactly as it is right now, beside whatever you're editing.
export default function LivePreview({ tv, inline = false }) {
  const [hold, setHold] = useState("");
  const src = `/tv/?preview${isDemo() ? "&demo" : ""}${hold ? `&hold=${hold}` : ""}`;
  const s = tv.settings;
  return (
    <>
      <div className="rail-card">
        <div className="rail-title">
          <span>Live on the TV</span>
          <a className="icon-btn" href={src} target="_blank" rel="noreferrer" aria-label="Open full screen" title="Open full screen"><ExternalLink size={17} /></a>
        </div>
        <div className="preview"><iframe key={src} src={src} title="TV preview" /></div>
        <Segmented small value={hold} onChange={setHold} options={[
          { value: "", label: "Rotation" }, { value: "schedule", label: "Times" },
          { value: "flyer", label: "Flyers" }, { value: "announcement", label: "Slides" }, { value: "community", label: "Collage" },
        ]} />
      </div>
      {!inline && (
        <div className="rail-card">
          <div className="rail-title"><span>Quick controls</span></div>
          <div className="toggle-list">
            <Toggle label="Times only" hint="Pause flyers, slides and the collage" checked={s.contentPaused} onChange={(v) => patchTv("settings", { contentPaused: v })} />
            <Toggle label="Lighter effects" hint="For a TV that looks choppy" checked={s.effects === "lite"} onChange={(v) => patchTv("settings", { effects: v ? "lite" : "full" })} />
          </div>
          <button className="btn btn-secondary" onClick={() => confirm("Restart every screen showing the display?") && patchTv("settings", { reloadToken: Date.now() })}>
            <RotateCw size={17} /><span>Restart screens</span>
          </button>
        </div>
      )}
    </>
  );
}
