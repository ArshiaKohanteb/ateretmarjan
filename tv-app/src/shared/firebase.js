import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";

// Same Firebase project as the original signage. The new display lives
// under /tv so the old /signage data keeps working until it's retired.
export const firebaseConfig = {
  apiKey: "AIzaSyDYDDFxJAGRJKglNrhfmUYkB8TvE0bAxhc",
  authDomain: "ateret-marjan-signage.firebaseapp.com",
  databaseURL: "https://ateret-marjan-signage-default-rtdb.firebaseio.com",
  projectId: "ateret-marjan-signage",
  storageBucket: "ateret-marjan-signage.firebasestorage.app",
  messagingSenderId: "650374635159",
  appId: "1:650374635159:web:56837969916a201208d3d2",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const TV_PATH = "tv";
export const tvRef = (path = "") => ref(db, path ? `${TV_PATH}/${path}` : TV_PATH);
export const adminsRef = (uid = "") => ref(db, uid ? `tvAdmins/${uid}` : "tvAdmins");
