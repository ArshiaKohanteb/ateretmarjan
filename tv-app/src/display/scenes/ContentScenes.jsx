import React from "react";
import { Crown, Clock, NextUp, Time } from "./common.jsx";
import { ANNOUNCEMENT_STYLES } from "../../shared/defaults.js";

function Rail({ sched, now, tz }) {
  return (
    <aside className="rail">
      <Crown size={64} />
      <Clock tz={tz} className="clock-rail" />
      {sched.next && (
        <div className="rail-next">
          <span className="rail-label">Next</span>
          <span className="rail-name">{sched.next.name}</span>
          <Time epoch={sched.next.epoch} tz={tz} />
        </div>
      )}
    </aside>
  );
}

function Backdrop({ url }) {
  return (
    <div className="backdrop">
      <img src={url} alt="" />
    </div>
  );
}

export function FlyerScene({ slide, tv, z, sched, now, tz }) {
  const [a, b] = slide.items;

  if (slide.layout === "wide") {
    return (
      <div className="scene scene-flyer flyer-wide">
        <Backdrop url={a.url} />
        <img className="flyer-img" src={a.url} alt={a.name || ""} />
      </div>
    );
  }

  if (slide.layout === "pair") {
    return (
      <div className="scene scene-flyer flyer-pair">
        <Backdrop url={a.url} />
        <div className="pair-wrap">
          <div className="pair">
            <img className="flyer-img" src={a.url} alt={a.name || ""} />
            <img className="flyer-img" src={b.url} alt={b.name || ""} />
          </div>
          <Rail sched={sched} now={now} tz={tz} />
        </div>
      </div>
    );
  }

  // Single portrait flyer: flyer on the left, live info on the right.
  const upcoming = [...sched.todayItems, ...sched.shabbatItems].filter((m) => m.epoch > now).slice(0, 4);
  return (
    <div className="scene scene-flyer flyer-tall">
      <Backdrop url={a.url} />
      <div className="tall-wrap">
        <img className="flyer-img" src={a.url} alt={a.name || ""} />
        <aside className="side">
          <div className="side-brand">
            <Crown size={56} />
            <span>{tv.settings.shulName}</span>
          </div>
          <Clock tz={tz} showSeconds={false} className="clock-side" />
          {z?.hebrewDate?.hebrew && <div className="hebdate hebdate-side" dir="rtl">{z.hebrewDate.hebrew}</div>}
          <NextUp next={sched.next} now={now} tz={tz} compact />
          {upcoming.length > 1 && (
            <ul className="side-list">
              {upcoming.slice(1).map((m) => (
                <li key={m.id + m.epoch}><span>{m.name}</span><Time epoch={m.epoch} tz={tz} /></li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

const STYLE_ICON = { info: "✦", celebration: "✿", urgent: "!", memorial: "✡", sponsor: "♛" };

export function AnnouncementScene({ slide, tv, sched, now, tz }) {
  const a = slide.item;
  const style = ANNOUNCEMENT_STYLES[a.style] ? a.style : "info";
  const title = a.title || "";
  const body = a.body || "";
  const titleSize = title.length > 60 ? "t-s" : title.length > 28 ? "t-m" : "t-l";
  const bodySize = body.length > 220 ? "b-s" : body.length > 110 ? "b-m" : "b-l";
  return (
    <div className={`scene scene-announce ann-${style}`}>
      <Crown size={900} className="ann-watermark" />
      <div className="ann-inner">
        <div className="ann-eyebrow">
          <span className="ann-icon">{STYLE_ICON[style]}</span>
          {a.label || ANNOUNCEMENT_STYLES[style].label}
        </div>
        {title && <h1 className={`ann-title ${titleSize}`} dir="auto">{title}</h1>}
        {body && <p className={`ann-body ${bodySize}`} dir="auto">{body}</p>}
      </div>
      <footer className="ann-foot">
        <div className="ann-brand"><Crown size={44} /><span>{tv.settings.shulName}</span></div>
        <div className="ann-foot-right">
          {sched.next && (
            <span className="ann-next">Next: <b>{sched.next.name}</b> <Time epoch={sched.next.epoch} tz={tz} /></span>
          )}
          <Clock tz={tz} className="clock-foot" />
        </div>
      </footer>
    </div>
  );
}
