// ═══════════════════════════════════════════════════════════════
// zmanim-bridge.js — feeds the /tv display with calendar data
//
// Uses the same KosherZmanim / ROYZmanim engine as the shul-wall pages
// (reads the location from the #zy-scheduleScreen-config script tag).
// Publishes window.__TV_ZMANIM__ and fires "tv-zmanim-ready".
// Times are exposed as epoch milliseconds; the display formats them.
// ═══════════════════════════════════════════════════════════════

import { Temporal, Makam, HiloulahYomiCalculator } from "../../libraries/kosherZmanim/kosher-zmanim.js";
import { zDTFromFunc } from "../ROYZmanim.js";
import { scheduleSettings, getCurrentZDT, getJCal, getZmanCalc } from "../shul-wall/base.js";
import n2wordsOrdinal from "../misc/n2wordsOrdinal.js";

const ZMANIM = [
  { id: "alot",          getter: "getAlotHashahar",             label: "Dawn",          he: "עלות השחר" },
  { id: "misheyakir",    getter: "getMisheyakir",               label: "Misheyakir",    he: "משיכיר" },
  { id: "sunrise",       getter: "getNetz",                     label: "Sunrise",       he: "הנץ החמה" },
  { id: "shemaMGA",      getter: "getSofZemanShemaMGA",         label: "Shema (MG\"A)", he: "סוף ק״ש מג״א" },
  { id: "shemaGRA",      getter: "getSofZemanShemaGRA",         label: "Shema (GR\"A)", he: "סוף ק״ש גר״א" },
  { id: "tefila",        getter: "getSofZemanBerakhothShema",   label: "Latest Tefila", he: "סוף זמן תפילה" },
  { id: "hatzot",        getter: "getHatzoth",                  label: "Midday",        he: "חצות היום" },
  { id: "minchaGedola",  getter: "getMinhaGedolah",             label: "Mincha Gedola", he: "מנחה גדולה" },
  { id: "plag",          getter: "getPlagHaminhaHalachaBrurah", label: "Plag HaMincha", he: "פלג המנחה" },
  { id: "sunset",        getter: "getShkiya",                   label: "Sunset",        he: "שקיעה" },
  { id: "tzet",          getter: "getTzet",                     label: "Nightfall",     he: "צאת הכוכבים" },
  { id: "midnight",      getter: "getSolarMidnight",            label: "Midnight",      he: "חצות הלילה" },
];

// What the TV says about each day. kind: yomtov | chol | erev | fast | minor
const HOLIDAYS = {
  0:  { name: "Erev Pesach", he: "ערב פסח", greeting: "Chag Kasher V'Sameach", kind: "erev" },
  1:  { name: "Pesach", he: "פסח", greeting: "Chag Kasher V'Sameach", kind: "yomtov" },
  2:  { name: "Chol HaMoed Pesach", he: "חול המועד פסח", greeting: "Moadim LeSimcha", kind: "chol" },
  4:  { name: "Erev Shavuot", he: "ערב שבועות", greeting: "Chag Sameach", kind: "erev" },
  5:  { name: "Shavuot", he: "שבועות", greeting: "Chag Sameach", kind: "yomtov" },
  6:  { name: "Fast of 17 Tammuz", he: "שבעה עשר בתמוז", greeting: "Tzom Kal", kind: "fast" },
  7:  { name: "Tisha B'Av", he: "תשעה באב", greeting: "", kind: "fast" },
  9:  { name: "Erev Rosh Hashana", he: "ערב ראש השנה", greeting: "Shana Tova", kind: "erev" },
  10: { name: "Rosh Hashana", he: "ראש השנה", greeting: "Shana Tova U'Metuka", kind: "yomtov" },
  11: { name: "Fast of Gedaliah", he: "צום גדליה", greeting: "Tzom Kal", kind: "fast" },
  12: { name: "Erev Yom Kippur", he: "ערב יום כיפור", greeting: "G'mar Chatima Tova", kind: "erev" },
  13: { name: "Yom Kippur", he: "יום כיפור", greeting: "G'mar Chatima Tova", kind: "yomtov" },
  14: { name: "Erev Sukkot", he: "ערב סוכות", greeting: "Chag Sameach", kind: "erev" },
  15: { name: "Sukkot", he: "סוכות", greeting: "Chag Sameach", kind: "yomtov" },
  16: { name: "Chol HaMoed Sukkot", he: "חול המועד סוכות", greeting: "Moadim LeSimcha", kind: "chol" },
  17: { name: "Hoshana Rabba", he: "הושענא רבה", greeting: "Chag Sameach", kind: "chol" },
  18: { name: "Shemini Atzeret", he: "שמיני עצרת", greeting: "Chag Sameach", kind: "yomtov" },
  19: { name: "Simchat Torah", he: "שמחת תורה", greeting: "Chag Sameach", kind: "yomtov" },
  21: { name: "Chanukah", he: "חנוכה", greeting: "Chanukah Sameach", kind: "minor" },
  22: { name: "Fast of 10 Tevet", he: "עשרה בטבת", greeting: "Tzom Kal", kind: "fast" },
  23: { name: "Tu BiShvat", he: "ט״ו בשבט", greeting: "", kind: "minor" },
  24: { name: "Fast of Esther", he: "תענית אסתר", greeting: "Tzom Kal", kind: "fast" },
  25: { name: "Purim", he: "פורים", greeting: "Purim Sameach", kind: "minor" },
  26: { name: "Shushan Purim", he: "שושן פורים", greeting: "Purim Sameach", kind: "minor" },
  33: { name: "Lag BaOmer", he: "ל״ג בעומר", greeting: "", kind: "minor" },
};

