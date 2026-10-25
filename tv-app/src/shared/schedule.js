// Turns stored schedule items into real times for a given day.

export const TIMEZONE = "America/Los_Angeles";

export const ZMAN_CHOICES = [
  { id: "sunrise", label: "Sunrise" },
  { id: "hatzot", label: "Midday (Chatzot)" },
  { id: "minchaGedola", label: "Mincha Gedola" },
  { id: "plag", label: "Plag HaMincha" },
  { id: "sunset", label: "Sunset" },
  { id: "tzet", label: "Nightfall (Tzet)" },
  { id: "alot", label: "Dawn (Alot)" },
  { id: "misheyakir", label: "Misheyakir" },
  { id: "candleLighting", label: "Candle Lighting", shabbat: true },
  { id: "havdalah", label: "Havdalah", shabbat: true },
  { id: "rabbeinuTam", label: "Rabbeinu Tam", shabbat: true },
];

const partsFmt = new Map();
function parts(epoch, tz) {
  if (!partsFmt.has(tz)) {
    partsFmt.set(tz, new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
    }));
  }
  const o = {};
  for (const p of partsFmt.get(tz).formatToParts(epoch)) o[p.type] = p.value;
  return o;
}

const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function localInfo(epoch, tz = TIMEZONE) {
  const p = parts(epoch, tz);
  return {
    dateKey: `${p.year}-${p.month}-${p.day}`,
    weekday: WD[p.weekday],
    hour: +p.hour,
    minute: +p.minute,
    second: +p.second,
  };
}

export function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// Epoch for a wall-clock time on a date in the shul's timezone.
export function zonedEpoch(dateKey, hhmm, tz = TIMEZONE) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = String(hhmm || "0:0").split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let epoch = guess;
  for (let i = 0; i < 2; i++) {
    const p = parts(epoch, tz);
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    epoch += guess - asUtc;
  }
  return epoch;
}

export function resolveTime(spec, dateKey, z, tz = TIMEZONE) {
  if (!spec) return null;
  if (spec.type === "fixed") return spec.value ? zonedEpoch(dateKey, spec.value, tz) : null;
  if (spec.type === "zman" && z) {
    let base = null;
    if (spec.zman === "candleLighting" || spec.zman === "havdalah" || spec.zman === "rabbeinuTam") base = z[spec.zman];
    else base = z.days?.[dateKey]?.[spec.zman] ?? null;
    if (base == null) return null;
    let t = base + (Number(spec.offset) || 0) * 60_000;
    const r = Number(spec.round) || 0;
    if (r > 0) t = Math.floor(t / (r * 60_000)) * r * 60_000;
    else t = Math.floor(t / 60_000) * 60_000;
    return t;
  }
  return null;
}

export function describeTime(spec) {
  if (!spec) return "";
  if (spec.type === "fixed") return formatHHMM(spec.value);
  const z = ZMAN_CHOICES.find((c) => c.id === spec.zman)?.label || spec.zman;
  const off = Number(spec.offset) || 0;
  const rel = off === 0 ? `At ${z}` : `${Math.abs(off)} min ${off < 0 ? "before" : "after"} ${z}`;
  return spec.round ? `${rel}, rounded down to ${spec.round} min` : rel;
}

