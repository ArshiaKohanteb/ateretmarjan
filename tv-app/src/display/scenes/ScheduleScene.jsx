import React from "react";
import { Crown, Clock, Time, NextUp } from "./common.jsx";
import { addDays, isLive, DAY_NAMES } from "./util.js";

function ScheduleList({ title, subtitle, items, now, next, tz }) {
  return (
    <section className="panel list-panel">
      <header className="panel-head">
        <h2>{title}</h2>
        {subtitle && <span className="panel-sub">{subtitle}</span>}
      </header>
      {items.length === 0 ? (
        <p className="empty">No times posted</p>
      ) : (
        <ul className={`rows ${items.length > 7 ? "rows-dense" : ""}`}>
          {items.map((m) => {
            const state = next && m.id === next.id && m.epoch === next.epoch ? "is-next" : m.epoch < now ? "is-past" : "";
            return (
              <li key={m.id + m.epoch} className={state}>
                <span className="row-name">
                  {m.name}
                  {m.note && <em>{m.note}</em>}
                </span>
                <Time epoch={m.epoch} tz={tz} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ZmanimPanel({ z, hidden, now, tz, today }) {
  if (!z?.days) return null;
  const todays = z.days[today] || {};
  const afterNightfall = todays.tzet && now > todays.tzet;
  const dayKey = afterNightfall ? addDays(today, 1) : today;
  const vals = z.days[dayKey] || {};
  const list = (z.zmanimList || []).filter((x) => !hidden.includes(x.id) && vals[x.id]);
  return (
    <section className="panel zmanim-panel">
      <header className="panel-head">
        <h2>{afterNightfall ? "Tomorrow's Zmanim" : "Today's Zmanim"}</h2>
      </header>
      <div className="zgrid" style={{ "--cols": Math.min(5, Math.ceil(list.length / 2)) }}>
        {list.map((x) => (
          <div key={x.id} className={`ztile ${!afterNightfall && vals[x.id] < now ? "is-past" : ""}`}>
            <span className="zlabel">{x.label}</span>
            <Time epoch={vals[x.id]} tz={tz} />
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoChips({ z, s }) {
  if (!z) return null;
  const chips = [];
  if (s.showLimudim) z.limudim?.slice(0, 2).forEach((l) => chips.push({ k: l.study, v: l.ref, he: true }));
  if (s.showMakam && z.makam) chips.push({ k: "Makam", v: z.makam });
  if (s.showHiloulot && z.hiloulot?.length) chips.push({ k: "Hilula", v: z.hiloulot.slice(0, 2).join(" · ") });
  if (!chips.length) return null;
  return (
    <div className="info-chips">
      {chips.map((c) => (
        <span key={c.k} className="info-chip">
          <b>{c.k}</b>
          <span dir="auto">{c.v}</span>
        </span>
      ))}
    </div>
  );
}

export default function ScheduleScene({ tv, z, sched, now, tz }) {
  const s = tv.settings;
  const showShabbat = sched.shabbatItems.length > 0;
  const showToday = sched.todayItems.length > 0 || !showShabbat;
  const todayTitle = sched.special ? sched.special.title || "Special Schedule" : "Today's Minyanim";

  return (
    <div className="scene scene-schedule">
      <aside className="hero">
        <header className="brand">
          <Crown size={84} />
          <div>
            <div className="brand-name">{s.shulName}</div>
            <div className="brand-he" dir="rtl">{s.shulNameHe}</div>
          </div>
        </header>

        <div className="hero-mid">
          <div className="eyebrow">{z?.hebrewDate?.civil || DAY_NAMES[sched.weekday]}</div>
          <Clock showSeconds={s.showSeconds} tz={tz} className="clock-hero" />
          {z?.hebrewDate?.hebrew && <div className="hebdate" dir="rtl">{z.hebrewDate.hebrew}</div>}
          <div className="chips">
            {z?.parasha && <span className="chip chip-accent" dir="rtl">פרשת {z.parasha}</span>}
            {z?.specialDays?.map((d) => <span key={d} className="chip">{d}</span>)}
          </div>
        </div>

        <NextUp next={sched.next} now={now} tz={tz} />

        {z?.candleLighting && (
          <div className="shabbat-strip">
            <div><span>Candle Lighting</span><Time epoch={z.candleLighting} tz={tz} /></div>
            <div><span>Havdalah</span><Time epoch={z.havdalah} tz={tz} /></div>
            <div><span>Rabbeinu Tam</span><Time epoch={z.rabbeinuTam} tz={tz} /></div>
          </div>
        )}
      </aside>

      <main className="board">
        <div className={`lists ${showToday && showShabbat ? "lists-2" : ""}`}>
          {showToday && <ScheduleList title={todayTitle} items={sched.todayItems} now={now} next={sched.next} tz={tz} />}
          {showShabbat && (
            <ScheduleList title="Shabbat Schedule" subtitle={z?.parasha ? `פרשת ${z.parasha}` : ""} items={sched.shabbatItems} now={now} next={sched.next} tz={tz} />
          )}
        </div>
        {s.showZmanim && <ZmanimPanel z={z} hidden={s.hiddenZmanim || []} now={now} tz={tz} today={sched.today} />}
        <InfoChips z={z} s={s} />
      </main>

      <Footer tv={tv} today={sched.today} />
    </div>
  );
}

function Footer({ tv, today }) {
  const s = tv.settings;
  const items = (tv.announcements || []).filter((a) => a.ticker !== false && isLive(a, today)).map((a) => a.body || a.title);
  const d = s.donate || {};
  const donate = [d.venmo && `Venmo ${d.venmo}`, d.zelle && `Zelle ${d.zelle}`, d.website].filter(Boolean);
  if (!(s.showTicker && items.length) && !(s.showDonate && donate.length)) return null;
  return (
    <footer className="footer">
      {s.showTicker && items.length > 0 ? (
        <div className="ticker">
          <div className="ticker-track" style={{ animationDuration: `${Math.max(20, (s.tickerSpeed || 60) * Math.max(1, items.length / 2))}s` }}>
            {[0, 1].map((k) => (
              <span key={k} className="ticker-set" aria-hidden={k === 1}>
                {items.map((t, i) => (
                  <span key={i} className="ticker-item"><Crown size={22} className="ticker-crown" />{t}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      ) : <div className="ticker" />}
      {s.showDonate && donate.length > 0 && (
        <div className="donate">
          <b>Support Ateret Marjan</b>
          <span>{donate.join("  ·  ")}</span>
        </div>
      )}
    </footer>
  );
}