function dayInfo(cal) {
  let h = HOLIDAYS[cal.getYomTovIndex()] || null;
  if (cal.isChanukah() && cal.getDayOfChanukah() > 0) {
    const n = cal.getDayOfChanukah();
    h = { ...HOLIDAYS[21], name: `Chanukah · Day ${n}`, he: `חנוכה · נר ${["", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ז׳", "ח׳"][n]}` };
  }
  if (!h && cal.isRoshChodesh()) {
    const m = cal.formatJewishMonth();
    h = { name: `Rosh Chodesh ${m.en}`, he: `ראש חודש ${m.he}`, greeting: "Chodesh Tov", kind: "minor" };
  }
  return {
    holiday: h,
    isShabbat: cal.getDayOfWeek() == 7,
    assur: cal.isAssurBemelacha(),
    yomTov: cal.isYomTovAssurBemelacha(),
  };
}

const DAYS_AHEAD = 8;
let makamObjPromise = null;
let hiloulahPromise = null;

function safe(label, fn, fallback) {
  try { return fn(); } catch (e) { console.warn("[tv-bridge]", label, e); return fallback; }
}

function epochOf(value) {
  if (!value) return null;
  const zdt = value instanceof Temporal.ZonedDateTime ? value : zDTFromFunc(value);
  return zdt ? zdt.epochMilliseconds : null;
}

function roundUpMinute(zdt) {
  return zdt.second > 20 ? zdt.add({ minutes: 1 }).with({ second: 0 }) : zdt;
}

function zmanimForDate(zmanCalc, plainDate) {
  const calc = zmanCalc.chainDate(plainDate);
  const out = {};
  for (const z of ZMANIM) {
    out[z.id] = safe(z.id, () => epochOf(calc[z.getter]()), null);
  }
  return out;
}

