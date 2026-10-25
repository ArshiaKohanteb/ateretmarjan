// Theme presets for the TV. Flat colour only: one ground, one field (the
// left half and the slides), one ink, one accent for "next".
// "auto" switches between a day and a night preset at sunrise/sunset.

export const THEMES = {
  royal: {
    name: "Royal",
    blurb: "Logo blue beside deep navy",
    dark: true,
    vars: {
      "--ground": "#0A1A3A",
      "--ground-2": "#06122B",
      "--field": "#0B4EA2",
      "--field-2": "#0A4590",
      "--field-ink": "#FFFFFF",
      "--field-muted": "rgba(255, 255, 255, 0.70)",
      "--ink": "#F4F6FA",
      "--muted": "rgba(228, 234, 245, 0.56)",
      "--accent": "#FFFFFF",
      "--accent-ink": "#0A1A3A",
      "--confetti": "#FFFFFF,#7FB2FF,#E9C46A,#0B4EA2",
    },
  },
  ivory: {
    name: "Ivory",
    blurb: "Logo blue beside warm white",
    dark: false,
    vars: {
      "--ground": "#F5F3EE",
      "--ground-2": "#E9E5DC",
      "--field": "#0B4EA2",
      "--field-2": "#0A4590",
      "--field-ink": "#FFFFFF",
      "--field-muted": "rgba(255, 255, 255, 0.74)",
      "--ink": "#0A1F44",
      "--muted": "rgba(10, 31, 68, 0.50)",
      "--accent": "#0B4EA2",
      "--accent-ink": "#FFFFFF",
      "--confetti": "#FFFFFF,#7FB2FF,#E9C46A,#0A1F44",
    },
  },
  midnight: {
    name: "Midnight",
    blurb: "Quiet, almost black, electric blue",
    dark: true,
    vars: {
      "--ground": "#0B0F17",
      "--ground-2": "#05070C",
      "--field": "#141C2E",
      "--field-2": "#101727",
      "--field-ink": "#FFFFFF",
      "--field-muted": "rgba(255, 255, 255, 0.62)",
      "--ink": "#EEF2F8",
      "--muted": "rgba(220, 228, 242, 0.50)",
      "--accent": "#3D7BFF",
      "--accent-ink": "#FFFFFF",
      "--confetti": "#3D7BFF,#FFFFFF,#9CC0FF,#E9C46A",
    },
  },
  stone: {
    name: "Jerusalem Stone",
    blurb: "Limestone with navy lettering",
    dark: false,
    vars: {
      "--ground": "#ECE6DA",
      "--ground-2": "#E0D7C6",
      "--field": "#1E3A6E",
      "--field-2": "#1A3360",
      "--field-ink": "#F6F1E7",
      "--field-muted": "rgba(246, 241, 231, 0.70)",
      "--ink": "#1B2742",
      "--muted": "rgba(27, 39, 66, 0.52)",
      "--accent": "#1E3A6E",
      "--accent-ink": "#F6F1E7",
      "--confetti": "#F6F1E7,#C8A55A,#7FA2D9,#1E3A6E",
    },
  },
  gold: {
    name: "Shabbat Gold",
    blurb: "Midnight navy with warm gold",
    dark: true,
    vars: {
      "--ground": "#0C1A33",
      "--ground-2": "#081428",
      "--field": "#13284F",
      "--field-2": "#102345",
      "--field-ink": "#F7F1E3",
      "--field-muted": "rgba(247, 241, 227, 0.66)",
      "--ink": "#F7F1E3",
      "--muted": "rgba(247, 241, 227, 0.52)",
      "--accent": "#D9B36C",
      "--accent-ink": "#0C1A33",
      "--confetti": "#D9B36C,#F7F1E3,#F2D49B,#7FA2D9",
    },
  },
};

export const THEME_OPTIONS = [
  ...Object.entries(THEMES).map(([id, t]) => ({ id, ...t })),
  { id: "auto", name: "Day & Night", blurb: "Ivory by day, Royal after sunset", dark: null },
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
