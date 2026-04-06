import { db } from "./firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export async function getUserHealthData(userId: string) {
  try {
    // Profile
    const profileDoc = await getDoc(doc(db, "users", userId));

    // Medicines
    const medSnap = await getDocs(collection(db, "users", userId, "medicines"));

    // Symptoms
    const symSnap = await getDocs(collection(db, "users", userId, "symptoms"));

    // Hydration
    const hydDoc = await getDoc(doc(db, "hydration", userId));

    return {
      profile: profileDoc.data(),
      medicines: medSnap.docs.map(d => d.data()),
      symptoms: symSnap.docs.map(d => d.data()),
      hydration: hydDoc.data()?.amount || 0,
    };

  } catch (error) {
    console.log("Firebase fetch error:", error);
    return null;
  }
}