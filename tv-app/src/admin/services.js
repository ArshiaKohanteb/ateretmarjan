// Sign-in, managers and photo uploads for the dashboard.
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence,
} from "firebase/auth";
import { get, set, remove, onValue } from "firebase/database";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app, firebaseConfig, adminsRef } from "../shared/firebase.js";
import { isDemo } from "../shared/store.js";

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
const storage = getStorage(app);

export function watchUser(cb) {
  if (isDemo()) { cb({ uid: "demo", email: "demo@preview", name: "Preview", role: "owner", demo: true }); return () => {}; }
  let unsubRole = null;
  const unsub = onAuthStateChanged(auth, (user) => {
    unsubRole?.();
    if (!user) return cb(null);
    unsubRole = onValue(adminsRef(user.uid), (snap) => {
      const v = snap.val();
      cb({ uid: user.uid, email: user.email, name: v?.name || "", role: v?.role || null });
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

export async function uploadFlyer(file, id, folder = "flyers") {
  if (isDemo()) {
    const r = await shrink(file, 1100, 0.72);
    return { url: r.dataUrl(), path: "", w: r.w, h: r.h };
  }
  const r = await shrink(file, 2400, 0.86);
  const path = `tv/${folder}/${id}.jpg`;
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
