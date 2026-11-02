import React from "react";
import { useNow } from "../hooks.js";
import { addDays, formatEpoch, minutesUntil } from "../../shared/schedule.js";

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
  const [h, m, sec] = f.time.split(":");
  return (
    <div className={`clock ${className}`}>
      <span className="clock-time">{h}<span className="clock-colon">:</span>{m}</span>
      <span className="clock-suffix">
        <span className="clock-ampm">{f.ampm}</span>
        {sec && <span className="clock-sec">{sec}</span>}
      </span>
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

// Candle lighting on the two days before Shabbat / Yom Tov, havdalah once it has begun.
export function candleTime(tv, z, sched) {
  const P = sched?.period;
  const today = sched?.today;
  if (tv.settings.showCandleBar === false || !P) return null;
  const started = sched.inPeriod || (today >= P.start && today <= P.end);
  if (started) return z?.havdalah ? { label: P.isYomTov ? P.endLabel : "Havdalah", epoch: z.havdalah } : null;
  const soon = today === addDays(P.start, -1) || today === addDays(P.start, -2);
  return soon && z?.candleLighting ? { label: "Candle Lighting", epoch: z.candleLighting } : null;
}

export function countdownText(epoch, now) {
  const m = minutesUntil(epoch, now);
  if (m <= 0) return "now";
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `in ${h} hr ${r} min` : `in ${h} hr`;
}

// A thin gold rule with a diamond in the middle.
export function Ornament({ className = "" }) {
  return (
    <div className={`ornament ${className}`} aria-hidden="true">
      <span /><i /><span />
    </div>
  );
}
