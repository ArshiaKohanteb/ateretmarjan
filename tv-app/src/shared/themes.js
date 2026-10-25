// Theme presets for the TV. Each one sets the ambient background (base colour,
// the Kotel photo and its tint, three drifting light orbs), the glass panels,
// the ink, and the gold "accent" used for what's next.
// "auto" switches between a day and a night preset at sunrise/sunset.

const KOTEL = 'url("/tv/kotel.jpg")';

export const THEMES = {
  royal: {
    name: "Royal Kotel",
    blurb: "Kotel stone under royal blue, gold highlights",
    dark: true,
    vars: {
      "--bg": "#050F28",
      "--photo": KOTEL,
      "--photo-opacity": "0.30",
      "--photo-filter": "grayscale(1) contrast(1.15) brightness(.9)",
      "--tint": "linear-gradient(160deg, rgba(8, 30, 84, .78) 0%, rgba(4, 12, 34, .92) 70%)",
      "--orb-a": "rgba(46, 110, 255, .55)",
      "--orb-b": "rgba(11, 78, 162, .70)",
      "--orb-c": "rgba(227, 190, 110, .22)",
      "--glass-1": "rgba(255, 255, 255, .13)",
      "--glass-2": "rgba(255, 255, 255, .035)",
      "--glass-border": "rgba(255, 255, 255, .20)",
      "--glass-solid": "rgba(18, 38, 86, .88)",
      "--ink": "#F6F8FD",
      "--muted": "rgba(222, 230, 248, .62)",
      "--acc-1": "#F7E2AE",
      "--acc-2": "#C99B47",
      "--acc-ink": "#0A1530",
      "--acc-glow": "rgba(233, 196, 116, .45)",
      "--confetti": "#F7E2AE,#C99B47,#FFFFFF,#6FA0FF",
    },
  },
  ivory: {
    name: "Ivory & Gold",
    blurb: "Bright, pearl-white glass with gold",
    dark: false,
    vars: {
      "--bg": "#F3EFE6",
      "--photo": KOTEL,
      "--photo-opacity": "0.42",
      "--photo-filter": "grayscale(.6) brightness(1.08) contrast(.9)",
      "--tint": "linear-gradient(160deg, rgba(250, 247, 240, .80) 0%, rgba(232, 238, 250, .86) 100%)",
      "--orb-a": "rgba(92, 146, 255, .30)",
      "--orb-b": "rgba(231, 196, 120, .32)",
      "--orb-c": "rgba(11, 78, 162, .16)",
      "--glass-1": "rgba(255, 255, 255, .72)",
      "--glass-2": "rgba(255, 255, 255, .40)",
      "--glass-border": "rgba(255, 255, 255, .85)",
      "--glass-solid": "rgba(255, 255, 255, .92)",
      "--ink": "#0A1F44",
      "--muted": "rgba(10, 31, 68, .54)",
      "--acc-1": "#0F5BC4",
      "--acc-2": "#0A3F8C",
      "--acc-ink": "#FFFFFF",
      "--acc-glow": "rgba(15, 91, 196, .32)",
      "--confetti": "#C99B47,#0B4EA2,#F7E2AE,#6FA0FF",
    },
  },
  midnight: {
    name: "Midnight Sapphire",
    blurb: "Deep black glass, electric blue light",
    dark: true,
    vars: {
      "--bg": "#02040A",
      "--photo": "none",
      "--photo-opacity": "0",
      "--photo-filter": "none",
      "--tint": "radial-gradient(120% 90% at 50% 0%, rgba(10, 28, 70, .5), rgba(2, 4, 10, .9))",
      "--orb-a": "rgba(30, 110, 255, .60)",
      "--orb-b": "rgba(0, 170, 255, .30)",
      "--orb-c": "rgba(40, 70, 200, .45)",
      "--glass-1": "rgba(150, 190, 255, .12)",
      "--glass-2": "rgba(150, 190, 255, .03)",
      "--glass-border": "rgba(160, 200, 255, .22)",
      "--glass-solid": "rgba(10, 20, 44, .9)",
      "--ink": "#EEF4FF",
      "--muted": "rgba(200, 216, 245, .58)",
      "--acc-1": "#9CD2FF",
      "--acc-2": "#3D7BFF",
      "--acc-ink": "#020A1E",
      "--acc-glow": "rgba(61, 123, 255, .55)",
      "--confetti": "#9CD2FF,#3D7BFF,#FFFFFF,#F7E2AE",
    },
  },
  stone: {
    name: "Jerusalem Gold",
    blurb: "Warm Kotel stone at golden hour",
    dark: true,
    vars: {
      "--bg": "#1C140A",
      "--photo": KOTEL,
      "--photo-opacity": "0.55",
      "--photo-filter": "sepia(.35) saturate(1.1) brightness(.85)",
      "--tint": "linear-gradient(170deg, rgba(40, 26, 10, .55) 0%, rgba(14, 10, 6, .86) 75%)",
      "--orb-a": "rgba(255, 190, 90, .32)",
      "--orb-b": "rgba(180, 110, 40, .40)",
      "--orb-c": "rgba(70, 110, 200, .22)",
      "--glass-1": "rgba(255, 240, 215, .13)",
      "--glass-2": "rgba(255, 240, 215, .035)",
      "--glass-border": "rgba(255, 236, 200, .22)",
      "--glass-solid": "rgba(44, 32, 18, .9)",
      "--ink": "#FBF4E6",
      "--muted": "rgba(250, 236, 210, .62)",
      "--acc-1": "#FBE3AC",
      "--acc-2": "#D29E43",
      "--acc-ink": "#21170A",
      "--acc-glow": "rgba(240, 190, 100, .45)",
      "--confetti": "#FBE3AC,#D29E43,#FFFFFF,#7FA2D9",
    },
  },
  gold: {
    name: "Shabbat Gold",
    blurb: "Midnight navy and candlelight",
    dark: true,
    vars: {
      "--bg": "#08122A",
      "--photo": KOTEL,
      "--photo-opacity": "0.16",
      "--photo-filter": "grayscale(1) brightness(.8)",
      "--tint": "linear-gradient(170deg, rgba(10, 22, 52, .82), rgba(6, 12, 30, .95))",
      "--orb-a": "rgba(240, 190, 100, .38)",
      "--orb-b": "rgba(30, 70, 160, .55)",
      "--orb-c": "rgba(255, 220, 150, .20)",
      "--glass-1": "rgba(255, 236, 200, .11)",
      "--glass-2": "rgba(255, 236, 200, .03)",
      "--glass-border": "rgba(255, 230, 180, .22)",
      "--glass-solid": "rgba(20, 32, 64, .9)",
      "--ink": "#FBF6EA",
      "--muted": "rgba(250, 238, 214, .60)",
      "--acc-1": "#F8E2A8",
      "--acc-2": "#CF9C42",
      "--acc-ink": "#0B1630",
      "--acc-glow": "rgba(235, 190, 100, .5)",
      "--confetti": "#F8E2A8,#CF9C42,#FFFFFF,#6FA0FF",
    },
  },
};

export const THEME_OPTIONS = [
  ...Object.entries(THEMES).map(([id, t]) => ({ id, ...t })),
  { id: "auto", name: "Day & Night", blurb: "Ivory by day, Royal Kotel after sunset", dark: null },
];

const LEGACY = { sapphire: "midnight" };

// Resolve "auto" (and the optional Shabbat theme) to a concrete preset.
export function resolveTheme(settings, { isNight, isShabbat } = {}) {
  const pick = (id) => LEGACY[id] || id;
  if (isShabbat && THEMES[pick(settings.shabbatTheme)]) return pick(settings.shabbatTheme);
  const id = pick(settings.theme || "royal");
  if (id === "auto") return isNight ? "royal" : "ivory";
  return THEMES[id] ? id : "royal";
}