async function calculate() {
  const now = getCurrentZDT();
  const jCal = getJCal();
  const zmanCalc = getZmanCalc();
  const today = now.toPlainDate();

  // Zmanim for today and the next week, keyed by ISO date
  const days = {};
  const calendar = {};
  const dayCal = jCal.clone();
  dayCal.back();
  for (let i = -1; i < DAYS_AHEAD; i++) {
    const d = today.add({ days: i });
    days[d.toString()] = zmanimForDate(zmanCalc, d);
    calendar[d.toString()] = safe("dayInfo", () => dayInfo(dayCal), null);
    dayCal.forward(5, 1);
  }

  const hebrewDate = safe("hebrewDate", () => ({
    hebrew: (jCal.getDayOfWeek() == 7 ? "שבת" : n2wordsOrdinal[jCal.getDayOfWeek()]) + ", " + jCal.formatJewishFullDate().hebrew,
    english: jCal.formatJewishFullDate().english || "",
    civil: (jCal.getDayOfTheWeek().en + ", " + jCal.dateRenderer("en").primary.text).replace(/<[^>]+>/g, ""),
  }), { hebrew: "", english: "", civil: "" });

  const specialDays = safe("specialDays", () => jCal.listOfSpecialDays(), []);

  // Upcoming Shabbat / Yom Tov: parasha, candle lighting, havdalah
  let parasha = "", candleLighting = null, havdalah = null, rabbeinuTam = null, melakhaJCal = null;
  safe("shabbat", () => {
    melakhaJCal = jCal.shabbat();
    for (const loop = jCal.clone(); !loop.getDate().equals(melakhaJCal.getDate()); loop.forward(5, 1)) {
      if (loop.isAssurBemelacha()) { melakhaJCal = loop.clone(); break; }
    }
    parasha = melakhaJCal.isYomTovAssurBemelacha() ? "" :
      jCal.getHebrewParasha().filter((p) => p && !/No Parasha/i.test(p)).join(" · ");

    const erev = melakhaJCal.clone();
    erev.back();
    const candleGetter = (erev.getDayOfWeek() == 6 || !erev.isAssurBemelacha())
      ? "getCandleLighting"
      : erev.getDayOfWeek() == 7 ? "getTzetMelakha" : "getTzetHumra";
    candleLighting = epochOf(zmanCalc.chainDate(erev.getDate())[candleGetter]());

    const tzet = melakhaJCal.clone();
    do { tzet.forward(5, 1); } while (tzet.isAssurBemelacha());
    tzet.back(); tzet.back(); tzet.forward(5, 1);
    const end = zmanCalc.chainDate(tzet.getDate());
    havdalah = roundUpMinute(zDTFromFunc(end.getTzetMelakha())).epochMilliseconds;
    rabbeinuTam = roundUpMinute(end.getTzetRT()).epochMilliseconds;
  });

  // The coming Shabbat or Yom Tov as one period: first day, last day, and what to call it.
  let melakha = null;
  safe("melakha", () => {
    if (!melakhaJCal) return;
    const first = melakhaJCal.clone();
    const last = melakhaJCal.clone();
    for (;;) { const nx = last.clone(); nx.forward(5, 1); if (!nx.isAssurBemelacha()) break; last.forward(5, 1); }
    const days = [];
    for (const c = first.clone(); ; c.forward(5, 1)) { days.push(dayInfo(c)); if (c.getDate().equals(last.getDate())) break; }
    const yt = days.find((d) => d.yomTov && d.holiday);
    const hasShabbat = days.some((d) => d.isShabbat);
    const chol = !yt && hasShabbat ? days[0].holiday : null;
    melakha = {
      start: first.getDate().toString(),
      end: last.getDate().toString(),
      isYomTov: !!yt,
      title: yt ? yt.holiday.name : chol?.kind === "chol" ? "Shabbat Chol HaMoed" : "Shabbat",
      titleHe: yt ? yt.holiday.he : "שבת",
      greeting: yt ? yt.holiday.greeting : "Shabbat Shalom",
      greetingHe: yt ? "חג שמח" : "שבת שלום",
      endLabel: yt ? (hasShabbat ? "Shabbat & Yom Tov end" : "Yom Tov ends") : "Shabbat ends",
      hasShabbat,
    };
    if (yt && [10, 13].includes(first.getYomTovIndex())) melakha.greetingHe = first.getYomTovIndex() === 13 ? "גמר חתימה טובה" : "שנה טובה";
  });

  let makam = "";
  if (melakhaJCal) {
    try {
      makamObjPromise ??= fetch("/assets/js/makamObj.json").then(r => r.json());
      const makamObj = await makamObjPromise;
      const result = new Makam(makamObj.sefarimList).getTodayMakam(melakhaJCal);
      if (result?.makam) {
        makam = result.makam.map(m => (typeof m === "number" ? makamObj.makamNameMapEng[m] : m)).join(" / ");
      }
    } catch (e) { console.warn("[tv-bridge] makam", e); }
  }

  const learning = safe("limudim", () => jCal.getAllLearning(), {});
  const limudim = [
    { id: "daf", study: "Daf Yomi", ref: learning.dafBavli || "" },
    { id: "yerushalmi", study: "Yerushalmi", ref: learning.DafYerushalmi || "" },
    { id: "tehillimMonthly", study: "Tehillim (Monthly)", ref: learning.TehilimHodshi || "" },
    { id: "tehillimWeekly", study: "Tehillim (Weekly)", ref: learning.TehilimShvui || "" },
  ].filter(l => l.ref);

  let hiloulot = [];
  try {
    hiloulahPromise ??= (async () => { const h = new HiloulahYomiCalculator(); await h.init(); return h; })();
    const h = await hiloulahPromise;
    const data = h.getHiloulah(jCal);
    hiloulot = (data?.en || []).map(x => x.name);
  } catch (e) { console.warn("[tv-bridge] hiloulot", e); }

  window.__TV_ZMANIM__ = {
    ready: true,
    calculatedAt: Date.now(),
    today: today.toString(),
    timezone: scheduleSettings.location.timezone,
    location: scheduleSettings.location.name,
    zmanimList: ZMANIM.map(({ id, label, he }) => ({ id, label, he })),
    days,
    hebrewDate,
    specialDays,
    parasha,
    shabbatDate: melakhaJCal ? melakhaJCal.getDate().toString() : null,
    melakha,
    calendar,
    candleLighting,
    havdalah,
    rabbeinuTam,
    makam,
    limudim,
    hiloulot,
  };
  window.dispatchEvent(new CustomEvent("tv-zmanim-ready", { detail: window.__TV_ZMANIM__ }));
}

let lastDate = null;
function tick() {
  const date = getCurrentZDT().toPlainDate().toString();
  // Recompute when the civil date changes, and every 15 minutes as a safety net
  if (date !== lastDate || Date.now() - (window.__TV_ZMANIM__?.calculatedAt || 0) > 15 * 60_000) {
    lastDate = date;
    calculate().catch(e => console.error("[tv-bridge] calculation failed", e));
  }
}

tick();
setInterval(tick, 30_000);
