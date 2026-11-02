import React, { useEffect, useRef } from "react";
import { Brand, Clock, Time, candleTime, countdownText, Ornament } from "./common.jsx";
import { addDays } from "./util.js";
import { OCCASIONS, DEDICATIONS, ANNOUNCEMENT_STYLES } from "../../shared/defaults.js";

// Minyanim and zmanim still to come, soonest first.
function comingUp(tv, z, sched, now) {
  const hidden = tv.settings.hiddenZmanim || [];
  const zmanim = [sched.today, addDays(sched.today, 1)].flatMap((d) =>
    (tv.settings.showZmanim ? z?.zmanimList || [] : [])
      .filter((x) => !hidden.includes(x.id))
      .map((x) => ({ id: `${d}-${x.id}`, name: x.label, epoch: z.days?.[d]?.[x.id] })));
  return [...sched.upcoming, ...zmanim].filter((m) => m.epoch > now).sort((a, b) => a.epoch - b.epoch);
}

// The live panel beside a single portrait flyer.
function SidePanel({ tv, z, sched, now, tz }) {
  const [next, ...rest] = comingUp(tv, z, sched, now);
  const candles = candleTime(tv, z, sched);
  const daf = tv.settings.showLimudim === false ? null : z?.limudim?.find((l) => l.id === "daf")?.ref;
  return (
    <aside className="side glass">
      <Brand tv={tv} small />
      <div className="side-main">
        <Clock showSeconds={tv.settings.showClockSeconds} tz={tz} className="clock-side" />
        <div className="side-dates">
          {z?.hebrewDate?.civil && <span>{z.hebrewDate.civil}</span>}
          {z?.hebrewDate?.hebrew && <span dir="rtl">{z.hebrewDate.hebrew}</span>}
          {z?.parasha && <span dir="rtl">{`פרשת ${z.parasha}`}</span>}
        </div>
      </div>
      {next && (
        <div className="side-next">
          <span className="side-next-top"><span>Next</span><span>{countdownText(next.epoch, now)}</span></span>
          <span className="side-next-row">
            <span className="side-next-name" dir="auto">{next.name}</span>
            <Time epoch={next.epoch} tz={tz} />
          </span>
        </div>
      )}
      {rest.length > 0 && (
        <ul className="side-list">
          {rest.slice(0, 5).map((m) => (
            <li key={m.id + m.epoch}><span dir="auto">{m.name}</span><Time epoch={m.epoch} tz={tz} /></li>
          ))}
        </ul>
      )}
      {(candles || daf) && (
        <dl className="side-facts">
          {candles && <div><dt>{candles.label}</dt><dd><Time epoch={candles.epoch} tz={tz} /></dd></div>}
          {daf && <div><dt>Daf Yomi</dt><dd dir="auto">{daf}</dd></div>}
        </dl>
      )}
    </aside>
  );
}

export function FlyerScene({ slide, tv, z, sched, now, tz }) {
  const [a, b] = slide.items;

  if (slide.layout === "wide") {
    return (
      <div className="scene scene-flyer flyer-wide">
        <img className="flyer-img" decoding="async" src={a.url} alt={a.name || ""} />
      </div>
    );
  }

  if (slide.layout === "pair") {
    return (
      <div className="scene scene-flyer flyer-pair">
        <div className="pair">
          <img className="flyer-img" decoding="async" src={a.url} alt={a.name || ""} />
          <img className="flyer-img" decoding="async" src={b.url} alt={b.name || ""} />
        </div>
      </div>
    );
  }

  return (
    <div className="scene scene-flyer flyer-tall">
      <div className="tall-stage">
        <img className="flyer-img" decoding="async" src={a.url} alt={a.name || ""} />
      </div>
      <SidePanel tv={tv} z={z} sched={sched} now={now} tz={tz} />
    </div>
  );
}

function SlideFoot({ tv, sched, tz }) {
  return (
    <footer className="slide-foot">
      <Brand tv={tv} small />
      <div className="slide-foot-right">
        {sched.next && (
          <span className="slide-next"><span dir="auto">{sched.next.name}</span> <Time epoch={sched.next.epoch} tz={tz} /></span>
        )}
        <Clock showSeconds={tv.settings.showClockSeconds} tz={tz} className="clock-foot" />
      </div>
    </footer>
  );
}

const sizeClass = (text, steps) => steps.find(([max]) => text.length <= max)?.[1] || steps[steps.length - 1][1];

