// Shape of everything stored at /tv in Firebase, plus starting values.
//
// A "time" is either
//   { type: "fixed", value: "18:30" }
//   { type: "zman",  zman: "sunset", offset: -15, round: 5 }
// where zman is any id from the zmanim bridge (sunset, tzet, plag, …) or
// one of candleLighting / havdalah / rabbeinuTam.

export const uid = () => Math.random().toString(36).slice(2, 10);

export const WEEKDAYS = [0, 1, 2, 3, 4];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DEFAULT_SETTINGS = {
  shulName: "Ateret Marjan",
  shulNameHe: "עטרת מרג׳אן",
  theme: "royal",
  shabbatTheme: "",
  flip: false,
  effects: "full",
  showSeconds: false,
  // Rotation
  scheduleSeconds: 30,
  flyerSeconds: 12,
  announcementSeconds: 12,
  itemsBetween: 2,
  pairVerticalFlyers: true,
  showCommunity: true,
  communitySeconds: 16,
  communityTitle: "Our Community",
  holdBeforeMinyan: 10,
  contentPaused: false,
  // Schedule screen
  shabbatShowFrom: 4,
  showZmanim: true,
  showLimudim: true,
  showHiloulot: true,
  showMakam: true,
  showTicker: true,
  showDonate: true,
  tickerSpeed: 60,
  donate: {
    venmo: "@Ateret-Marjan",
    zelle: "donateateretmarjan@gmail.com",
    website: "AteretMarjan.org",
  },
  // Hidden zmanim (ids) on the schedule screen
  hiddenZmanim: ["alot", "midnight", "minchaGedola"],
  // Bumped from the dashboard to force every TV to reload
  reloadToken: 0,
};

export const DEFAULT_MINYANIM = [
  { id: uid(), name: "Shacharit", note: "Sunday", days: [0], time: { type: "fixed", value: "08:45" } },
  { id: uid(), name: "Shacharit", note: "", days: [1, 2, 3, 4, 5], time: { type: "fixed", value: "06:30" } },
  { id: uid(), name: "Mincha", note: "", days: [0, 1, 2, 3, 4], time: { type: "zman", zman: "sunset", offset: -15, round: 5 } },
  { id: uid(), name: "Arvit", note: "", days: [0, 1, 2, 3, 4], time: { type: "zman", zman: "tzet", offset: 0, round: 0 } },
];

export const DEFAULT_SHABBAT = [
  { id: uid(), name: "Candle Lighting", day: "fri", time: { type: "zman", zman: "candleLighting", offset: 0, round: 0 } },
  { id: uid(), name: "Mincha & Kabbalat Shabbat", day: "fri", time: { type: "zman", zman: "candleLighting", offset: 0, round: 0 } },
  { id: uid(), name: "Shiur", day: "sat", time: { type: "fixed", value: "09:00" } },
  { id: uid(), name: "Shacharit", day: "sat", time: { type: "fixed", value: "09:45" } },
  { id: uid(), name: "Shiur by Rabbi Loloyan", day: "sat", time: { type: "fixed", value: "15:45" } },
  { id: uid(), name: "Shiur by Rabbi Kashani", day: "sat", time: { type: "fixed", value: "17:30" } },
  { id: uid(), name: "Mincha & Seudat Shelishit", day: "sat", time: { type: "fixed", value: "18:00" } },
  { id: uid(), name: "Arvit", day: "sat", time: { type: "fixed", value: "18:48" } },
  { id: uid(), name: "Havdalah", day: "sat", time: { type: "zman", zman: "havdalah", offset: 0, round: 0 } },
];

export const ANNOUNCEMENT_STYLES = {
  info: { label: "Announcement", hint: "General news" },
  celebration: { label: "Mazal Tov", hint: "Weddings, brits, births" },
  sponsor: { label: "Meal sponsor", hint: "Kiddush & seudah sponsors" },
  urgent: { label: "Important", hint: "Changes & urgent notices" },
  memorial: { label: "In Memory", hint: "Hilulot & memorials" },
};

export const OCCASIONS = {
  wedding: { label: "Wedding", line: "on the wedding of", motif: "rings" },
  engagement: { label: "Engagement", line: "on the engagement of", motif: "rings" },
  brit: { label: "Brit Milah", line: "on the brit milah of their son", motif: "star" },
  birthGirl: { label: "Baby girl", line: "on the birth of a baby girl to", motif: "star" },
  birthBoy: { label: "Baby boy", line: "on the birth of a baby boy to", motif: "star" },
  bar: { label: "Bar Mitzvah", line: "on the bar mitzvah of", motif: "star" },
  bat: { label: "Bat Mitzvah", line: "on the bat mitzvah of", motif: "star" },
  other: { label: "Other", line: "", motif: "star" },
};

export const MEALS = ["Kiddush", "Seudat Shelishit", "Breakfast", "Shabbat Dinner", "Melave Malka"];

export const DEDICATIONS = {
  honor: "in honor of",
  memory: "in loving memory of",
  refuah: "for a refuah shelemah for",
  celebration: "in celebration of",
  none: "",
};

export const DEFAULT_ANNOUNCEMENTS = [
  { id: uid(), active: true, style: "info", title: "Shnayim Mikra Incentive Program", body: "Sign up now for the new Shnayim Mikra Incentive Program!", slide: true, ticker: true, start: "", end: "" },
  { id: uid(), active: true, style: "info", title: "New Sunday Minyan", body: "8:45 AM Sunday morning minyan, followed by breakfast.", slide: true, ticker: true, start: "", end: "" },
  { id: uid(), active: true, style: "sponsor", title: "Thank You", body: "Thank you to everyone who supported the Haichal Moshe Outreach Fundraiser!", slide: false, ticker: true, start: "", end: "" },
];

export const DEFAULT_TV = {
  settings: DEFAULT_SETTINGS,
  minyanim: DEFAULT_MINYANIM,
  shabbat: DEFAULT_SHABBAT,
  special: [],
  announcements: DEFAULT_ANNOUNCEMENTS,
  flyers: [],
  photos: [],
};

// Firebase drops empty arrays and turns arrays into objects in some cases.
export const asList = (v) => (Array.isArray(v) ? v.filter(Boolean) : v && typeof v === "object" ? Object.values(v).filter(Boolean) : []);

export function normalizeTv(raw) {
  const r = raw || {};
  return {
    settings: { ...DEFAULT_SETTINGS, ...(r.settings || {}), donate: { ...DEFAULT_SETTINGS.donate, ...(r.settings?.donate || {}) } },
    minyanim: raw ? asList(r.minyanim) : DEFAULT_MINYANIM,
    shabbat: raw ? asList(r.shabbat) : DEFAULT_SHABBAT,
    special: asList(r.special).map((s) => ({ ...s, items: asList(s.items) })),
    announcements: raw ? asList(r.announcements) : DEFAULT_ANNOUNCEMENTS,
    flyers: asList(r.flyers),
    photos: asList(r.photos),
  };
}
