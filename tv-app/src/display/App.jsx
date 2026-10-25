import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTv, useZmanim, useNow, useStageScale, useImageSizes } from "./hooks.js";
import { buildContent, slideSeconds } from "./rotation.js";
import { buildSchedule, minutesUntil, localInfo, TIMEZONE } from "../shared/schedule.js";
import { THEMES, resolveTheme } from "../shared/themes.js";
import ScheduleScene from "./scenes/ScheduleScene.jsx";
import { FlyerScene, AnnouncementScene } from "./scenes/ContentScenes.jsx";
import { Crown } from "./scenes/common.jsx";

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
      if (HOLD === "flyer" || HOLD === "announcement") pool = content.filter((c) => c.kind === HOLD);
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

  const themeId = FORCE_THEME && THEMES[FORCE_THEME] ? FORCE_THEME : resolveTheme(tv.settings, sched || {});
  const theme = THEMES[themeId];
  const flip = tv.settings.flip && !params.has("preview");

  const render = (slide) => {
    const props = { slide, tv, z, sched, now, tz };
    if (slide.kind === "flyer") return <FlyerScene {...props} />;
    if (slide.kind === "announcement") return <AnnouncementScene {...props} />;
    return <ScheduleScene {...props} />;
  };

  return (
    <div className={`viewport theme-${themeId} ${theme.dark ? "is-dark" : "is-light"}`} style={theme.vars}>
      <div
        className="stage"
        style={{ transform: `translate(-50%, -50%) scale(${scale})${flip ? " rotate(180deg)" : ""}` }}
      >
        <div className="ambient" />
        {prev && (
          <div className="layer layer-out" key={"out" + prev.n}>{render(prev.slide)}</div>
        )}
        <div className="layer layer-in" key={"in" + slides.n}>{render(slides.cur)}</div>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="viewport theme-royal is-dark" style={THEMES.royal.vars}>
      <div className="splash">
        <Crown size={160} />
      </div>
    </div>
  );
}
