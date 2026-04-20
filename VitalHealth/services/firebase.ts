import { initializeApp } from "firebase/app";
// @ts-ignore — getReactNativePersistence is available at runtime in Firebase 12
// but TypeScript types may not expose it depending on the module resolution
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// ✅ Auth with AsyncStorage persistence — login session survives app restarts
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ✅ Firestore
export const db = getFirestore(app);

export default app;