export function AnnouncementScene(props) {
  const a = props.slide.item;
  if (a.style === "celebration") return <MazalTovScene {...props} />;
  if (a.style === "sponsor") return <SponsorScene {...props} />;
  const { tv, sched, tz } = props;
  const title = a.title || "";
  const body = a.body || "";
  const flyer = props.slide.flyer;
  if (flyer) {
    return (
      <div className={`scene scene-flyer ann-linked ann-${a.style || "info"}`}>
        <div className="linked-stage"><img className="flyer-img" decoding="async" src={flyer.url} alt={flyer.name || ""} /></div>
        <aside className="side glass linked-card">
          <Brand tv={tv} small />
          <div className="linked-main">
            <div className="ann-label"><Ornament /><span>{ANNOUNCEMENT_STYLES[a.style || "info"]?.label || "Announcement"}</span><Ornament /></div>
            {title && <h1 className={`ann-title ${sizeClass(title, [[22, "lt-l"], [44, "lt-m"], [999, "lt-s"]])}`} dir="auto">{title}</h1>}
            {body && <p className={`ann-body ${sizeClass(body, [[110, "lb-l"], [220, "lb-m"], [999, "lb-s"]])}`} dir="auto">{body}</p>}
          </div>
          <Clock showSeconds={tv.settings.showClockSeconds} tz={tz} className="clock-foot" />
        </aside>
      </div>
    );
  }
  return (
    <div className={`scene scene-announce ann-${a.style || "info"}`}>
      <div className="ann-inner glass">
        <div className="ann-label"><Ornament /><span>{ANNOUNCEMENT_STYLES[a.style || "info"]?.label || "Announcement"}</span><Ornament /></div>
        {title && <h1 className={`ann-title ${sizeClass(title, [[24, "t-l"], [48, "t-m"], [999, "t-s"]])}`} dir="auto">{title}</h1>}
        {body && <p className={`ann-body ${sizeClass(body, [[110, "b-l"], [220, "b-m"], [999, "b-s"]])}`} dir="auto">{body}</p>}
      </div>
      <SlideFoot tv={tv} sched={sched} tz={tz} />
    </div>
  );
}

// ── Mazal Tov ──

function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = canvas.clientWidth || 1920), H = (canvas.height = canvas.clientHeight || 1080);
    const colors = getComputedStyle(canvas).getPropertyValue("--confetti").split(",").map((c) => c.trim()).filter(Boolean);
    const rand = (a, b) => a + Math.random() * (b - a);
    // kind: "left" / "right" corner cannons, "center" pop, or "rain" from the top
    const make = (kind) => {
      const base = { w: rand(10, 22), h: rand(6, 12), r: rand(0, Math.PI), vr: rand(-0.14, 0.14), wob: rand(0, Math.PI * 2), c: colors[(Math.random() * colors.length) | 0] || "#fff" };
      if (kind === "left" || kind === "right") {
        const dir = kind === "left" ? 1 : -1;
        return { ...base, x: kind === "left" ? 0 : W, y: H, vx: dir * rand(10, 30), vy: rand(-38, -22) };
      }
      if (kind === "center") {
        const ang = rand(0, Math.PI * 2), sp = rand(8, 24);
        return { ...base, x: W / 2, y: H * 0.4, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 6 };
      }
      return { ...base, x: rand(0, W), y: rand(-H * 0.2, -20), vx: rand(-0.6, 0.6), vy: rand(1.4, 2.8) };
    };
    let parts = [];
    const fire = (kind, n) => { for (let i = 0; i < n; i++) parts.push(make(kind)); };
    fire("left", 70); fire("right", 70);
    const timers = [setTimeout(() => fire("center", 90), 900)];
    let raf, frame = 0, start = performance.now();
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      const elapsed = performance.now() - start;
      if (elapsed > 2400 && parts.length < 120 && frame % 5 === 0) parts.push(make("rain"));
      for (const p of parts) {
        p.vy += p.vy < 3 ? 0.55 : 0.02;
        p.vx *= 0.975;
        p.wob += 0.08;
        p.x += p.vx + Math.sin(p.wob) * 0.8;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, Math.cos(p.wob));
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      parts = parts.filter((p) => p.y < H + 60 && p.x > -80 && p.x < W + 80);
      raf = requestAnimationFrame(tick);
    };
    const delay = setTimeout(() => { raf = requestAnimationFrame(tick); }, 500);
    return () => { clearTimeout(delay); timers.forEach(clearTimeout); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="confetti" />;
}

