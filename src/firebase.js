import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAs_QAGWVyNd9bH89h6LYR2i-QfWX6infQ",
  authDomain: "pretzel-bites-91885.firebaseapp.com",
  projectId: "pretzel-bites-91885",
  storageBucket: "pretzel-bites-91885.firebasestorage.app",
  messagingSenderId: "636245309377",
  appId: "1:636245309377:web:6763ec0e969e646b5c6140",
  measurementId: "G-7TS3HRP29T"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();