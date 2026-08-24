import { getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCE4YPRVW7fsmBUwO8JpPHbkVzrXEL7xg4",
  authDomain: "samadhan-sih.firebaseapp.com",
  projectId: "samadhan-sih",
  storageBucket: "samadhan-sih.firebasestorage.app",
  messagingSenderId: "742922090217",
  appId: "1:742922090217:web:71aa3129b3d5b889d6e278",
  measurementId: "G-BQBS2RZRVM",
};

export const firebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export async function initializeFirebaseAnalytics() {
  if (typeof window === "undefined") return;
  if (await isSupported()) getAnalytics(firebaseApp);
}