function Motif({ kind }) {
  if (kind === "rings") {
    return (
      <svg className="motif" viewBox="0 0 220 130" aria-hidden="true">
        <circle cx="80" cy="65" r="52" pathLength="1" />
        <circle cx="140" cy="65" r="52" pathLength="1" />
      </svg>
    );
  }
  return (
    <svg className="motif" viewBox="0 0 140 140" aria-hidden="true">
      <path d="M70 8 L124 102 L16 102 Z" pathLength="1" />
      <path d="M70 132 L16 38 L124 38 Z" pathLength="1" />
    </svg>
  );
}

function MazalTovScene({ slide, tv, sched, tz }) {
  const a = slide.item;
  const occ = OCCASIONS[a.occasion] || OCCASIONS.other;
  const line = a.line ?? occ.line;
  const names = a.title || "";
  return (
    <div className="scene scene-mazal">
      <Confetti />
      <div className="mazal-inner">
        <Motif kind={occ.motif} />
        <div className="mazal-he" dir="rtl">
          {"מזל טוב".split("").map((ch, i) => (
            <span key={i} style={{ animationDelay: `${0.35 + i * 0.07}s` }}>{ch === " " ? " " : ch}</span>
          ))}
        </div>
        <Ornament className="rise" />
        {line && <p className="mazal-line rise" style={{ animationDelay: "1.05s" }}>{line}</p>}
        {names && <h1 className={`mazal-names rise ${names.length > 34 ? "n-s" : ""}`} style={{ animationDelay: "1.3s" }} dir="auto">{names}</h1>}
        {a.body && <p className="mazal-body rise" style={{ animationDelay: "1.6s" }} dir="auto">{a.body}</p>}
      </div>
      <SlideFoot tv={tv} sched={sched} tz={tz} />
    </div>
  );
}

// ── Meal sponsor ──
// One centred card, framed like a formal invitation. A memorial dedication
// gets a quietly flickering candle above the text.

function Candle() {
  return (
    <svg className="candle" viewBox="0 0 60 120" aria-hidden="true">
      <defs>
        <radialGradient id="flame-glow"><stop offset="0" stopColor="#FFE7A8" stopOpacity=".9" /><stop offset="1" stopColor="#FFB84D" stopOpacity="0" /></radialGradient>
        <linearGradient id="flame" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FFF6D8" /><stop offset=".6" stopColor="#FFC65C" /><stop offset="1" stopColor="#E88A2A" /></linearGradient>
        <linearGradient id="wax" x1="0" x2="1"><stop offset="0" stopColor="#EDE6D8" /><stop offset=".5" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D9D0BF" /></linearGradient>
      </defs>
      <circle className="flame-glow" cx="30" cy="30" r="28" fill="url(#flame-glow)" />
      <path className="flame" d="M30 8 C38 22 40 32 30 44 C20 32 22 22 30 8 Z" fill="url(#flame)" />
      <line x1="30" y1="44" x2="30" y2="52" stroke="#3A2F25" strokeWidth="2" />
      <rect x="20" y="52" width="20" height="62" rx="3" fill="url(#wax)" />
    </svg>
  );
}

function SponsorScene({ slide, tv, sched, tz }) {
  const a = slide.item;
  const meal = a.meal || "Kiddush";
  const dedKey = a.dedication || "none";
  const ded = DEDICATIONS[dedKey] ?? "";
  const name = a.title || "";
  return (
    <div className={`scene scene-sponsor ded-${dedKey}`}>
      <div className="sponsor-card glass">
        <div className="sponsor-frame">
          {dedKey === "memory" ? <Candle /> : <Ornament className="sponsor-orn rise" />}
          <p className="sponsor-kicker rise" style={{ animationDelay: ".1s" }}>This week’s</p>
          <h1 className={`sponsor-meal rise ${meal.length > 10 ? "m-s" : ""}`} style={{ animationDelay: ".2s" }}>{meal}</h1>
          <p className="sponsor-by rise" style={{ animationDelay: ".4s" }}>is graciously sponsored by</p>
          <p className={`sponsor-name rise ${name.length > 28 ? "n-s" : ""}`} style={{ animationDelay: ".55s" }} dir="auto">{name}</p>
          {a.body && (
            <div className="sponsor-ded rise" style={{ animationDelay: ".8s" }}>
              <Ornament />
              {ded && <span>{ded}</span>}
              <b dir="auto">{a.body}</b>
            </div>
          )}
        </div>
      </div>
      <SlideFoot tv={tv} sched={sched} tz={tz} />
    </div>
  );
}
