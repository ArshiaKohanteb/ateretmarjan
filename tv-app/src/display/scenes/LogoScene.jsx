import React, { useEffect, useRef } from "react";

// The between-slides moment: gold light draws the crown out of the dark, the five points ignite,
// a flash fills it with the real logo, sparks burst and the name rises letter by letter.

// Traced from the logo, in the coordinates of logo.png. The final crown is the logo image itself
// (crown.png sits at 42,1 in the same space), so these only need to be close: they fade as it fills.
const BODY = "M84 172L165 398Q172 420 196 413Q328 368 460 413Q484 420 491 398L568 172L536 160L454 295Q447 306 443 295L477 100L437 97L386 262Q376 280 368 262L351 78L305 78L290 262Q280 280 272 262L220 97L181 100L205 295Q201 306 193 295L110 160Z";
const BAND = "M186 455Q190 440 206 433Q320 385 436 433Q452 440 456 455L443 491Q441 500 430 497Q320 455 212 497Q201 500 199 491Z";
const POINTS = [[328, 41, 40], [194, 65, 38], [461, 65, 38], [81, 135, 38], [566, 135, 38]];
const BURST_AT = 2900;

function Sparks() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = canvas.clientWidth || 1920);
    const H = (canvas.height = canvas.clientHeight || 1080);
    const lite = !!canvas.closest(".fx-lite");
    const cx = W / 2, cy = H * 0.4;
    const rand = (a, b) => a + Math.random() * (b - a);

    // One soft dot, drawn once and stamped for every spark.
    const dot = document.createElement("canvas");
    dot.width = dot.height = 32;
    const d = dot.getContext("2d");
    const g = d.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,250,225,1)");
    g.addColorStop(0.3, "rgba(245,205,120,.75)");
    g.addColorStop(1, "rgba(232,180,80,0)");
    d.fillStyle = g;
    d.fillRect(0, 0, 32, 32);

    const dust = () => ({ x: rand(0, W), y: rand(0, H), vx: rand(-0.12, 0.12), vy: rand(-0.5, -0.12), s: rand(4, 13), a: rand(0.15, 0.6), life: Infinity, tw: rand(0, 6.28) });
    const sparks = Array.from({ length: lite ? 24 : 70 }, dust);
    let burst = false;
    let raf;
    const start = performance.now();
    const frame = (t) => {
      const el = t - start;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      if (!burst && el >= BURST_AT) {
        burst = true;
        for (let i = 0; i < (lite ? 50 : 170); i++) {
          const ang = rand(0, 6.28), sp = rand(2, 17);
          sparks.push({ x: cx + Math.cos(ang) * 60, y: cy + Math.sin(ang) * 60, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1, s: rand(5, 20), a: 1, life: rand(60, 170), burst: true, tw: 0 });
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx; p.y += p.vy;
        if (p.burst) {
          p.vx *= 0.965; p.vy = p.vy * 0.965 + 0.035;
          if (--p.life <= 0) { sparks.splice(i, 1); continue; }
          ctx.globalAlpha = Math.min(1, p.life / 60);
        } else {
          if (p.y < -20) { p.y = H + 20; p.x = rand(0, W); }
          ctx.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(p.tw + el / 900)) * Math.min(1, el / 1500);
        }
        ctx.drawImage(dot, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="lg-sparks" aria-hidden="true" />;
}

export default function LogoScene({ tv }) {
  const name = (tv.settings.shulName || "Ateret Marjan").toUpperCase();
  return (
    <div className="scene scene-logo">
      <div className="lg-nebula" aria-hidden="true" />
      <div className="lg-rays" aria-hidden="true"><i /><i /></div>
      <div className="lg-ring" aria-hidden="true" />
      <div className="lg-ring lg-ring-2" aria-hidden="true" />
      <Sparks />

      <div className="lg-lockup">
        <div className="lg-crown" aria-hidden="true">
          <div className="lg-halo" />
          <svg viewBox="42 1 564 538" className="lg-lines">
            <defs>
              <radialGradient id="lg-flare"><stop offset="0" stopColor="#FFFBEA" /><stop offset=".35" stopColor="#F0C873" stopOpacity=".6" /><stop offset="1" stopColor="#F0C873" stopOpacity="0" /></radialGradient>
            </defs>
            <g className="lg-glow">
              <path d={BODY} pathLength="1" /><path d={BAND} pathLength="1" /><ellipse cx="321" cy="517" rx="64" ry="19" pathLength="1" />
            </g>
            <g className="lg-core">
              <path d={BODY} pathLength="1" /><path d={BAND} pathLength="1" /><ellipse cx="321" cy="517" rx="64" ry="19" pathLength="1" />
            </g>
            {POINTS.map(([x, y, r], i) => (
              <g key={i} style={{ "--d": `${1.5 + i * 0.22}s` }}>
                <circle className="lg-flare" cx={x} cy={y} r={r * 2.2} />
                <circle className="lg-point" cx={x} cy={y} r={r} />
              </g>
            ))}
          </svg>
          <div className="lg-fill" />
          <div className="lg-flash" />
        </div>

        <h1 className="lg-name" aria-label={name}>
          {[...name].map((c, i) => (
            <span key={i} style={{ animationDelay: `${3.35 + i * 0.055}s` }}>{c === " " ? " " : c}</span>
          ))}
        </h1>
        <div className="lg-rule" aria-hidden="true"><span /><i /><span /></div>
        <div className="lg-he" dir="rtl">{tv.settings.shulNameHe}</div>
      </div>
    </div>
  );
}
