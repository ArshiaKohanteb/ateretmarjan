import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";

// Dedicated Firebase project for the new TV (the old /shul-wall display
// still uses the original ateret-marjan-signage project).
export const firebaseConfig = {
  apiKey: "AIzaSyDqaUt8sia1FWTNPJmyrcG_5dd8QJoQo6Q",
  authDomain: "ateret-marjan-elegant-tv.firebaseapp.com",
  databaseURL: "https://ateret-marjan-elegant-tv-default-rtdb.firebaseio.com",
  projectId: "ateret-marjan-elegant-tv",
  storageBucket: "ateret-marjan-elegant-tv.firebasestorage.app",
  messagingSenderId: "423999547564",
  appId: "1:423999547564:web:6a0a574a3c886112ba5709",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const TV_PATH = "tv";
export const tvRef = (path = "") => ref(db, path ? `${TV_PATH}/${path}` : TV_PATH);
export const adminsRef = (uid = "") => ref(db, uid ? `tvAdmins/${uid}` : "tvAdmins");
