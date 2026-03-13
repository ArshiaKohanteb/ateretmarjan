// ═══════════════════════════════════════════════════════════════
// bridge.js — Connects royzmanim's KosherZmanim engine to our React UI
// ═══════════════════════════════════════════════════════════════

import { Temporal } from "../../libraries/kosherZmanim/kosher-zmanim.js";
import { zDTFromFunc } from "../ROYZmanim.js";
import { scheduleSettings, getCurrentZDT, getJCal, getZmanCalc, dtF } from "./base.js";
import n2wordsOrdinal from "../misc/n2wordsOrdinal.js";

// ─── STORAGE KEYS ───
const STORAGE_KEY_ZOOM           = "shul-wall-zoom";
const STORAGE_KEY_ZMANIM_ENABLED = "shul-wall-zmanim-enabled";

// ─── STATE ───
let zmanimEnabled = localStorage.getItem(STORAGE_KEY_ZMANIM_ENABLED) !== "false";
let zoomLevel     = parseFloat(localStorage.getItem(STORAGE_KEY_ZOOM) || "1");

// Apply zoom immediately on load
applyZoom(zoomLevel);

// ─── ZOOM HELPER ───
function applyZoom(level) {
  document.documentElement.style.zoom = level;
  localStorage.setItem(STORAGE_KEY_ZOOM, String(level));
}

// ─── INJECT ADMIN CONTROLS ───
function injectAdminControls() {
  if (document.getElementById("shul-admin-panel")) return;

  const panel = document.createElement("div");
  panel.id = "shul-admin-panel";
  panel.innerHTML = `
    <style>
      #shul-admin-toggle {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 9999;
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
      }
      #shul-admin-drawer {
        position: fixed;
        bottom: 68px;
        right: 16px;
        z-index: 9998;
        background: rgba(10,10,20,0.92);
        color: white;
        border-radius: 12px;
        padding: 20px 24px;
        min-width: 260px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        backdrop-filter: blur(8px);
        font-family: system-ui, sans-serif;
        font-size: 14px;
        display: none;
        flex-direction: column;
        gap: 18px;
      }
      #shul-admin-drawer.open { display: flex; }
      #shul-admin-drawer h3 {
        margin: 0 0 2px;
        font-size: 15px;
        font-weight: 600;
        color: #a0c4ff;
        letter-spacing: 0.03em;
      }
      .shul-admin-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .shul-admin-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: #ccc;
      }
      #shul-zoom-slider {
        width: 100%;
        accent-color: #a0c4ff;
        cursor: pointer;
      }
      #shul-zoom-value {
        font-size: 12px;
        color: #a0c4ff;
        font-weight: 600;
        min-width: 38px;
        text-align: right;
      }
      .shul-toggle-wrap {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }
      .shul-toggle-wrap input { opacity: 0; width: 0; height: 0; position: absolute; }
      .shul-toggle-track {
        position: absolute;
        inset: 0;
        background: #444;
        border-radius: 24px;
        transition: background 0.2s;
        cursor: pointer;
      }
      .shul-toggle-track::before {
        content: "";
        position: absolute;
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s;
      }
      .shul-toggle-wrap input:checked + .shul-toggle-track { background: #4a9eff; }
      .shul-toggle-wrap input:checked + .shul-toggle-track::before { transform: translateX(20px); }
    </style>

    <button id="shul-admin-toggle" title="Display Settings">⚙️</button>

    <div id="shul-admin-drawer">
      <h3>Display Settings</h3>

      <div class="shul-admin-row">
        <div class="shul-admin-label">
          <span>Screen Zoom</span>
          <span id="shul-zoom-value">${Math.round(zoomLevel * 100)}%</span>
        </div>
        <input
          type="range"
          id="shul-zoom-slider"
          min="0.5"
          max="2"
          step="0.05"
          value="${zoomLevel}"
        />
      </div>

      <div class="shul-admin-row">
        <div class="shul-admin-label">
          <span>Show Zmanim</span>
          <label class="shul-toggle-wrap">
            <input type="checkbox" id="shul-zmanim-checkbox" ${zmanimEnabled ? "checked" : ""} />
            <span class="shul-toggle-track"></span>
          </label>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("shul-admin-toggle").addEventListener("click", () => {
    document.getElementById("shul-admin-drawer").classList.toggle("open");
  });

  document.getElementById("shul-zoom-slider").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    zoomLevel = val;
    applyZoom(val);
    document.getElementById("shul-zoom-value").textContent = Math.round(val * 100) + "%";
  });

  document.getElementById("shul-zmanim-checkbox").addEventListener("change", (e) => {
    zmanimEnabled = e.target.checked;
    localStorage.setItem(STORAGE_KEY_ZMANIM_ENABLED, String(zmanimEnabled));
    if (window.__SHUL_DATA__) {
      window.__SHUL_DATA__.zmanimEnabled = zmanimEnabled;
      window.dispatchEvent(new CustomEvent("shul-data-ready", { detail: window.__SHUL_DATA__ }));
    }
  });
}

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
  try {
    let melakhaJCal = jCal.shabbat();
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
      { study: "Psalms (Monthly)",   ref: allLearning.TehilimHodshi || "" },
      { study: "Psalms (Weekly)",    ref: allLearning.TehilimShvui  || "" },
    ];
    console.log("[bridge.js] ✅ limudim computed");
  } catch (e) {
    console.error("[bridge.js] ❌ limudim failed:", e);
  }

  // ── 5. Expose & dispatch ──
  window.__SHUL_DATA__ = {
    ready:          true,
    calculatedAt:   Date.now(),
    zmanimEnabled,
    location:       scheduleSettings.location,
    timezone:       scheduleSettings.location.timezone,
    hebrewDate,
    parasha:        parashaName,
    candleLighting: candleLightingTime,
    havdalah:       havdalahTime,
    rabbeinuTam:    rabbeinuTamTime,
    zmanim:         computedZmanim,
    limudim:        computedLimudim,
    hiloulot:       [],  // removed — was causing fatal 404 crash
    makam:          "",  // removed — was causing fatal 404 crash
  };

  window.dispatchEvent(new CustomEvent("shul-data-ready", { detail: window.__SHUL_DATA__ }));
  console.log("[bridge.js] ✅ __SHUL_DATA__ dispatched at", new Date().toLocaleTimeString());
}

// ─── INIT ───
injectAdminControls();
calculate().catch(e => console.error("[bridge.js] Initial calculation failed:", e));
setInterval(() => {
  calculate().catch(e => console.error("[bridge.js] Recalculation failed:", e));
}, 60_000);