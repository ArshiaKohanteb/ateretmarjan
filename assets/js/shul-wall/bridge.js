// ═══════════════════════════════════════════════════════════════
// bridge.js — Connects royzmanim's KosherZmanim engine to our React UI
// Place this file at: assets/js/shul-wall/bridge.js
// ═══════════════════════════════════════════════════════════════
//
// This module imports the same base.js that all other shul-wall
// scripts use, runs the same calculations, and exposes the results
// on window.__SHUL_DATA__ for the React UI to consume.
//
// It replaces the DOM-manipulation approach of times.js, parasha.js,
// limud.js, and date-and-time.js with a data-first approach.
// ═══════════════════════════════════════════════════════════════

import * as KosherZmanim from "../../libraries/kosherZmanim/kosher-zmanim.js";
import { Temporal } from "../../libraries/kosherZmanim/kosher-zmanim.js";
import { zDTFromFunc, methodNames } from "../ROYZmanim.js";
import WebsiteLimudCalendar from "../WebsiteLimudCalendar.js";
import { scheduleSettings, geoLocation, currentZDT, jCal, zmanCalc, dtF } from "./base.js";
import n2wordsOrdinal from "../misc/n2wordsOrdinal.js";

// ─── 1. HEBREW DATE ───
const hebrewDate = {
  dayOfWeek: jCal.getDayOfWeek(),
  dayOfWeekEN: jCal.getDayOfTheWeek().en,
  englishDate: jCal.dateRenderer('en').primary.text,
  hebrewDateFormatted: (jCal.getDayOfWeek() == 7 ? "שבת" : n2wordsOrdinal[jCal.getDayOfWeek()])
    + ", " + jCal.formatJewishFullDate().hebrew,
  fullEnglishDate: jCal.getDayOfTheWeek().en + ", " + jCal.dateRenderer('en').primary.text,
};

// ─── 2. PARASHA & CANDLE LIGHTING ───
let melakhaJCal = jCal.shabbat();
for (const loopJCal = jCal.clone(); !loopJCal.getDate().equals(melakhaJCal.getDate()); loopJCal.forward(5, 1)) {
  if (loopJCal.isAssurBemelacha()) {
    melakhaJCal = loopJCal.clone();
    break;
  }
}

const parashaName = jCal.getHebrewParasha().join(" / ")
  + (melakhaJCal.isChanukah() ? " (חנוכה)" : "");

// Candle lighting time
const jCalErev = melakhaJCal.clone();
jCalErev.back();
const candleLightingZDT = zDTFromFunc(
  zmanCalc.chainDate(jCalErev.getDate())
    [((jCalErev.getDayOfWeek() == 6 || !jCalErev.isAssurBemelacha())
      ? 'getCandleLighting'
      : jCalErev.getDayOfWeek() == 7
        ? 'getTzetMelakha'
        : 'getTzetHumra')]()
);
const candleLightingTime = candleLightingZDT.toLocaleString(...dtF);

// Havdalah / Tzet
const tzet = melakhaJCal.clone();
do { tzet.forward(5, 1); } while (tzet.isAssurBemelacha());
tzet.back();
tzet.back();
const rabbinic = tzet.getDayOfWeek() !== 6 && tzet.isErevYomTovSheni();
tzet.forward(5, 1);

let tzetIkar = zDTFromFunc(zmanCalc.chainDate(tzet.getDate()).getTzetMelakha());
let tzetRT = zmanCalc.chainDate(tzet.getDate()).getTzetRT();

if (tzetIkar.second > 20) tzetIkar = tzetIkar.add({ minutes: 1 }).with({ second: 0 });
if (tzetRT.second > 20) tzetRT = tzetRT.add({ minutes: 1 }).with({ second: 0 });

const havdalahTime = tzetIkar.toLocaleString(...dtF);
const rabbeinuTamTime = tzetRT.toLocaleString(...dtF);

