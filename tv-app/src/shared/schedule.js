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

// Everything the schedule screen needs for "now".
export function buildSchedule(tv, z, now = Date.now(), tz = TIMEZONE) {
  const info = localInfo(now, tz);
  const today = info.dateKey;
  const wd = info.weekday;

  const special = activeSpecial(tv, today);
  const todaySource = special ? special.items || [] : (tv.minyanim || []).filter((m) => (m.days || []).includes(wd));
  const todayItems = todaySource
    .map((m) => ({ ...m, epoch: resolveTime(m.time, today, z, tz) }))
    .filter((m) => m.epoch != null)
    .sort((a, b) => a.epoch - b.epoch);

  const satKey = addDays(today, (6 - wd + 7) % 7);
  const friKey = addDays(satKey, -1);
  const showFrom = Number(tv.settings?.shabbatShowFrom ?? 4);
  const showShabbat = wd === 6 || wd === 5 || (showFrom <= 4 && wd >= showFrom) || showFrom === 0;
  const shabbatItems = (tv.shabbat || [])
    .map((s) => {
      const key = s.day === "fri" ? friKey : satKey;
      return { ...s, epoch: resolveTime(s.time, key, z, tz) };
    })
    .filter((s) => s.epoch != null)
    .sort((a, b) => a.epoch - b.epoch);

  // On Shabbat the Shabbat schedule *is* today's schedule.
  const dayItems = wd === 6 && !special ? [] : todayItems;
  const upcomingPool = [...dayItems, ...(showShabbat ? shabbatItems : [])].sort((a, b) => a.epoch - b.epoch);
  const next = upcomingPool.find((m) => m.epoch > now) || null;

  const zToday = z?.days?.[today] || {};
  const isNight = zToday.sunset && zToday.sunrise ? now > zToday.sunset || now < zToday.sunrise : false;
  const friCandle = z?.candleLighting;
  const isShabbat = !!(friCandle && z?.havdalah && now >= friCandle && now <= z.havdalah);

  return {
    today, weekday: wd, special,
    todayItems: dayItems,
    shabbatItems: showShabbat ? shabbatItems : [],
    next, isNight, isShabbat,
  };
}

export function minutesUntil(epoch, now = Date.now()) {
  return Math.ceil((epoch - now) / 60_000);
}

export function isLive(item, today) {
  if (item.active === false) return false;
  return inRange(today, item.start, item.end);
}
