import React, { useEffect, useState } from "react";
import { Brand, Clock, Time, countdownText, Ornament } from "./common.jsx";
import { minutesUntil } from "../../shared/schedule.js";
import { addDays, isLive } from "./util.js";

// Pick a type scale for the timetable from how many rows it must hold.
function density(groups) {
  const rows = groups.reduce((n, g) => n + g.items.length, 0) + groups.length * 1.2;
  if (rows <= 7) return "d-xl";
  if (rows <= 10) return "d-l";
  if (rows <= 14) return "d-m";
  return "d-s";
}

function Timetable({ groups, now, next, tz }) {
  if (!groups.length) {
    return (
      <section className="timetable d-xl">
        <h2 className="group-title">Today</h2>
        <p className="empty">No minyanim posted</p>
      </section>
    );
  }
  const d = density(groups);
  const twoCol = d === "d-s" && groups.length > 1;
  return (
    <section className={`timetable ${d} ${twoCol ? "two-col" : ""}`}>
      {groups.map((g, gi) => (
        <div key={g.key} className="group" style={{ "--gi": gi }}>
          <header className="group-head">
            <h2 className="group-title"><span>{g.title}</span></h2>
            {g.subtitle && g.subtitle !== g.title && <span className="group-sub" dir="auto">{g.subtitle}</span>}
          </header>
          <ul className="rows">
            {g.items.map((m, i) => {
              const state = next && m.id === next.id && m.epoch === next.epoch ? "is-next" : m.epoch < now ? "is-past" : "";
              return (
                <li key={m.id + m.epoch} className={`${state} cascade`} style={{ animationDelay: `${0.25 + gi * 0.25 + i * 0.08}s` }}>
                  <span className="row-name" dir="auto">
                    {m.name}
                    {m.note && <em>{m.note}</em>}
                  </span>
                  <Time epoch={m.epoch} tz={tz} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

// The day's zmanim drawn where they really fall on the sun's path, with a
// live sun moving along it. Labels sit in even columns beneath, each tied to
// its point on the arc by a fine gold line.
const SW = 1500, SH = 100, BASE = 76, AMP = 64;

function SunPath({ z, hidden, now, tz, today }) {
  if (!z?.days) return <div className="zband glass" />;
  const todays = z.days[today] || {};
  const afterNightfall = todays.tzet && now > todays.tzet;
  const vals = z.days[afterNightfall ? addDays(today, 1) : today] || {};
  const list = (z.zmanimList || []).filter((x) => !hidden.includes(x.id) && vals[x.id]).slice(0, 9);
  if (!list.length || !vals.sunrise || !vals.sunset) return <div className="zband glass" />;

  const t0 = Math.min(...list.map((x) => vals[x.id]), vals.sunrise) - 25 * 60_000;
  const t1 = Math.max(...list.map((x) => vals[x.id]), vals.sunset) + 25 * 60_000;
  const sr = vals.sunrise, ss = vals.sunset;
  const X = (t) => ((t - t0) / (t1 - t0)) * SW;
  const Y = (t) => {
    if (t >= sr && t <= ss) return BASE - AMP * Math.sin((Math.PI * (t - sr)) / (ss - sr));
    const d = t < sr ? sr - t : t - ss;
    return BASE + 16 * Math.min(1, d / (60 * 60_000));
  };
  const pts = [];
  for (let i = 0; i <= 160; i++) { const t = t0 + ((t1 - t0) * i) / 160; pts.push(`${X(t).toFixed(1)},${Y(t).toFixed(1)}`); }
  const path = "M" + pts.join(" L");
  const nowIn = !afterNightfall && now >= t0 && now <= t1;
  const nx = nowIn ? X(now) : afterNightfall ? 0 : SW;
  const nextId = afterNightfall ? null : list.find((x) => vals[x.id] > now)?.id;
  const col = (i) => ((i + 0.5) * SW) / list.length;
  const isDay = now >= sr && now <= ss;

  return (
    <section className="zband glass sunpath">
      <h2 className="zband-title">{afterNightfall ? "Tomorrow" : "Zmanim"}</h2>
      <div className="sp-body">
        <svg className="sp-svg" viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="sp-gold" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--acc-2)" />
              <stop offset="1" stopColor="var(--acc-1)" />
            </linearGradient>
            <radialGradient id="sp-sun">
              <stop offset="0" stopColor="#FFFBEA" />
              <stop offset=".35" stopColor="var(--acc-1)" />
              <stop offset="1" stopColor="var(--acc-1)" stopOpacity="0" />
            </radialGradient>
            <clipPath id="sp-past"><rect x="0" y="0" width={Math.max(0, nx)} height={SH} /></clipPath>
          </defs>
          <line className="sp-horizon" x1="0" x2={SW} y1={BASE} y2={BASE} />
          <path className="sp-arc" d={path} />
          <path className="sp-arc-past" d={path} clipPath="url(#sp-past)" />
          {list.map((x, i) => (
            <line key={"l" + x.id} className={`sp-leader ${x.id === nextId ? "is-next" : ""}`} x1={X(vals[x.id])} y1={Y(vals[x.id])} x2={col(i)} y2={SH} />
          ))}
          {list.map((x) => (
            <circle key={"p" + x.id} className={`sp-point ${vals[x.id] < now && !afterNightfall ? "is-past" : ""} ${x.id === nextId ? "is-next" : ""}`} cx={X(vals[x.id])} cy={Y(vals[x.id])} r={x.id === nextId ? 7 : 5} />
          ))}
          {nowIn && (
            <g className={isDay ? "sp-sun" : "sp-moon"} transform={`translate(${nx} ${Y(now)})`}>
              <circle r="34" fill="url(#sp-sun)" className="sp-glow" />
              <circle r="9" className="sp-core" />
            </g>
          )}
        </svg>
        <div className="sp-labels" style={{ "--n": list.length }}>
          {list.map((x) => (
            <div key={x.id} className={`zman ${!afterNightfall && vals[x.id] < now ? "is-past" : ""} ${x.id === nextId ? "is-next" : ""}`}>
              <span className="zman-label">{x.label}</span>
              <Time epoch={vals[x.id]} tz={tz} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// One message at a time along the bottom, so it can be read from the back of the room.
function Bulletin({ tv, z, today }) {
  const s = tv.settings;
  const d = s.donate || {};
  const items = [];
  if (s.showTicker) {
    (tv.announcements || [])
      .filter((a) => a.ticker !== false && isLive(a, today) && (a.style || "info") === "info")
      .forEach((a) => items.push(a.body || a.title));
  }
  const learning = [];
  if (s.showLimudim) z?.limudim?.slice(0, 1).forEach((l) => learning.push(`Daf Yomi  ${l.ref}`));
  if (s.showMakam && z?.makam) learning.push(`Makam ${z.makam}`);
  if (s.showHiloulot && z?.hiloulot?.length) learning.push(`Hilula of ${z.hiloulot[0]}`);
  if (learning.length) items.push(learning.join("   ·   "));
  if (s.showDonate) {
    const ways = [d.venmo && `Venmo ${d.venmo}`, d.zelle && `Zelle ${d.zelle}`].filter(Boolean).join("   ·   ");
    if (ways) items.push(`Support Ateret Marjan   ·   ${ways}`);
  }
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((n) => n + 1), Math.max(6, (s.tickerSpeed || 60) / 6) * 1000);
    return () => clearInterval(t);
  }, [items.length, s.tickerSpeed]);
  if (!items.length) return null;
  const text = items[i % items.length];
  return (
    <footer className="bulletin glass">
      <span className="bulletin-mark">✦</span>
      <span key={i} className="bulletin-text" dir="auto">{text}</span>
    </footer>
  );
}

export default function ScheduleScene({ tv, z, sched, now, tz }) {
  const s = tv.settings;
  const special = z?.specialDays?.length ? z.specialDays.join(" · ") : "";
  const hasBulletin = s.showTicker || s.showDonate || s.showLimudim || s.showMakam;

  return (
    <div className={`scene scene-schedule ${hasBulletin ? "has-bulletin" : ""}`}>
      <aside className="now glass">
        <div className="now-top">
          <Brand tv={tv} />
          <span className="bsd" dir="rtl">בס״ד</span>
        </div>

        <div className="now-main">
          <Clock showSeconds={s.showSeconds} tz={tz} className="clock-hero" />
          <div className="now-date">{z?.hebrewDate?.civil || ""}</div>
          {z?.hebrewDate?.hebrew && <div className="now-hebdate" dir="rtl">{z.hebrewDate.hebrew}</div>}
          <Ornament />
          {(z?.parasha || special) && (
            <div className="now-week">
              {z?.parasha && <span className="parasha" dir="rtl">פרשת {z.parasha}</span>}
              {special && <span className="special-day">{special}</span>}
            </div>
          )}
        </div>

        {sched.next ? (
          <div className="now-next">
            <div className="now-next-top">
              <span className="now-next-label">Next</span>
              <span className="now-next-when">{countdownText(sched.next.epoch, now)}</span>
            </div>
            <div className="now-next-row">
              <span className="now-next-name" dir="auto">{sched.next.name}</span>
              <Time epoch={sched.next.epoch} tz={tz} />
            </div>
            <div className="now-next-bar"><span style={{ transform: `scaleX(${Math.max(0.04, Math.min(1, 1 - minutesUntil(sched.next.epoch, now) / 120))})` }} /></div>
          </div>
        ) : (
          z?.candleLighting && (
            <div className="now-next">
              <div className="now-next-top"><span className="now-next-label">Candle lighting</span></div>
              <div className="now-next-row"><span className="now-next-name">This Friday</span><Time epoch={z.candleLighting} tz={tz} /></div>
            </div>
          )
        )}
      </aside>

      <main className="board glass">
        <Timetable groups={sched.groups} now={now} next={sched.next} tz={tz} />
      </main>

      {s.showZmanim && <SunPath z={z} hidden={s.hiddenZmanim || []} now={now} tz={tz} today={sched.today} />}
      <Bulletin tv={tv} z={z} today={sched.today} />
    </div>
  );
}
