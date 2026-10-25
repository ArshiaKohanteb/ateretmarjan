import React, { useState } from "react";
import { RotateCw, FlipVertical2, PauseCircle, Copy, ExternalLink } from "lucide-react";
import { Card, Button, Toggle, Segmented } from "../ui.jsx";
import { patchTv, isDemo } from "../../shared/store.js";
import { buildSchedule, fmt, minutesUntil } from "../../shared/schedule.js";
import { status } from "./Announcements.jsx";

const TV_URL = "https://ateretmarjan.org/tv/";

export default function Home({ tv, z, go }) {
  const [hold, setHold] = useState("");
  const [copied, setCopied] = useState(false);
  const s = tv.settings;
  const sched = buildSchedule(tv, z);
  const liveFlyers = tv.flyers.filter((f) => status(f).cls === "badge-live").length;
  const liveAnn = tv.announcements.filter((a) => status(a).cls === "badge-live").length;
  const src = `/tv/?preview${isDemo() ? "&demo" : ""}${hold ? `&hold=${hold}` : ""}`;

  return (
    <div className="stack">
      <Card
        title="Live preview"
        subtitle="Exactly what the TV is showing. Changes appear within seconds."
        action={<a className="btn btn-ghost" href={src} target="_blank" rel="noreferrer"><ExternalLink size={18} /><span>Open</span></a>}
      >
        <div className="preview">
          <iframe key={src} src={src} title="TV preview" />
        </div>
        <Segmented small value={hold} onChange={setHold} options={[
          { value: "", label: "Rotation" }, { value: "schedule", label: "Schedule" },
          { value: "flyer", label: "Flyers" }, { value: "announcement", label: "Announcements" }, { value: "community", label: "Collage" },
        ]} />
      </Card>

      <div className="stat-row">
        <button className="stat" onClick={() => go("schedule")}>
          <span className="stat-label">Next</span>
          <b>{sched.next ? sched.next.name : "—"}</b>
          <span>{sched.next ? `${fmt(sched.next.epoch)} · in ${minutesUntil(sched.next.epoch)} min` : "Nothing else today"}</span>
        </button>
        <button className="stat" onClick={() => go("flyers")}>
          <span className="stat-label">Flyers</span>
          <b>{liveFlyers}</b>
          <span>showing now</span>
        </button>
        <button className="stat" onClick={() => go("announcements")}>
          <span className="stat-label">Announcements</span>
          <b>{liveAnn}</b>
          <span>showing now</span>
        </button>
      </div>

      <Card title="TV controls">
        <Toggle label="Schedule only" hint="Pause flyers and announcements, e.g. for a busy Yom Tov" checked={s.contentPaused} onChange={(v) => patchTv("settings", { contentPaused: v })} />
        <Toggle label="Flip screen upside down" hint="For a TV mounted upside down. The preview above stays right side up." checked={s.flip} onChange={(v) => patchTv("settings", { flip: v })} />
        <div className="row-actions">
          <Button icon={RotateCw} onClick={() => confirm("Restart every TV showing this display?") && patchTv("settings", { reloadToken: Date.now() })}>Restart TV</Button>
          <Button icon={copied ? null : Copy} onClick={() => { navigator.clipboard?.writeText(TV_URL); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? "Copied!" : "Copy TV address"}
          </Button>
        </div>
        <p className="hint">Point AbleSign (or any browser) at <b>{TV_URL}</b></p>
      </Card>
    </div>
  );
}
