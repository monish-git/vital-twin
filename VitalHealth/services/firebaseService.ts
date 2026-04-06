import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export async function findUserByHealthId(healthId: string) {
  try {
    const snapshot = await getDocs(collection(db, "users"));

    // 🔥 Normalize input
    const input = healthId
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ""); // remove -, space, etc

    console.log("🔍 INPUT:", input);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      if (!data.healthId) continue;

      const dbId = data.healthId
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      console.log("📦 DB:", dbId);

      if (dbId === input) {
        console.log("✅ MATCH FOUND");

        return {
          uid: docSnap.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          healthId: data.healthId,
        };
      }
    }

    console.log("❌ NO MATCH");
    return null;

  } catch (error) {
    console.log("❌ Search error:", error);
    return null;
  }
}