import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTv, useZmanim, useNow, useStage, useImageSizes } from "./hooks.js";
import { buildContent, slideSeconds } from "./rotation.js";
import { buildSchedule, minutesUntil, localInfo, setHour24, TIMEZONE } from "../shared/schedule.js";
import { THEMES, resolveTheme } from "../shared/themes.js";
import { useHebrewFont } from "../shared/fonts.js";
import ScheduleScene from "./scenes/ScheduleScene.jsx";
import { FlyerScene, AnnouncementScene } from "./scenes/ContentScenes.jsx";
import CommunityScene from "./scenes/CommunityScene.jsx";

const params = new URLSearchParams(location.search);
const HOLD = params.get("hold"); // schedule | flyer | announcement (dashboard preview)
const FORCE_THEME = params.get("theme");
// /tv/flipped sets window.__TV_FLIP__ for a TV mounted upside down.
const FLIP = !!window.__TV_FLIP__ || params.has("flip");
const SCHEDULE = { kind: "schedule", key: "schedule" };

export default function App() {
  const tv = useTv();
  const z = useZmanim();
  const now = useNow(60_000);
  const stage = useStage();
  const tz = z?.timezone || TIMEZONE;

  const today = localInfo(now, tz).dateKey;
  const urls = useMemo(() => (tv?.flyers || []).map((f) => f.url).filter(Boolean), [tv]);
  const sizes = useImageSizes(urls);
  const content = useMemo(() => (tv ? buildContent(tv, today, sizes) : []), [tv, today, sizes, urls.map((u) => sizes.get(u)?.w).join()]);
  setHour24(tv?.settings?.clock24);
  useHebrewFont(tv?.settings?.hebrewFont);
  const sched = useMemo(() => (tv ? buildSchedule(tv, z, now, tz) : null), [tv, z, now, tz]);

  // ── Rotation ──
  const [slides, setSlides] = useState({ cur: SCHEDULE, n: 0, tick: 0 });
  const [prev, setPrev] = useState(null);
  const pointer = useRef(0);
  const sinceSchedule = useRef(0);
  const live = useRef({});
  live.current = { tv, content, sched };

  useEffect(() => {
    if (!tv) return;
    const { cur } = slides;
    // Previews pinned to flyers/announcements skip the opening schedule screen.
    const ms = HOLD && HOLD !== "schedule" && cur.kind === "schedule" ? 400 : slideSeconds(cur, tv.settings) * 1000;
    const t = setTimeout(() => {
      const { tv, content, sched } = live.current;
      const s = tv.settings;
      const holdForMinyan = s.holdBeforeMinyan > 0 && sched?.next && minutesUntil(sched.next.epoch) <= s.holdBeforeMinyan;
      let pool = content;
      if (HOLD === "flyer" || HOLD === "announcement" || HOLD === "community") pool = content.filter((c) => c.kind === HOLD);
      const shabbatPause = s.pauseOnShabbat && sched?.inPeriod;
      const contentAllowed = HOLD !== "schedule" && pool.length > 0 && (HOLD || (!s.contentPaused && !holdForMinyan && !shabbatPause));

      let next = SCHEDULE;
      if (contentAllowed) {
        const between = Math.max(1, s.itemsBetween || 1);
        const wantContent = HOLD || cur.kind === "schedule" || sinceSchedule.current < between;
        if (wantContent) {
          if (s.slideOrder === "shuffle" && pool.length > 2) {
            let pickI;
            do { pickI = Math.floor(Math.random() * pool.length); } while (pool[pickI].key === cur.key);
            next = pool[pickI];
          } else {
            next = pool[pointer.current % pool.length];
            pointer.current = (pointer.current + 1) % pool.length;
          }
          sinceSchedule.current = cur.kind === "schedule" ? 1 : sinceSchedule.current + 1;
        }
      }
      if (next.kind === "schedule") sinceSchedule.current = 0;
      // A new key each time, so every collage is a fresh random pick.
      if (next.kind === "community") next = { ...next, key: "community-" + Date.now() };
      if (next.key !== cur.key) setPrev({ slide: cur, n: slides.n });
      setSlides((p) => ({ cur: next, n: next.key !== p.cur.key ? p.n + 1 : p.n, tick: p.tick + 1 }));
    }, ms);
    return () => clearTimeout(t);
  }, [slides, !!tv]);

  useEffect(() => {
    if (!prev) return;
    const t = setTimeout(() => setPrev(null), 1200);
    return () => clearTimeout(t);
  }, [prev]);

  // Preload the next flyer so it never pops in half-loaded.
  useEffect(() => {
    const upcoming = content[pointer.current % (content.length || 1)];
    upcoming?.items?.forEach((f) => { const i = new Image(); i.src = f.url; });
  }, [slides.n, content]);

  // A daily refresh (3:30 AM unless the owner changes it) keeps a 24/7 stick healthy.
  useEffect(() => {
    const p = localInfo(now, tz);
    const [h, m] = String(tv?.settings?.dailyReload || "03:30").split(":").map(Number);
    if (p.hour === h && p.minute === m && performance.now() > 10 * 60_000) location.reload();
  }, [now]);

  if (!tv) return <Splash />;

  const sky = skyColor(z?.days?.[today], now);
  const themeId = FORCE_THEME && THEMES[FORCE_THEME] ? FORCE_THEME : resolveTheme(tv.settings, sched || {});
  const theme = THEMES[themeId];
  const flip = FLIP && !params.has("preview");
  const dim = nightDim(tv.settings, now, tz);

  const render = (slide) => {
    const props = { slide, tv, z, sched, now, tz };
    if (slide.kind === "flyer") return <FlyerScene {...props} />;
    if (slide.kind === "announcement") return <AnnouncementScene {...props} />;
    if (slide.kind === "community") return <CommunityScene {...props} />;
    return <ScheduleScene {...props} />;
  };

  return (
    <div className={`viewport theme-${themeId} ${theme.dark ? "is-dark" : "is-light"} fx-${tv.settings.effects === "lite" ? "lite" : "full"} tr-${tv.settings.transition || "fade"} ${stage.w / stage.h < 1.6 ? "is-narrow" : ""}`} style={{ ...theme.vars, "--sky": sky }}>
      <div
        className="stage"
        style={{ width: stage.w, height: stage.h, transform: `translate(-50%, -50%) scale(${stage.scale})${flip ? " rotate(180deg)" : ""}` }}
      >
        <div className="ambient" aria-hidden="true">
          <div className="amb-photo" />
          <div className="amb-tint" />
          <div className="amb-sky" />
          <div className="orb orb-a" />
          <div className="orb orb-b" />
          <div className="orb orb-c" />
          <div className="amb-vignette" />
          <div className="amb-grain" />
        </div>
        {prev && (
          <div className="layer layer-out" key={"out" + prev.n}>{render(prev.slide)}</div>
        )}
        <div className="layer layer-in" key={"in" + slides.n}>{render(slides.cur)}</div>
        {dim > 0 && <div className="night-dim" style={{ opacity: dim }} />}
      </div>
    </div>
  );
}

