import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export async function getUserHealthData(userId: string) {
  try {
    if (!userId) {
      console.log("❌ No userId provided");
      return null;
    }

    console.log("🔍 Fetching health data for:", userId);

    // ✅ FIXED: use "users" collection
    const profileDoc = await getDoc(doc(db, "users", userId));

    if (!profileDoc.exists()) {
      console.log("❌ Profile not found for:", userId);
      return null;
    }

    const profileData = profileDoc.data();
    console.log("✅ Profile loaded:", profileData?.firstName);

    // ✅ Medicines
    const medSnap = await getDocs(
      collection(db, "users", userId, "medicines")
    );
    const medicines = medSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log("✅ Medicines:", medicines.length);

    // ✅ Symptoms
    const symSnap = await getDocs(
      collection(db, "users", userId, "symptoms")
    );
    const symptoms = symSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log("✅ Symptoms:", symptoms.length);

    // ✅ Hydration (optional subcollection)
    let hydration = 0;
    try {
      const hydDoc = await getDoc(
        doc(db, "users", userId, "health", "hydration")
      );
      if (hydDoc.exists()) {
        hydration = hydDoc.data()?.amount || 0;
      }
    } catch (_) {}

    return { profile: profileData, medicines, symptoms, hydration };
  } catch (error) {
    console.log("❌ getUserHealthData error:", error);
    return null;
  }
}