import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaEevmPis-M0PYDw4ZkPiPUSpwEQcw1tw",
  authDomain: "vitaltwin-78004.firebaseapp.com",
  projectId: "vitaltwin-78004",
  storageBucket: "vitaltwin-78004.firebasestorage.app",
  messagingSenderId: "1049910788509",
  appId: "1:1049910788509:web:df337f5c7b21f45878af74",
  measurementId: "G-Q6TRCEJ2ZL"
};

const app = initializeApp(firebaseConfig);

// ✅ SIMPLE & WORKING
export const auth = getAuth(app);

// ✅ Firestore
export const db = getFirestore(app);

export default app;