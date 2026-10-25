// Read/write the /tv data. Normally that's Firebase; with ?demo in the URL
// everything stays in this browser's localStorage so the dashboard can be
// tried out without signing in or touching the real TV.
import { onValue, set, update } from "firebase/database";
import { tvRef } from "./firebase.js";
import { DEFAULT_TV, normalizeTv } from "./defaults.js";

export const isDemo = () => new URLSearchParams(location.search).has("demo");

const CACHE_KEY = "am-tv-cache-v2";
const DEMO_KEY = "am-tv-demo-v2";
const DEMO_EVENT = "am-tv-demo-change";

function readLocal(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

export function readCache() {
  return readLocal(CACHE_KEY);
}

// cb(tvData, { fromServer, empty })
export function subscribeTv(cb) {
  if (isDemo()) {
    const emit = () => cb(normalizeTv(readLocal(DEMO_KEY) || DEFAULT_TV), { fromServer: true, empty: false });
    emit();
    const onStorage = (e) => { if (!e.key || e.key === DEMO_KEY) emit(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(DEMO_EVENT, emit);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(DEMO_EVENT, emit); };
  }
  const cached = readCache();
  if (cached) cb(normalizeTv(cached), { fromServer: false, empty: false });
  return onValue(tvRef(), (snap) => {
    const raw = snap.val();
    if (raw) writeLocal(CACHE_KEY, raw);
    cb(normalizeTv(raw), { fromServer: true, empty: !raw });
  }, (err) => console.warn("[tv] firebase read failed", err));
}

function setIn(obj, path, value) {
  const keys = path.split("/");
  const root = { ...(obj || {}) };
  let cur = root;
  keys.slice(0, -1).forEach((k) => { cur[k] = { ...(cur[k] || {}) }; cur = cur[k]; });
  cur[keys[keys.length - 1]] = value;
  return root;
}

export async function writeTv(path, value) {
  if (isDemo()) {
    const current = readLocal(DEMO_KEY) || DEFAULT_TV;
    writeLocal(DEMO_KEY, setIn(current, path, value));
    window.dispatchEvent(new Event(DEMO_EVENT));
    return;
  }
  return set(tvRef(path), value);
}

export async function patchTv(path, partial) {
  if (isDemo()) {
    const current = readLocal(DEMO_KEY) || DEFAULT_TV;
    const base = path.split("/").reduce((o, k) => (o ? o[k] : undefined), current) || {};
    return writeTv(path, { ...base, ...partial });
  }
  return update(tvRef(path), partial);
}

export async function seedTv() {
  if (isDemo()) return writeTv("settings", DEFAULT_TV.settings);
  return set(tvRef(), DEFAULT_TV);
}
