// Theme presets for the TV. Each one is a set of CSS variables applied to
// the display stage. "auto" switches between a day and a night theme.

export const THEMES = {
  royal: {
    name: "Royal Night",
    blurb: "Deep navy, crisp white, soft blue glow",
    dark: true,
    vars: {
      "--bg": "#071530",
      "--bg-2": "#0C2B5E",
      "--glow": "rgba(72, 141, 255, 0.32)",
      "--surface": "rgba(255, 255, 255, 0.055)",
      "--surface-strong": "rgba(255, 255, 255, 0.10)",
      "--line": "rgba(255, 255, 255, 0.12)",
      "--text": "#F3F6FC",
      "--muted": "rgba(214, 226, 248, 0.62)",
      "--accent": "#7DB4FF",
      "--accent-ink": "#06142E",
      "--accent-glass": "#8DBBFF",
      "--crown": "#FFFFFF",
      "--crown-mark": "rgba(255, 255, 255, 0.035)",
    },
  },
  ivory: {
    name: "Ivory Crown",
    blurb: "Bright white with the logo's royal blue",
    dark: false,
    vars: {
      "--bg": "#F8F7F3",
      "--bg-2": "#E7EEF8",
      "--glow": "rgba(32, 98, 196, 0.14)",
      "--surface": "rgba(255, 255, 255, 0.72)",
      "--surface-strong": "#FFFFFF",
      "--line": "rgba(10, 37, 82, 0.10)",
      "--text": "#0A1F44",
      "--muted": "rgba(10, 31, 68, 0.56)",
      "--accent": "#0B4EA2",
      "--accent-ink": "#FFFFFF",
      "--accent-glass": "#8DBBFF",
      "--crown": "#0B4EA2",
      "--crown-mark": "rgba(11, 78, 162, 0.045)",
    },
  },
  sapphire: {
    name: "Sapphire",
    blurb: "Near-black with an electric blue edge",
    dark: true,
    vars: {
      "--bg": "#030712",
      "--bg-2": "#0A1636",
      "--glow": "rgba(56, 120, 255, 0.40)",
      "--surface": "rgba(120, 160, 255, 0.06)",
      "--surface-strong": "rgba(120, 160, 255, 0.12)",
      "--line": "rgba(140, 175, 255, 0.14)",
      "--text": "#EEF3FF",
      "--muted": "rgba(190, 206, 240, 0.58)",
      "--accent": "#4C8DFF",
      "--accent-ink": "#FFFFFF",
      "--accent-glass": "#7AA8FF",
      "--crown": "#BFD5FF",
      "--crown-mark": "rgba(76, 141, 255, 0.05)",
    },
  },
  stone: {
    name: "Jerusalem Stone",
    blurb: "Warm limestone with navy lettering",
    dark: false,
    vars: {
      "--bg": "#F1EADF",
      "--bg-2": "#E2D6C2",
      "--glow": "rgba(196, 160, 98, 0.22)",
      "--surface": "rgba(255, 252, 246, 0.62)",
      "--surface-strong": "#FFFCF6",
      "--line": "rgba(30, 42, 68, 0.12)",
      "--text": "#1B2742",
      "--muted": "rgba(27, 39, 66, 0.58)",
      "--accent": "#1F4E99",
      "--accent-ink": "#FFFFFF",
      "--accent-glass": "#A9C4F2",
      "--crown": "#1F4E99",
      "--crown-mark": "rgba(31, 78, 153, 0.05)",
    },
  },
  gold: {
    name: "Shabbat Gold",
    blurb: "Midnight navy with warm gold accents",
    dark: true,
    vars: {
      "--bg": "#08142B",
      "--bg-2": "#152A52",
      "--glow": "rgba(226, 184, 104, 0.22)",
      "--surface": "rgba(255, 240, 210, 0.05)",
      "--surface-strong": "rgba(255, 240, 210, 0.10)",
      "--line": "rgba(240, 214, 160, 0.16)",
      "--text": "#FBF6EC",
      "--muted": "rgba(240, 228, 204, 0.60)",
      "--accent": "#E6BE76",
      "--accent-ink": "#08142B",
      "--accent-glass": "#E6BE76",
      "--crown": "#E6BE76",
      "--crown-mark": "rgba(230, 190, 118, 0.05)",
    },
  },
};

export const THEME_OPTIONS = [
  ...Object.entries(THEMES).map(([id, t]) => ({ id, ...t })),
  { id: "auto", name: "Day & Night", blurb: "Ivory Crown by day, Royal Night after sunset", dark: null },
];

// Resolve "auto" (and the optional Shabbat theme) to a concrete preset.
export function resolveTheme(settings, { isNight, isShabbat } = {}) {
  if (isShabbat && settings.shabbatTheme && THEMES[settings.shabbatTheme]) return settings.shabbatTheme;
  const id = settings.theme || "royal";
  if (id === "auto") return isNight ? "royal" : "ivory";
  return THEMES[id] ? id : "royal";
}
