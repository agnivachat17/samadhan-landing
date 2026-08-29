import { getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCE4YPRVW7fsmBUwO8JpPHbkVzrXEL7xg4",
  authDomain: "samadhan-sih.firebaseapp.com",
  projectId: "samadhan-sih",
  storageBucket: "samadhan-sih.firebasestorage.app",
  messagingSenderId: "742922090217",
  appId: "1:742922090217:web:71aa3129b3d5b889d6e278",
  measurementId: "G-BQBS2RZRVM",
};

export const firebaseApp = getApps().length
  ? getApps()[0]!
  : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export async function initializeFirebaseAnalytics() {
  if (typeof window === "undefined") return;
  if (await isSupported()) getAnalytics(firebaseApp);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
) {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  if (name) await updateProfile(credential.user, { displayName: name });
  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return credential.user;
}

export async function signInWithFacebook() {
  const credential = await signInWithPopup(auth, new FacebookAuthProvider());
  return credential.user;
}

export async function signOutUser() {
  await signOut(auth);
}
