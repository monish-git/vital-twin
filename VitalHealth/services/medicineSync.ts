import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import { addMedicine } from "../database/medicineDB";

export const syncMedicinesFromFirebase = async () => {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const snapshot = await getDocs(
      collection(db, "users", uid, "medicines")
    );

    console.log("📥 Syncing medicines from Firebase...");

    snapshot.forEach((doc) => {
      const data: any = doc.data();

      addMedicine(
        data.name || "",
        data.dose || "",
        data.type || "",
        data.time || "",
        data.timestamp || Date.now(),
        data.meal || "",
        data.frequency || "daily",
        data.startDate || "",
        data.endDate || "",
        data.reminder || 1,
        data.notificationId || null
      );
    });

    console.log("✅ Medicines synced to local DB");
  } catch (error) {
    console.log("❌ Sync error:", error);
  }
};