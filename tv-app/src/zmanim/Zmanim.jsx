import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MoonStar, Moon, Eye, Sunrise, BookOpen, Hourglass, Sun, SunMedium, Clock3, Flame, Sunset, Star,
  CalendarDays, MapPin, SlidersHorizontal, ChevronDown, Check, Navigation, Search, Share, Crown, X, ArrowLeft,
} from "lucide-react";
import { useZmanim, useNow } from "../display/hooks.js";
import { startZmanimEngine } from "../shared/bootstrap.js";
import { localInfo, addDays } from "../shared/schedule.js";
import {
  loadLib, rowsFor, royFor, royFromBridge, parashaFor, shabbatOf, searchPlaces, herePlace,
  MINHAGIM, ZMANIM, PARTS, DEFAULT_PREFS, HOME, hebrewDate, civilDate, weekFrom,
} from "./zmanim.js";

const ICONS = { alot: MoonStar, misheyakir: Eye, sunrise: Sunrise, shema: BookOpen, tefila: Hourglass, hatzot: Sun, minchaGedola: SunMedium, minchaKetana: Clock3, plag: Hourglass, candles: Flame, sunset: Sunset, tzet: Moon, rt: Star, midnight: Moon };
const PREFS_KEY = "am-zmanim-prefs";

// There are no member accounts on this site, so settings stay on the device.
function readPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    if (!p) return DEFAULT_PREFS;
    return {
      ...DEFAULT_PREFS, ...p,
      minhag: MINHAGIM.some((m) => m.id === p.minhag) ? p.minhag : "sephardi",
      hidden: Array.isArray(p.hidden) ? p.hidden : DEFAULT_PREFS.hidden,
      location: p.location?.lat != null ? p.location : HOME,
    };
  } catch { return DEFAULT_PREFS; }
}
const writePrefs = (p) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* private mode */ } };