// ─── 3. ZMANIM (all halachic times) ───
// We replicate what times.js does: loop through 3 days, find next-occurring times
const zmanimConfig = [
  { id: "alot", getter: "getAlotHashahar", label: "Dawn", round: "earlier" },
  { id: "earliestTefilin", getter: "getMisheyakir", label: "Misheyakir", round: "later" },
  { id: "sunrise", getter: "getNetz", label: "Sunrise", round: "later" },
  { id: "latestShmaMGA", getter: "getSofZemanShemaMGA", label: 'Shema MG"A', round: "earlier" },
  { id: "latestShmaGRA", getter: "getSofZemanShemaGRA", label: 'Shema GR"A', round: "earlier" },
  { id: "latestBrachotShmaGRA", getter: "getSofZemanBerakhothShema", label: "Latest Prayer", round: "earlier" },
  { id: "hatzoth", getter: "getHatzoth", label: "Midday", round: "earlier" },
  { id: "minhaGedola", getter: "getMinhaGedolah", label: "Early Mincha", round: "later" },
  { id: "plagHaminhaHB", getter: "getPlagHaminhaHalachaBrurah", label: "Plag Hamincha", round: "later" },
  { id: "sunset", getter: "getShkiya", label: "Sunset", round: "earlier" },
  { id: "tzeit", getter: "getTzet", label: "Nightfall", round: "later" },
  { id: "chatzotLayla", getter: "getSolarMidnight", label: "Midnight", round: "later" },
];

const computedZmanim = [];
const tempJCal = jCal.clone();
tempJCal.back();

const collectedIds = new Set();
for (let i = 0; i < 3; i++) {
  const calcForDay = zmanCalc.chainDate(tempJCal.getDate());
  for (const zConfig of zmanimConfig) {
    if (collectedIds.has(zConfig.id)) continue;
    try {
      const zdt = zDTFromFunc(calcForDay[zConfig.getter]());
      if (zdt && Temporal.ZonedDateTime.compare(zdt, currentZDT) === 1) {
        const isNextDay = Temporal.PlainDate.compare(zdt.toPlainDate(), currentZDT.toPlainDate()) === 1;
        computedZmanim.push({
          id: zConfig.id,
          label: zConfig.label,
          time: zdt.toLocaleString(...dtF),
          isNextDay,
          epochMs: zdt.epochMilliseconds,
        });
        collectedIds.add(zConfig.id);
      }
    } catch (e) {
      // Some zmanim may not apply today (e.g., chametz times outside Pesach)
    }
  }
  tempJCal.forward(5, 1);
}
tempJCal.setDate(currentZDT.toPlainDate());

// Sort by time
computedZmanim.sort((a, b) => a.epochMs - b.epochMs);

// ─── 4. LIMUDIM (daily learning) ───
const allLearning = jCal.getAllLearning();
const computedLimudim = [
  { study: "Babylonian Talmud", ref: allLearning.dafBavli || "" },
  { study: "Yerushalmi (Vilna)", ref: allLearning.DafYerushalmi || "" },
  { study: "Psalms (Monthly)", ref: allLearning.TehilimHodshi || "" },
  { study: "Psalms (Weekly)", ref: allLearning.TehilimShvui || "" },
];

// ─── 5. HILOULOT ───
const hiloulahIndex = new KosherZmanim.HiloulahYomiCalculator();
await hiloulahIndex.init();
const hiloulahData = hiloulahIndex.getHiloulah(jCal);
const computedHiloulot = hiloulahData.en.map(h => ({ name: h.name }));

// ─── 6. MAKAM ───
let computedMakam = "";
try {
  const makamObj = await (await fetch("/assets/js/makamObj.json")).json();
  const makamIndex = new KosherZmanim.Makam(makamObj.sefarimList);
  const makam = makamIndex.getTodayMakam(melakhaJCal);
  computedMakam = "Makam " + makam.makam
    .map(mak => (typeof mak === "number" ? makamObj.makamNameMapEng[mak] : mak))
    .join(" / ");
} catch (e) {
  computedMakam = "";
}

// ─── 7. EXPOSE EVERYTHING ───
window.__SHUL_DATA__ = {
  ready: true,
  location: scheduleSettings.location,
  timezone: scheduleSettings.location.timezone,

  hebrewDate,
  parasha: parashaName,
  candleLighting: candleLightingTime,
  havdalah: havdalahTime,
  rabbeinuTam: rabbeinuTamTime,
  makam: computedMakam,

  zmanim: computedZmanim,
  limudim: computedLimudim,
  hiloulot: computedHiloulot,
};

// Dispatch event so React knows data is ready
window.dispatchEvent(new CustomEvent("shul-data-ready", {
  detail: window.__SHUL_DATA__
}));

console.log("[bridge.js] Shul data ready:", window.__SHUL_DATA__);
