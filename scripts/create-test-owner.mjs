import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  updateProfile,
} from "firebase/auth";

const app = initializeApp(
  {
    apiKey: "AIzaSyCE4YPRVW7fsmBUwO8JpPHbkVzrXEL7xg4",
    authDomain: "samadhan-sih.firebaseapp.com",
    projectId: "samadhan-sih",
    storageBucket: "samadhan-sih.firebasestorage.app",
  },
  "createOwner"
);

const auth = getAuth(app);

try {
  const cred = await createUserWithEmailAndPassword(
    auth,
    "confidential-test@test.com",
    "Test@123456"
  );
  await updateProfile(cred.user, { displayName: "USP-10 Test Owner" });
  console.log("Created Firebase Auth user:", cred.user.uid);
} catch (e) {
  if (e.code === "auth/email-already-in-use") {
    console.log("User already exists — can sign in");
  } else {
    console.error("Failed:", e.code, e.message);
  }
}