export function formatHHMM(v) {
  if (!v) return "";
  const [h, m] = v.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// { time: "6:30", ampm: "PM" }
export function formatEpoch(epoch, tz = TIMEZONE, withSeconds = false) {
  if (epoch == null) return { time: "—", ampm: "" };
  const p = localInfo(epoch, tz);
  const h = ((p.hour + 11) % 12) + 1;
  const time = `${h}:${String(p.minute).padStart(2, "0")}${withSeconds ? ":" + String(p.second).padStart(2, "0") : ""}`;
  return { time, ampm: p.hour < 12 ? "AM" : "PM" };
}

export const fmt = (epoch, tz) => {
  const f = formatEpoch(epoch, tz);
  return f.ampm ? `${f.time} ${f.ampm}` : f.time;
};

const inRange = (dateKey, start, end) => (!start || dateKey >= start) && (!end || dateKey <= end);

export function activeSpecial(tv, dateKey) {
  return (tv.special || []).find((s) => s.active !== false && s.start && inRange(dateKey, s.start, s.end || s.start));
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Shabbat"];

const timed = (items, dateKey, z, tz) => (items || [])
  .map((m) => ({ ...m, epoch: resolveTime(m.time, dateKey, z, tz) }))
  .filter((m) => m.epoch != null)
  .sort((a, b) => a.epoch - b.epoch);

// Everything the schedule screen needs for "now". The timetable is a list of
// groups (Today, Shabbat, upcoming holiday days), each with its own title.
export function buildSchedule(tv, z, now = Date.now(), tz = TIMEZONE) {
  const info = localInfo(now, tz);
  const today = info.dateKey;
  const wd = info.weekday;
  const groups = [];

  const special = activeSpecial(tv, today);
  if (special) {
    groups.push({ key: "special-" + today, title: special.title || "Today", subtitle: "Today", items: timed(special.items, today, z, tz) });
  } else if (wd !== 6) {
    const items = timed((tv.minyanim || []).filter((m) => (m.days || []).includes(wd)), today, z, tz);
    if (items.length) groups.push({ key: "today", title: "Today", subtitle: WEEKDAY_NAMES[wd], items });
  }

  // From the "show from" day through Shabbat, show what's coming up.
  const satKey = addDays(today, (6 - wd + 7) % 7);
  const friKey = addDays(satKey, -1);
  const showFrom = Number(tv.settings?.shabbatShowFrom ?? 4);
  const lookAhead = wd === 6 || wd === 5 || showFrom === 0 || wd >= showFrom;
  if (lookAhead) {
    // Holiday days between tomorrow and Shabbat (e.g. a parsed Yom Tov flyer)
    for (let d = addDays(today, 1); d <= satKey; d = addDays(d, 1)) {
      const sp = activeSpecial(tv, d);
      if (sp) {
        const dwd = localInfo(zonedEpoch(d, "12:00", tz), tz).weekday;
        groups.push({ key: "special-" + d, title: sp.title || WEEKDAY_NAMES[dwd], subtitle: WEEKDAY_NAMES[dwd], items: timed(sp.items, d, z, tz) });
      }
    }
    const shabbatCovered = activeSpecial(tv, satKey) || (wd === 5 && special && activeSpecial(tv, friKey));
    if (!shabbatCovered) {
      const items = (tv.shabbat || [])
        .map((s) => ({ ...s, epoch: resolveTime(s.time, s.day === "fri" ? friKey : satKey, z, tz) }))
        .filter((s) => s.epoch != null && !(wd === 6 && s.day === "fri"))
        .sort((a, b) => a.epoch - b.epoch);
      if (items.length) groups.push({ key: "shabbat", title: "Shabbat", subtitle: z?.parasha ? `פרשת ${z.parasha}` : "", items });
    }
  }

  const all = groups.flatMap((g) => g.items).sort((a, b) => a.epoch - b.epoch);

  // Early in the week, preview this Shabbat's times so the board is never half empty.
  if (!lookAhead && z?.candleLighting) {
    groups.push({
      key: "shabbat-preview", title: "Shabbat", subtitle: z.parasha ? `פרשת ${z.parasha}` : "", preview: true,
      items: [
        { id: "cl", name: "Candle Lighting", epoch: z.candleLighting },
        { id: "hv", name: "Havdalah", epoch: z.havdalah },
      ].filter((m) => m.epoch),
    });
  }
  const next = all.find((m) => m.epoch > now) || null;

  const zToday = z?.days?.[today] || {};
  const isNight = zToday.sunset && zToday.sunrise ? now > zToday.sunset || now < zToday.sunrise : false;
  const isShabbat = !!(z?.candleLighting && z?.havdalah && now >= z.candleLighting && now <= z.havdalah);

  return { today, weekday: wd, special, groups, upcoming: all.filter((m) => m.epoch > now), next, isNight, isShabbat };
}

export function minutesUntil(epoch, now = Date.now()) {
  return Math.ceil((epoch - now) / 60_000);
}

export function isLive(item, today) {
  if (item.active === false) return false;
  return inRange(today, item.start, item.end);
}
