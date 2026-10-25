import React from "react";
import { useNow } from "../hooks.js";
import { formatEpoch, minutesUntil } from "../../shared/schedule.js";

// The logo lockup: the crown mark with the name beside it. Used once per screen.
export function Brand({ tv, small = false }) {
  return (
    <div className={`brand ${small ? "brand-sm" : ""}`}>
      <div className="crown" aria-hidden="true" />
      <div className="brand-text">
        <span className="brand-name">{tv.settings.shulName}</span>
        <span className="brand-he" dir="rtl">{tv.settings.shulNameHe}</span>
      </div>
    </div>
  );
}

export function Clock({ showSeconds, tz, className = "" }) {
  const now = useNow(1000);
  const f = formatEpoch(now, tz, showSeconds);
  return (
    <div className={`clock ${className}`}>
      <span className="clock-time">{f.time}</span>
      <span className="clock-ampm">{f.ampm}</span>
    </div>
  );
}

export function Time({ epoch, tz }) {
  const f = formatEpoch(epoch, tz);
  return (
    <span className="t">
      {f.time}
      <small>{f.ampm}</small>
    </span>
  );
}

export function countdownText(epoch, now) {
  const m = minutesUntil(epoch, now);
  if (m <= 0) return "now";
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `in ${h} hr ${r} min` : `in ${h} hr`;
}