function timeParts(at, tz, h24) {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hourCycle: h24 ? "h23" : "h12", timeZone: tz }).formatToParts(new Date(at));
  return { time: parts.filter((p) => p.type === "hour" || p.type === "minute" || p.value === ":").map((p) => p.value).join(""), ampm: parts.find((p) => p.type === "dayPeriod")?.value || "" };
}
function Clock({ at, tz, h24 }) {
  const { time, ampm } = timeParts(at, tz, h24);
  return <span className="z-clock">{time}{ampm && <small>{ampm}</small>}</span>;
}
const plainTime = (at, tz, h24) => { const { time, ampm } = timeParts(at, tz, h24); return ampm ? `${time} ${ampm}` : time; };
const until = (ms) => {
  const m = Math.max(1, Math.round(ms / 60_000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr ${m % 60} min`;
};

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="sheet-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <button className="sheet-x" aria-label="Close" onClick={onClose}><X size={22} /></button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// The sun's path across today: sunrise on the left, sunset on the right.
function NowCard({ next, rows, now, tz, h24, tomorrow }) {
  const rise = rows.find((r) => r.id === "sunrise")?.at;
  const set = rows.find((r) => r.id === "sunset")?.at;
  if (!next || !rise || !set) return null;
  const W = 320, H = 92, PAD = 14;
  const x = (f) => PAD + f * (W - 2 * PAD);
  const y = (f) => H - 12 - Math.sin(Math.PI * f) * (H - 30);
  const trace = (to) => Array.from({ length: 41 }, (_, i) => `${i ? "L" : "M"}${x((i / 40) * to).toFixed(1)} ${y((i / 40) * to).toFixed(1)}`).join("");
  const day = now >= rise && now <= set;
  const f = Math.min(1, Math.max(0, (now - rise) / (set - rise)));
  const marks = rows.filter((r) => r.at > rise && r.at < set && r.id !== "candles").map((r) => ({ id: r.id, f: (r.at - rise) / (set - rise) }));
  const Icon = ICONS[next.id] || Clock3;
  return (
    <section className={`now rise ${day ? "" : "is-night"}`} aria-label="Next zman">
      <span className="now-eyebrow"><Icon size={16} />{tomorrow ? "First tomorrow" : "Next"} · in {until(next.at - now)}</span>
      <div className="now-row"><b>{next.label}</b><Clock at={next.at} tz={tz} h24={h24} /></div>
      <svg className="now-arc" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <line x1="0" x2={W} y1={H - 12} y2={H - 12} className="now-horizon" />
        <path d={trace(1)} className="now-path" />
        {day && <path d={trace(f)} className="now-done" />}
        {marks.map((m) => <circle key={m.id} cx={x(m.f)} cy={y(m.f)} r={m.id === next.id ? 4 : 2.4} className={`now-mark ${m.id === next.id ? "is-next" : ""}`} />)}
        {day
          ? <g transform={`translate(${x(f)} ${y(f)})`}><circle r="15" className="now-glow" /><circle r="7.5" className="now-sun" /></g>
          : <g className="now-stars">{[[22, 30], [58, 8], [112, 4], [196, 6], [254, 10], [300, 32]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="1.3" />)}</g>}
      </svg>
      <div className="now-ends"><span>Sunrise {plainTime(rise, tz, h24)}</span><span>Sunset {plainTime(set, tz, h24)}</span></div>
    </section>
  );
}

function Row({ r, tz, h24, next, past, open, onToggle }) {
  const Icon = ICONS[r.id] || Clock3;
  return (
    <li className={`z-row ${next ? "is-next" : ""} ${past ? "is-past" : ""} ${open ? "is-open" : ""}`}>
      <button className="z-main" aria-expanded={open} onClick={onToggle}>
        <span className="z-icon"><Icon size={21} strokeWidth={1.7} /></span>
        <span className="z-text"><b>{r.label}</b><span>{r.sub}</span></span>
        <Clock at={r.at} tz={tz} h24={h24} />
        <ChevronDown className="z-chev" size={18} aria-hidden="true" />
      </button>
      <div className="z-more" aria-hidden={!open}>
        <div>
          <p className="z-he" dir="rtl" lang="he">{r.he}</p>
          <p>{r.note}</p>
          <p className="z-by">By {r.by}</p>
          {r.others.length > 0 && (
            <>
              <h4>Other opinions</h4>
              <dl>{r.others.map((o) => <div key={o.id + o.label}><dt>{o.label}</dt><dd><Clock at={o.at} tz={tz} h24={h24} /></dd></div>)}</dl>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function Switch({ label, hint, checked, onChange }) {
  return (
    <label className="z-switch">
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function Customize({ prefs, update, onClose }) {
  const shown = (id) => !prefs.hidden.includes(id);
  const toggle = (id, on) => update({ hidden: on ? prefs.hidden.filter((x) => x !== id) : [...prefs.hidden, id] });
  return (
    <Sheet title="Customize" onClose={onClose}>
      <h3 className="z-h3">Minhag</h3>
      <div className="z-seg" role="radiogroup" aria-label="Minhag">
        {MINHAGIM.map((m) => <button key={m.id} role="radio" aria-checked={prefs.minhag === m.id} className={prefs.minhag === m.id ? "on" : ""} onClick={() => update({ minhag: m.id })}>{m.label}</button>)}
      </div>
      <p className="z-hint">{MINHAGIM.find((m) => m.id === prefs.minhag)?.note}</p>
      <h3 className="z-h3">Display</h3>
      <div className="z-group">
        <Switch label="24-hour time" checked={prefs.h24} onChange={(h24) => update({ h24 })} />
        <Switch label="Show shaah zmanit" hint="Length of a halachic hour today" checked={prefs.shaah} onChange={(shaah) => update({ shaah })} />
      </div>
      {PARTS.map((p) => (
        <React.Fragment key={p.id}>
          <h3 className="z-h3">{p.label}</h3>
          <div className="z-group">
            {ZMANIM.filter((z) => z.part === p.id).map((z) => <Switch key={z.id} label={z.label} hint={z.sub} checked={shown(z.id)} onChange={(on) => toggle(z.id, on)} />)}
          </div>
        </React.Fragment>
      ))}
      <div className="z-sheet-foot">
        <p className="z-hint">Saved on this device.</p>
        <button className="primary" onClick={onClose}>Done</button>
      </div>
    </Sheet>
  );
}

function Place({ p, on, onPick, icon: Icon = MapPin }) {
  return (
    <button className={`z-place ${on ? "on" : ""}`} onClick={() => onPick(p)}>
      <span className="z-place-icon"><Icon size={20} /></span>
      <span className="z-place-text"><b>{p.name}</b>{p.sub && <small>{p.sub}</small>}</span>
      {on && <Check size={20} />}
    </button>
  );
}

function LocationSheet({ current, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(() => searchPlaces(q.trim()).then(setFound, () => setMsg("Search isn't working right now.")), 280);
    return () => clearTimeout(t);
  }, [q]);
  const locate = () => { setBusy(true); setMsg(""); herePlace().then(onPick, (e) => setMsg(e.message)).finally(() => setBusy(false)); };
  return (
    <Sheet title="Location" onClose={onClose}>
      <div className="z-places">
        <Place p={HOME} on={current.id === "home"} onPick={onPick} icon={Crown} />
        {current.id !== "home" && <Place p={current} on onPick={onPick} />}
        <button className="z-place" onClick={locate} disabled={busy}>
          <span className="z-place-icon"><Navigation size={20} /></span>
          <span className="z-place-text"><b>{busy ? "Finding you…" : "Use my location"}</b><small>Zmanim for where you are now</small></span>
        </button>
      </div>
      <label className="z-search"><Search size={20} /><input type="search" placeholder="Search a city" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {found.length > 0 && <div className="z-places">{found.map((p) => <Place key={p.id} p={p} on={false} onPick={onPick} />)}</div>}
      {q.trim().length >= 2 && !found.length && <p className="z-hint">No places found yet.</p>}
      {msg && <p className="sheet-msg" role="alert">{msg}</p>}
    </Sheet>
  );
}

export default function Zmanim() {
  const z = useZmanim();
  const now = useNow(30_000);
  const [K, setK] = useState(null);
  const [royFn, setRoyFn] = useState(null);
  const [prefs, setPrefs] = useState(readPrefs);
  const [sheet, setSheet] = useState(null);
  const [date, setDate] = useState(null);
  const [picking, setPicking] = useState(false);
  const [open, setOpen] = useState({});
  const [toast, setToast] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const loc = prefs.location;
  const tz = loc.tz;
  const today = localInfo(now, tz).dateKey;
  const day = date && date >= today ? date : today;
  const home = loc.id === "home";
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const say = (text) => { setToast(text); setTimeout(() => setToast(""), 3000); };
  const update = (patch) => { const p = { ...prefsRef.current, ...patch }; setPrefs(p); writePrefs(p); };

  useEffect(() => { startZmanimEngine(); loadLib().then(setK, () => say("Couldn't load the zmanim. Refresh to try again.")); }, []);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // Rabbi Ovadia's times away from the shul come from royzmanim.com's calculator for that place.
  useEffect(() => {
    setRoyFn(null);
    if (home) return;
    let live = true;
    royFor(loc).then((fn) => live && setRoyFn(() => fn), () => {});
    return () => { live = false; };
  }, [loc.lat, loc.long, home]);

  const royOf = (d) => { try { return home ? royFromBridge(z, d) : royFn ? royFn(d) : null; } catch { return null; } };
  const calc = (d) => (K ? rowsFor(K, d, loc, royOf(d), prefs) : null);
  const view = useMemo(() => calc(day), [K, day, z, royFn, prefs]);
  const todayView = useMemo(() => (day === today ? view : calc(today)), [K, today, day, view, z, royFn, prefs]);
  const tomorrowView = useMemo(() => calc(addDays(today, 1)), [K, today, z, royFn, prefs]);
  const shown = (v) => (v?.rows || []).filter((r) => !prefs.hidden.includes(r.id));
  const rows = shown(view);
  const todays = shown(todayView);
  const upcoming = todays.find((r) => r.at > now);
  const next = upcoming || shown(tomorrowView)[0];
  const nextId = day === today && upcoming ? upcoming.id : null;

  // Shabbat: the TV's own card at the shul (it knows Yom Tov too); worked out for anywhere else.
  const sh = shabbatOf(today);
  const shabbat = useMemo(() => {
    if (!K) return null;
    const parasha = parashaFor(K, sh.sat, tz === "Asia/Jerusalem");
    if (home && prefs.minhag === "sephardi" && z?.melakha && z.candleLighting && z.havdalah) {
      const m = z.melakha;
      return { title: m.title, parasha: m.isYomTov ? "" : parasha, from: addDays(m.start, -1), to: m.end, candles: z.candleLighting, ends: z.havdalah, endLabel: m.endLabel || "Shabbat ends", rt: z.rabbeinuTam };
    }
    const fri = calc(sh.fri), sat = calc(sh.sat);
    const candles = fri?.rows.find((r) => r.id === "candles")?.at;
    if (!candles || !sat?.havdalah) return null;
    return { title: "Shabbat", parasha, from: sh.fri, to: sh.sat, candles, ends: sat.havdalah, endLabel: "Shabbat ends", rt: sat.rows.find((r) => r.id === "rt")?.at };
  }, [K, sh.sat, z, royFn, prefs]);

  const heb = hebrewDate(day);
  const levana = z?.levana && z.levana.end > now && z.levana.start - now < 10 * 864e5 ? z.levana : null;
  const shortDate = (ms) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: tz }).format(new Date(ms));
  const minhag = MINHAGIM.find((x) => x.id === prefs.minhag);
  const share = async () => {
    const text = [`Zmanim · ${loc.name} · ${civilDate(day, { weekday: "short", month: "short", day: "numeric" })}`, ...rows.map((r) => `${r.label}: ${plainTime(r.at, tz, prefs.h24)}`)].join("\n");
    try {
      if (navigator.share) await navigator.share({ title: "Zmanim · Ateret Marjan", text, url: location.origin + "/zmanim/" });
      else { await navigator.clipboard.writeText(`${text}\n${location.origin}/zmanim/`); say("Copied"); }
    } catch { /* closed the share sheet */ }
  };

  return (
    <div className="page">
      <header className={`top ${scrolled ? "is-scrolled" : ""}`}>
        <div className="top-in">
          <a className="brand" href="/"><i aria-hidden="true" /><span>Ateret Marjan</span></a>
          <a className="top-link" href="/"><ArrowLeft size={16} />Home</a>
        </div>
      </header>

      <section className="hero rise">
        <p className="eyebrow">Zmanim</p>
        <h1 dir="rtl" lang="he">{heb.he}</h1>
        <p className="sub">{civilDate(day)} · {heb.en}</p>
        {(shabbat?.parasha || levana) && (
          <div className="chips">
            {shabbat?.parasha && <span className="chip"><BookOpen size={15} /><span dir="rtl" lang="he">פרשת {shabbat.parasha}</span></span>}
            {levana && <span className="chip"><MoonStar size={15} />Kiddush Levana · {shortDate(levana.start)} – {shortDate(levana.end)}</span>}
          </div>
        )}
      </section>

      <div className="controls rise">
        <button className="pill" aria-expanded={picking} onClick={() => setPicking(!picking)}>
          <CalendarDays size={18} /><span>{day === today ? "Today" : civilDate(day, { weekday: "short", month: "short", day: "numeric" })}</span>
        </button>
        <button className="pill grow" onClick={() => setSheet("location")}>
          {home ? <Crown size={18} /> : <MapPin size={18} />}<span>{loc.name}</span>
        </button>
        <button className="pill icon" aria-label="Customize" onClick={() => setSheet("customize")}><SlidersHorizontal size={19} /></button>
      </div>
      {picking && (
        <div className="days">
          {weekFrom(today).map((d, i) => (
            <button key={d} className={d === day ? "on" : ""} aria-pressed={d === day} onClick={() => { setDate(d); setPicking(false); }}>
              <small>{i === 0 ? "Today" : civilDate(d, { weekday: "short" })}</small><b>{Number(d.slice(8))}</b>
            </button>
          ))}
        </div>
      )}
      <p className="meta">{minhag.label}{home && prefs.minhag === "sephardi" ? " · Same times as the shul's TV" : ""}{loc.sub ? ` · ${loc.sub}` : ""}</p>

      {!K ? <p className="loading">Working out the zmanim…</p> : (
        <>
          {day === today && <NowCard next={next} rows={todays} now={now} tz={tz} h24={prefs.h24} tomorrow={!upcoming} />}

          {shabbat && day === today && (
            <section className="shabbat rise">
              <header>
                <Flame size={20} />
                <div><b>{shabbat.title}{shabbat.parasha && <> · <span dir="rtl" lang="he">{shabbat.parasha}</span></>}</b>
                  <span>{civilDate(shabbat.from, { weekday: "short", month: "short", day: "numeric" })} – {civilDate(shabbat.to, { weekday: "short", month: "short", day: "numeric" })}</span></div>
              </header>
              <div>
                <p><small>Candle lighting</small><Clock at={shabbat.candles} tz={tz} h24={prefs.h24} /></p>
                <p><small>{shabbat.endLabel}</small><Clock at={shabbat.ends} tz={tz} h24={prefs.h24} /></p>
              </div>
              {shabbat.rt && <span className="rt">Rabbeinu Tam <Clock at={shabbat.rt} tz={tz} h24={prefs.h24} /></span>}
            </section>
          )}

          {prefs.shaah && view?.hour > 0 && <p className="shaah">Shaah zmanit: <b>{Math.floor(view.hour / 60_000)} min {Math.round((view.hour % 60_000) / 1000)} sec</b></p>}

          {PARTS.map((p) => {
            const list = rows.filter((r) => r.part === p.id);
            if (!list.length) return null;
            return (
              <section key={p.id} className="part rise">
                <h2>{p.label} <span lang="he">{p.he}</span></h2>
                <ul className="z-list">
                  {list.map((r) => <Row key={r.id} r={r} tz={tz} h24={prefs.h24} next={r.id === nextId} past={day === today && r.at < now}
                    open={!!open[r.id]} onToggle={() => setOpen({ ...open, [r.id]: !open[r.id] })} />)}
                </ul>
              </section>
            );
          })}
        </>
      )}

      <footer className="foot">
        <button className="share" onClick={share}><Share size={17} />Share these zmanim</button>
        <a className="give" href="/#give">Support Ateret Marjan</a>
        <p>{loc.name} · {minhag.label}{prefs.minhag === "sephardi" ? " · royzmanim.com" : ""} · Tap any zman for other opinions</p>
        <p>Consult your rabbi for halachic guidance</p>
      </footer>

      {sheet === "customize" && <Customize prefs={prefs} update={update} onClose={() => setSheet(null)} />}
      {sheet === "location" && <LocationSheet current={loc} onClose={() => setSheet(null)} onPick={(p) => { update({ location: p }); setDate(null); setSheet(null); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
