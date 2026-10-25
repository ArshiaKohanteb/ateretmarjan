import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTv, useZmanim, useNow, useStageScale, useImageSizes } from "./hooks.js";
import { buildContent, slideSeconds } from "./rotation.js";
import { buildSchedule, minutesUntil, localInfo, TIMEZONE } from "../shared/schedule.js";
import { THEMES, resolveTheme } from "../shared/themes.js";
import ScheduleScene from "./scenes/ScheduleScene.jsx";
import { FlyerScene, AnnouncementScene } from "./scenes/ContentScenes.jsx";
import CommunityScene from "./scenes/CommunityScene.jsx";

const params = new URLSearchParams(location.search);
const HOLD = params.get("hold"); // schedule | flyer | announcement (dashboard preview)
const FORCE_THEME = params.get("theme");
const SCHEDULE = { kind: "schedule", key: "schedule" };

export default function App() {
  const tv = useTv();
  const z = useZmanim();
  const now = useNow(60_000);
  const scale = useStageScale();
  const tz = z?.timezone || TIMEZONE;

  const today = localInfo(now, tz).dateKey;
  const urls = useMemo(() => (tv?.flyers || []).map((f) => f.url).filter(Boolean), [tv]);
  const sizes = useImageSizes(urls);
  const content = useMemo(() => (tv ? buildContent(tv, today, sizes) : []), [tv, today, sizes, urls.map((u) => sizes.get(u)?.w).join()]);
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
      const contentAllowed = HOLD !== "schedule" && pool.length > 0 && (HOLD || (!s.contentPaused && !holdForMinyan));

      let next = SCHEDULE;
      if (contentAllowed) {
        const between = Math.max(1, s.itemsBetween || 1);
        const wantContent = HOLD || cur.kind === "schedule" || sinceSchedule.current < between;
        if (wantContent) {
          next = pool[pointer.current % pool.length];
          pointer.current = (pointer.current + 1) % pool.length;
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

  // Daily refresh at ~3:30 AM keeps a 24/7 stick healthy.
  useEffect(() => {
    const p = localInfo(now, tz);
    if (p.hour === 3 && p.minute === 30 && performance.now() > 10 * 60_000) location.reload();
  }, [now]);

  if (!tv) return <Splash />;

  const sky = skyColor(z?.days?.[today], now);
  const themeId = FORCE_THEME && THEMES[FORCE_THEME] ? FORCE_THEME : resolveTheme(tv.settings, sched || {});
  const theme = THEMES[themeId];
  const flip = tv.settings.flip && !params.has("preview");

  const render = (slide) => {
    const props = { slide, tv, z, sched, now, tz };
    if (slide.kind === "flyer") return <FlyerScene {...props} />;
    if (slide.kind === "announcement") return <AnnouncementScene {...props} />;
    if (slide.kind === "community") return <CommunityScene {...props} />;
    return <ScheduleScene {...props} />;
  };

  return (
    <div className={`viewport theme-${themeId} ${theme.dark ? "is-dark" : "is-light"} fx-${tv.settings.effects === "lite" ? "lite" : "full"}`} style={{ ...theme.vars, "--sky": sky }}>
      <div
        className="stage"
        style={{ transform: `translate(-50%, -50%) scale(${scale})${flip ? " rotate(180deg)" : ""}` }}
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

function Splash() {
  return (
    <div className="viewport theme-royal is-dark" style={THEMES.royal.vars}>
      <div className="splash">
        <div className="crown" />
      </div>
    </div>
  );
}
