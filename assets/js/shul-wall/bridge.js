// ═══════════════════════════════════════════════════════════════
// bridge.js — Connects royzmanim's KosherZmanim engine to our React UI
// ═══════════════════════════════════════════════════════════════

import { Temporal } from "../../libraries/kosherZmanim/kosher-zmanim.js";
import { Makam } from "../../libraries/kosherZmanim/kosher-zmanim.js";
import { HiloulahYomiCalculator } from "../../libraries/kosherZmanim/kosher-zmanim.js";
import { zDTFromFunc } from "../ROYZmanim.js";
import { scheduleSettings, getCurrentZDT, getJCal, getZmanCalc, dtF } from "./base.js";
import n2wordsOrdinal from "../misc/n2wordsOrdinal.js";

// ─── MAIN CALCULATION FUNCTION ───
async function calculate() {
  console.log("[bridge.js] calculate() started at", new Date().toLocaleTimeString());

  // ── Base objects ──
  let currentZDT, jCal, zmanCalc;
  try {
    currentZDT = getCurrentZDT();
    jCal       = getJCal();
    zmanCalc   = getZmanCalc();
    console.log("[bridge.js] ✅ base objects ready | date:", currentZDT.toPlainDate().toString());
  } catch (e) {
    console.error("[bridge.js] ❌ FATAL: base object creation failed:", e);
    return;
  }

  // ── 1. Hebrew date ──
  let hebrewDate = { dayOfWeek: 0, dayOfWeekEN: "", englishDate: "", hebrewDateFormatted: "", fullEnglishDate: "" };
  try {
    hebrewDate = {
      dayOfWeek:           jCal.getDayOfWeek(),
      dayOfWeekEN:         jCal.getDayOfTheWeek().en,
      englishDate:         jCal.dateRenderer('en').primary.text,
      hebrewDateFormatted: (jCal.getDayOfWeek() == 7 ? "שבת" : n2wordsOrdinal[jCal.getDayOfWeek()])
                             + ", " + jCal.formatJewishFullDate().hebrew,
      fullEnglishDate:     jCal.getDayOfTheWeek().en + ", " + jCal.dateRenderer('en').primary.text,
    };
    console.log("[bridge.js] ✅ hebrewDate:", hebrewDate.fullEnglishDate);
  } catch (e) {
    console.error("[bridge.js] ❌ hebrewDate failed:", e);
  }

  // ── 2. Parasha & candle lighting ──
  let parashaName = "", candleLightingTime = "", havdalahTime = "", rabbeinuTamTime = "";
  let melakhaJCal = null;
  try {
    melakhaJCal = jCal.shabbat();
    for (const loopJCal = jCal.clone(); !loopJCal.getDate().equals(melakhaJCal.getDate()); loopJCal.forward(5, 1)) {
      if (loopJCal.isAssurBemelacha()) { melakhaJCal = loopJCal.clone(); break; }
    }

    parashaName = jCal.getHebrewParasha().join(" / ")
      + (melakhaJCal.isChanukah() ? " (חנוכה)" : "");

    const jCalErev = melakhaJCal.clone();
    jCalErev.back();
    const candleLightingZDT = zDTFromFunc(
      zmanCalc.chainDate(jCalErev.getDate())
        [((jCalErev.getDayOfWeek() == 6 || !jCalErev.isAssurBemelacha())
          ? 'getCandleLighting'
          : jCalErev.getDayOfWeek() == 7 ? 'getTzetMelakha' : 'getTzetHumra')]()
    );
    candleLightingTime = candleLightingZDT.toLocaleString(...dtF);

    const tzet = melakhaJCal.clone();
    do { tzet.forward(5, 1); } while (tzet.isAssurBemelacha());
    tzet.back(); tzet.back(); tzet.forward(5, 1);

    let tzetIkar = zDTFromFunc(zmanCalc.chainDate(tzet.getDate()).getTzetMelakha());
    let tzetRT   = zmanCalc.chainDate(tzet.getDate()).getTzetRT();
    if (tzetIkar.second > 20) tzetIkar = tzetIkar.add({ minutes: 1 }).with({ second: 0 });
    if (tzetRT.second    > 20) tzetRT   = tzetRT.add({ minutes: 1 }).with({ second: 0 });

    havdalahTime    = tzetIkar.toLocaleString(...dtF);
    rabbeinuTamTime = tzetRT.toLocaleString(...dtF);
    console.log("[bridge.js] ✅ parasha:", parashaName, "| candles:", candleLightingTime, "| havdalah:", havdalahTime);
  } catch (e) {
    console.error("[bridge.js] ❌ parasha/candles/havdalah failed:", e);
  }

  // ── 2b. Makam ──
  let computedMakam = "";
  try {
    if (melakhaJCal) {
      const makamObj = await (await fetch("/assets/js/makamObj.json")).json();
      const makamIndex = new Makam(makamObj.sefarimList);
      const makamResult = makamIndex.getTodayMakam(melakhaJCal);
      if (makamResult && makamResult.makam) {
        computedMakam = "Makam " + makamResult.makam
          .map(mak => (typeof mak === "number" ? makamObj.makamNameMapEng[mak] : mak))
          .join(" / ");
      }
      console.log("[bridge.js] ✅ makam:", computedMakam);
    }
  } catch (e) {
    console.error("[bridge.js] ❌ makam failed:", e);
  }

  // ── 3. Zmanim ──
  const zmanimConfig = [
    { id: "alot",                 getter: "getAlotHashahar",             label: "Dawn"           },
    { id: "earliestTefilin",      getter: "getMisheyakir",               label: "Misheyakir"     },
    { id: "sunrise",              getter: "getNetz",                     label: "Sunrise"        },
    { id: "latestShmaMGA",        getter: "getSofZemanShemaMGA",         label: 'Shema MG"A'     },
    { id: "latestShmaGRA",        getter: "getSofZemanShemaGRA",         label: 'Shema GR"A'     },
    { id: "latestBrachotShmaGRA", getter: "getSofZemanBerakhothShema",   label: "Latest Prayer"  },
    { id: "hatzoth",              getter: "getHatzoth",                  label: "Midday"         },
    { id: "minhaGedola",          getter: "getMinhaGedolah",             label: "Early Mincha"   },
    { id: "plagHaminhaHB",        getter: "getPlagHaminhaHalachaBrurah", label: "Plag Hamincha"  },
    { id: "sunset",               getter: "getShkiya",                   label: "Sunset"         },
    { id: "tzeit",                getter: "getTzet",                     label: "Nightfall"      },
    { id: "chatzotLayla",         getter: "getSolarMidnight",            label: "Midnight"       },
  ];

  const computedZmanim = [];
  const collectedIds   = new Set();
  try {
    const tempJCal = jCal.clone();
    tempJCal.back();
    for (let i = 0; i < 3; i++) {
      const calcForDay = zmanCalc.chainDate(tempJCal.getDate());
      for (const zConfig of zmanimConfig) {
        if (collectedIds.has(zConfig.id)) continue;
        try {
          const zdt = zDTFromFunc(calcForDay[zConfig.getter]());
          if (zdt && Temporal.ZonedDateTime.compare(zdt, currentZDT) === 1) {
            computedZmanim.push({
              id:       zConfig.id,
              label:    zConfig.label,
              time:     zdt.toLocaleString(...dtF),
              isNextDay: Temporal.PlainDate.compare(zdt.toPlainDate(), currentZDT.toPlainDate()) === 1,
              epochMs:  zdt.epochMilliseconds,
            });
            collectedIds.add(zConfig.id);
          }
        } catch (e) {
          console.warn("[bridge.js] ⚠️ zman", zConfig.id, "skipped:", e.message);
        }
      }
      tempJCal.forward(5, 1);
    }
    computedZmanim.sort((a, b) => a.epochMs - b.epochMs);
    console.log("[bridge.js] ✅ zmanim:", computedZmanim.length, "upcoming | first:", computedZmanim[0]?.label, computedZmanim[0]?.time);
  } catch (e) {
    console.error("[bridge.js] ❌ zmanim loop failed:", e);
  }

  // ── 4. Limudim ──
  let computedLimudim = [];
  try {
    const allLearning = jCal.getAllLearning();
    computedLimudim = [
      { study: "Babylonian Talmud",  ref: allLearning.dafBavli      || "" },
      { study: "Yerushalmi (Vilna)", ref: allLearning.DafYerushalmi || "" },
      { study: "Tehillim (Monthly)", ref: allLearning.TehilimHodshi || "" },
      { study: "Tehillim (Weekly)",  ref: allLearning.TehilimShvui  || "" },
    ];
    console.log("[bridge.js] ✅ limudim computed");
  } catch (e) {
    console.error("[bridge.js] ❌ limudim failed:", e);
  }

  // ── 4b. Hiloulot ──
  let computedHiloulot = [];
  try {
    const hiloulahIndex = new HiloulahYomiCalculator();
    await hiloulahIndex.init();
    const hiloulahData = hiloulahIndex.getHiloulah(jCal);
    if (hiloulahData && hiloulahData.en && hiloulahData.en.length > 0) {
      computedHiloulot = hiloulahData.en.map(h => ({ name: h.name }));
    }
    console.log("[bridge.js] ✅ hiloulot:", computedHiloulot.length, "entries");
  } catch (e) {
    console.error("[bridge.js] ❌ hiloulot failed:", e);
  }

  // ── 5. Expose & dispatch ──
  window.__SHUL_DATA__ = {
    ready:          true,
    calculatedAt:   Date.now(),
    zmanimEnabled:  true,
    location:       scheduleSettings.location,
    timezone:       scheduleSettings.location.timezone,
    hebrewDate,
    parasha:        parashaName,
    candleLighting: candleLightingTime,
    havdalah:       havdalahTime,
    rabbeinuTam:    rabbeinuTamTime,
    zmanim:         computedZmanim,
    limudim:        computedLimudim,
    hiloulot:       computedHiloulot,
    makam:          computedMakam,
  };

  window.dispatchEvent(new CustomEvent("shul-data-ready", { detail: window.__SHUL_DATA__ }));
  console.log("[bridge.js] ✅ __SHUL_DATA__ dispatched at", new Date().toLocaleTimeString());
}

// ─── INIT ───
calculate().catch(e => console.error("[bridge.js] Initial calculation failed:", e));
setInterval(() => {
  calculate().catch(e => console.error("[bridge.js] Recalculation failed:", e));
}, 60_000);