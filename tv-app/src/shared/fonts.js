// Modern Hebrew faces the owner can pick from (all on Google Fonts).
export const HEBREW_FONTS = [
  { id: "Heebo", weights: "300;400;500;700;800" },
  { id: "Rubik", weights: "300;400;500;700;800" },
  { id: "Assistant", weights: "300;400;600;700;800" },
  { id: "IBM Plex Sans Hebrew", weights: "300;400;500;700" },
  { id: "Noto Sans Hebrew", weights: "300;400;500;700;800" },
  { id: "Secular One", weights: "400" },
  { id: "Varela Round", weights: "400" },
  { id: "Bellefair", weights: "400" },
  { id: "Suez One", weights: "400" },
];

// Load the chosen face on demand and point the Hebrew text at it.
export function useHebrewFont(id) {
  const font = HEBREW_FONTS.find((f) => f.id === id) || HEBREW_FONTS[0];
  if (typeof document === "undefined") return font;
  const linkId = "he-font-" + font.id.replace(/\s+/g, "-");
  if (!document.getElementById(linkId)) {
    const l = document.createElement("link");
    l.id = linkId;
    l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?family=${font.id.replace(/ /g, "+")}:wght@${font.weights}&display=swap`;
    document.head.appendChild(l);
  }
  document.documentElement.style.setProperty("--he-font", `"${font.id}"`);
  return font;
}
