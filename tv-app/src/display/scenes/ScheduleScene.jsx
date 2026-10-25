import React, { useEffect, useState } from "react";
import { Brand, Clock, Time, countdownText } from "./common.jsx";
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
      {groups.map((g) => (
        <div key={g.key} className="group">
          <header className="group-head">
            <h2 className="group-title">{g.title}</h2>
            {g.subtitle && g.subtitle !== g.title && <span className="group-sub" dir="auto">{g.subtitle}</span>}
          </header>
          <ul className="rows">
            {g.items.map((m) => {
              const state = next && m.id === next.id && m.epoch === next.epoch ? "is-next" : m.epoch < now ? "is-past" : "";
              return (
                <li key={m.id + m.epoch} className={state}>
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

function ZmanimBand({ z, hidden, now, tz, today }) {
  if (!z?.days) return <div className="zband" />;
  const todays = z.days[today] || {};
  const afterNightfall = todays.tzet && now > todays.tzet;
  const vals = z.days[afterNightfall ? addDays(today, 1) : today] || {};
  const list = (z.zmanimList || []).filter((x) => !hidden.includes(x.id) && vals[x.id]).slice(0, 8);
  return (
    <section className="zband">
      <h2 className="zband-title">{afterNightfall ? "Tomorrow" : "Zmanim"}</h2>
      <div className="zband-row" style={{ "--n": list.length }}>
        {list.map((x) => (
          <div key={x.id} className={`zman ${!afterNightfall && vals[x.id] < now ? "is-past" : ""}`}>
            <span className="zman-label">{x.label}</span>
            <Time epoch={vals[x.id]} tz={tz} />
          </div>
        ))}
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
    <footer className="bulletin">
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
      <aside className="now">
        <Brand tv={tv} />

        <div className="now-main">
          <Clock showSeconds={s.showSeconds} tz={tz} className="clock-hero" />
          <div className="now-date">{z?.hebrewDate?.civil || ""}</div>
          {z?.hebrewDate?.hebrew && <div className="now-hebdate" dir="rtl">{z.hebrewDate.hebrew}</div>}
          {(z?.parasha || special) && (
            <div className="now-week">
              {z?.parasha && <span dir="rtl">פרשת {z.parasha}</span>}
              {special && <span>{special}</span>}
            </div>
          )}
        </div>

        {sched.next ? (
          <div className="now-next">
            <div className="now-next-line">
              <span className="now-next-name" dir="auto">{sched.next.name}</span>
              <span className="now-next-when">{countdownText(sched.next.epoch, now)}</span>
            </div>
            <Time epoch={sched.next.epoch} tz={tz} />
          </div>
        ) : (
          z?.candleLighting && (
            <div className="now-next">
              <div className="now-next-line"><span className="now-next-name">Candle lighting</span></div>
              <Time epoch={z.candleLighting} tz={tz} />
            </div>
          )
        )}
      </aside>

      <main className="board">
        <Timetable groups={sched.groups} now={now} next={sched.next} tz={tz} />
      </main>

      {s.showZmanim && <ZmanimBand z={z} hidden={s.hiddenZmanim || []} now={now} tz={tz} today={sched.today} />}
      <Bulletin tv={tv} z={z} today={sched.today} />
    </div>
  );
}
