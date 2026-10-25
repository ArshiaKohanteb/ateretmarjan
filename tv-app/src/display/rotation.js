import { isLive } from "../shared/schedule.js";

const shapeOf = (f, sizes) => {
  const s = f.w && f.h ? { w: f.w, h: f.h } : sizes.get(f.url);
  if (!s || !s.w) return "tall";
  return s.w / s.h >= 1.25 ? "wide" : "tall";
};

// Ordered list of content slides (flyers + announcement cards).
export function buildContent(tv, today, sizes) {
  const s = tv.settings;
  const flyers = (tv.flyers || [])
    .filter((f) => f.url && isLive(f, today) && !sizes.get(f.url)?.error)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const flyerSlides = [];
  let waiting = null;
  for (const f of flyers) {
    const shape = shapeOf(f, sizes);
    if (shape === "wide") {
      flyerSlides.push({ kind: "flyer", layout: "wide", items: [f], key: f.id });
    } else if (s.pairVerticalFlyers && !f.solo) {
      if (waiting) {
        flyerSlides.push({ kind: "flyer", layout: "pair", items: [waiting, f], key: waiting.id + f.id });
        waiting = null;
      } else waiting = f;
    } else {
      flyerSlides.push({ kind: "flyer", layout: "tall", items: [f], key: f.id });
    }
  }
  if (waiting) flyerSlides.push({ kind: "flyer", layout: "tall", items: [waiting], key: waiting.id });

  const cards = (tv.announcements || [])
    .filter((a) => a.slide !== false && isLive(a, today) && (a.title || a.body))
    .map((a) => ({ kind: "announcement", item: a, key: a.id }));

  // Interleave so flyers and announcements alternate.
  const out = [];
  const n = Math.max(flyerSlides.length, cards.length);
  for (let i = 0; i < n; i++) {
    if (flyerSlides[i]) out.push(flyerSlides[i]);
    if (cards[i]) out.push(cards[i]);
  }
  return out;
}

export function slideSeconds(slide, settings) {
  if (slide.kind === "schedule") return settings.scheduleSeconds || 30;
  if (slide.kind === "announcement") return slide.item.seconds || settings.announcementSeconds || 12;
  const custom = Math.max(...slide.items.map((f) => f.seconds || 0));
  return custom || settings.flyerSeconds || 12;
}