// A wash of colour that follows the real sky: rose at dawn, clear by day,
// amber at sunset, deep blue after nightfall.
function skyColor(d, now) {
  if (!d?.sunrise || !d?.sunset) return "transparent";
  const M = 60_000;
  if (d.alot && now >= d.alot && now < d.sunrise + 40 * M) return "rgba(255, 150, 140, .26)";
  if (now >= d.sunset - 70 * M && now < d.sunset + 15 * M) return "rgba(255, 168, 70, .30)";
  if (now >= d.sunset + 15 * M && now < (d.tzet || d.sunset) + 30 * M) return "rgba(150, 90, 200, .20)";
  if (now >= d.sunrise && now < d.sunset) return "rgba(120, 190, 255, .14)";
  return "rgba(20, 40, 120, .25)";
}

// Dim the screen overnight so it isn't a floodlight in an empty room.
function nightDim(s, now, tz) {
  const n = s.nightDim;
  if (!n?.enabled || !n.start || !n.end) return 0;
  const p = localInfo(now, tz);
  const mins = p.hour * 60 + p.minute;
  const [sh, sm] = n.start.split(":").map(Number);
  const [eh, em] = n.end.split(":").map(Number);
  const a = sh * 60 + sm, b = eh * 60 + em;
  const inside = a < b ? mins >= a && mins < b : mins >= a || mins < b;
  return inside ? Math.min(0.85, Math.max(0, 1 - (Number(n.level) || 40) / 100)) : 0;
}

function Splash() {
  return (
    <div className="viewport theme-royal is-dark" style={THEMES.royal.vars}>
      <div className="splash">
        <div className="crown" />
      </div>
    </div>
  );
}
