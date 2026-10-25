// Sign-in, managers and photo uploads for the dashboard.
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence,
} from "firebase/auth";
import { get, set, remove, onValue } from "firebase/database";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";
import { app, firebaseConfig, adminsRef } from "../shared/firebase.js";
import { isDemo } from "../shared/store.js";

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
const storage = getStorage(app);

export function watchUser(cb) {
  if (isDemo()) { cb({ uid: "demo", email: "demo@preview", role: "owner", demo: true }); return () => {}; }
  let unsubRole = null;
  const unsub = onAuthStateChanged(auth, (user) => {
    unsubRole?.();
    if (!user) return cb(null);
    unsubRole = onValue(adminsRef(user.uid), (snap) => {
      const v = snap.val();
      cb({ uid: user.uid, email: user.email, role: v?.role || null });
    }, () => cb({ uid: user.uid, email: user.email, role: null }));
  });
  return () => { unsub(); unsubRole?.(); };
}

export const signIn = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);
export const signOutUser = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

// First-time setup: the very first account becomes the owner. The database
// rules only allow this while no managers exist yet.
export async function claimOwner(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    await set(adminsRef(cred.user.uid), { role: "owner", email: cred.user.email, name: name || "", addedAt: Date.now() });
  } catch (e) {
    await cred.user.delete().catch(() => {});
    throw new Error("This dashboard already has an owner. Ask them to add you as a manager.");
  }
}

// Create a manager without signing the owner out (uses a throwaway app instance).
export async function addManager(email, password, name, role = "manager") {
  const temp = initializeApp(firebaseConfig, "add-manager-" + Date.now());
  try {
    const cred = await createUserWithEmailAndPassword(getAuth(temp), email.trim(), password);
    await set(adminsRef(cred.user.uid), { role, email: cred.user.email, name: name || "", addedAt: Date.now() });
    await signOut(getAuth(temp));
  } finally {
    await deleteApp(temp);
  }
}

export const listManagers = (cb) => onValue(adminsRef(), (s) => cb(s.val() || {}), () => cb({}));
export const setManagerRole = (uid, role) => set(adminsRef(uid + "/role"), role);
export const removeManager = (uid) => remove(adminsRef(uid));

// ── Photos ──

// Shrink big phone photos before upload: faster for the TV and the stick's memory.
export async function shrink(file, maxEdge, quality) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    return draw(img, img.naturalWidth, img.naturalHeight, maxEdge, quality);
  }
  return draw(bitmap, bitmap.width, bitmap.height, maxEdge, quality);
}

function draw(src, w, h, maxEdge, quality) {
  const k = Math.min(1, maxEdge / Math.max(w, h));
  const cw = Math.round(w * k), ch = Math.round(h * k);
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(src, 0, 0, cw, ch);
  return new Promise((res) => c.toBlob((blob) => res({ blob, w: cw, h: ch, dataUrl: () => c.toDataURL("image/jpeg", quality) }), "image/jpeg", quality));
}

export async function uploadFlyer(file, id) {
  if (isDemo()) {
    const r = await shrink(file, 1100, 0.72);
    return { url: r.dataUrl(), path: "", w: r.w, h: r.h };
  }
  const r = await shrink(file, 2400, 0.86);
  const path = `tv/flyers/${id}.jpg`;
  await uploadBytes(sRef(storage, path), r.blob, { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" });
  const url = await getDownloadURL(sRef(storage, path));
  return { url, path, w: r.w, h: r.h };
}

export async function deleteFlyerFile(path) {
  if (!path || isDemo()) return;
  await deleteObject(sRef(storage, path)).catch(() => {});
}

export async function hasAnyAdmin() {
  try { return (await get(adminsRef())).exists(); } catch { return true; }
}

// ── Reading the rabbi's weekly flyer (Gemini through Firebase AI Logic) ──

const flyerSchema = Schema.object({
  properties: {
    days: Schema.array({
      items: Schema.object({
        properties: {
          date: Schema.string({ description: "YYYY-MM-DD" }),
          label: Schema.string({ description: "Name of the day, e.g. Shabbat, Hoshana Rabba, Erev Shabbat" }),
          items: Schema.array({
            items: Schema.object({
              properties: {
                name: Schema.string(),
                time: Schema.string({ description: "24-hour HH:MM" }),
                note: Schema.string(),
              },
              optionalProperties: ["note"],
            }),
          }),
        },
      }),
    }),
  },
});

const blobToBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

export async function readFlyer(file, { today, friday, saturday }) {
  const img = await shrink(file, 1800, 0.88);
  const data = await blobToBase64(img.blob);
  const model = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
    model: "gemini-3.8-flash",
    generationConfig: { responseMimeType: "application/json", responseSchema: flyerSchema, temperature: 0 },
  });
  const prompt = `This is a printed schedule of prayer times from a synagogue. Our minyan is "Ateret Marjan" (the youth side).
Today is ${today}. The coming Friday is ${friday} and Shabbat is ${saturday}.

Extract every scheduled event with its time, grouped by day.
- If the flyer separates "Haichal Moshe" (the older congregation) from "Ateret Marjan" / "Youth", return ONLY the Ateret Marjan / Youth times. If there is no such split, return everything.
- When one line lists several times (e.g. "Shacharit 6:15 AM / 9:00 AM / 9:45 AM (Youth)"), return one item per time; put labels like "Youth" in the note.
- For a range like "1:00 PM - 2:00 PM", use the start time and put "until 2:00 PM" in the note.
- "Candle lighting any time after 7:12 PM" becomes name "Candle Lighting", time "19:12", note "after".
- "End of Chag" / "Shabbat ends" becomes name "Havdalah".
- Use clean, title-case names (Shacharit, Mincha, Arvit, Shiur – Professor Kimia, Candle Lighting, Hakafot).
- Give each day its real date (YYYY-MM-DD). If the flyer only says a weekday, use the next such date on or after today. If no day is given at all, assume Shabbat ${saturday} for Shabbat-day prayers and Friday ${friday} for candle lighting / Kabbalat Shabbat.
- Times are 24-hour HH:MM. Skip anything without a time.`;
  const result = await model.generateContent([prompt, { inlineData: { data, mimeType: "image/jpeg" } }]);
  const parsed = JSON.parse(result.response.text());
  return (parsed.days || []).filter((d) => d.items?.length);
}
