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
  for (let i = -1; i < DAYS_AHEAD; i++) {
    const d = today.add({ days: i });
    days[d.toString()] = zmanimForDate(zmanCalc, d);
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
    parasha = jCal.getHebrewParasha().join(" / ") + (melakhaJCal.isChanukah() ? " (חנוכה)" : "");

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
