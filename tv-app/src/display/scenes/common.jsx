import React from "react";
import { useNow } from "../hooks.js";
import { formatEpoch, minutesUntil } from "../../shared/schedule.js";

export function Crown({ size = 64, className = "", style }) {
  return <div className={`crown ${className}`} style={{ width: size, height: size * 0.956, ...style }} aria-hidden="true" />;
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
  if (m <= 0) return "Now";
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `in ${h}h ${r}m` : `in ${h} hr`;
}

export function NextUp({ next, now, tz, compact = false }) {
  if (!next) return null;
  const soon = minutesUntil(next.epoch, now) <= 15;
  return (
    <div className={`next ${soon ? "next-soon" : ""} ${compact ? "next-compact" : ""}`}>
      <div className="next-label">
        <span className="pulse" />
        Next · {countdownText(next.epoch, now)}
      </div>
      <div className="next-row">
        <span className="next-name">{next.name}</span>
        <Time epoch={next.epoch} tz={tz} />
      </div>
    </div>
  );
}
