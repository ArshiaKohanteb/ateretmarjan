import React, { useEffect, useRef } from "react";
import { Brand, Clock, Time, countdownText } from "./common.jsx";
import { OCCASIONS, DEDICATIONS } from "../../shared/defaults.js";

function Backdrop({ url }) {
  return (
    <div className="backdrop">
      <img src={url} alt="" />
    </div>
  );
}

// The live strip beside portrait flyers: clock, date, what's next.
function SidePanel({ tv, z, sched, now, tz, narrow }) {
  const upcoming = sched.upcoming.slice(narrow ? 0 : 1, narrow ? 2 : 4);
  return (
    <aside className={`side ${narrow ? "side-narrow" : ""}`}>
      <Brand tv={tv} small />
      <div className="side-main">
        <Clock tz={tz} className="clock-side" />
        {!narrow && z?.hebrewDate?.hebrew && <div className="side-hebdate" dir="rtl">{z.hebrewDate.hebrew}</div>}
      </div>
      {!narrow && sched.next && (
        <div className="side-next">
          <span className="side-next-name" dir="auto">{sched.next.name}</span>
          <Time epoch={sched.next.epoch} tz={tz} />
          <span className="side-next-when">{countdownText(sched.next.epoch, now)}</span>
        </div>
      )}
      {upcoming.length > 0 && (
        <ul className="side-list">
          {upcoming.map((m) => (
            <li key={m.id + m.epoch}><span dir="auto">{m.name}</span><Time epoch={m.epoch} tz={tz} /></li>
          ))}
        </ul>
      )}
    </aside>
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
        <div className="pair">
          <img className="flyer-img" src={a.url} alt={a.name || ""} />
          <img className="flyer-img" src={b.url} alt={b.name || ""} />
        </div>
      </div>
    );
  }

  return (
    <div className="scene scene-flyer flyer-tall">
      <div className="tall-stage">
        <Backdrop url={a.url} />
        <img className="flyer-img" src={a.url} alt={a.name || ""} />
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
        <Clock tz={tz} className="clock-foot" />
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
  return (
    <div className={`scene scene-announce ann-${a.style || "info"}`}>
      <div className="ann-inner">
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
    const W = (canvas.width = 1920), H = (canvas.height = 1080);
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
        {line && <p className="mazal-line rise" style={{ animationDelay: "1.05s" }}>{line}</p>}
        {names && <h1 className={`mazal-names rise ${names.length > 34 ? "n-s" : ""}`} style={{ animationDelay: "1.3s" }} dir="auto">{names}</h1>}
        {a.body && <p className="mazal-body rise" style={{ animationDelay: "1.6s" }} dir="auto">{a.body}</p>}
      </div>
      <SlideFoot tv={tv} sched={sched} tz={tz} />
    </div>
  );
}

// ── Meal sponsor ──

function SponsorScene({ slide, tv, sched, tz }) {
  const a = slide.item;
  const meal = a.meal || "Kiddush";
  const ded = DEDICATIONS[a.dedication || "none"] ?? "";
  return (
    <div className="scene scene-sponsor">
      <section className="sponsor-meal">
        <Brand tv={tv} small />
        <h1 className="rise" style={{ animationDelay: ".15s" }}>
          <span className="sponsor-week">This week’s</span>
          <span className={`sponsor-meal-name ${meal.length > 10 ? "m-s" : ""}`}>{meal}</span>
        </h1>
      </section>
      <section className="sponsor-who">
        <p className="sponsor-by rise" style={{ animationDelay: ".45s" }}>is sponsored by</p>
        <p className={`sponsor-name rise ${(a.title || "").length > 30 ? "n-s" : ""}`} style={{ animationDelay: ".6s" }} dir="auto">{a.title}</p>
        {ded && a.body && (
          <div className="sponsor-ded rise" style={{ animationDelay: ".85s" }}>
            <span>{ded}</span>
            <b dir="auto">{a.body}</b>
          </div>
        )}
        {!ded && a.body && <p className="sponsor-note rise" style={{ animationDelay: ".85s" }} dir="auto">{a.body}</p>}
        <div className="sponsor-clock"><Clock tz={tz} className="clock-foot" /></div>
      </section>
    </div>
  );
}
