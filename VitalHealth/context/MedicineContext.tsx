// context/MedicineContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

import {
  addMedicine as dbAddMedicine,
  deleteMedicine,
  getMedicines,
  markMedicineTakenByNotificationId,
  updateMedicineNotificationId,
} from "../database/medicineDB";

// ✅ FIX 1: Removed initMedicineDB import — _layout.tsx already calls it
//    before this provider mounts. Calling it again here caused a race
//    condition where the DB could be in a partially initialised state
//    when addMedicine ran, resulting in notificationId never being saved.

import {
  cancelMedicineNotification,
  scheduleMedicineDaily,
  scheduleMedicineOnce,
} from "../services/notifeeService";

import { syncMedicineFile } from "../services/medicineFileSync";

import {
  syncAddMedicine,
  syncDeleteMedicine,
  syncMarkMedicineTaken,
  syncUpdateMedicineNotificationId,
} from "../services/firebaseSync";

///////////////////////////////////////////////////////////

export type Medicine = {
  id: number;
  name: string;
  dose: string;
  type: string;
  time: string;
  timestamp: number;
  meal: string;
  frequency: string;
  startDate: string;
  endDate: string;
  reminder: number;
  notificationId: string | null;
};

///////////////////////////////////////////////////////////

type ContextType = {
  medicines: Medicine[];
  addMedicine: (
    name: string,
    dose: string,
    type: string,
    time: string,
    timestamp: number,
    meal: "before" | "after",
    frequency: string,
    startDate: string,
    endDate: string,
    reminder: number
  ) => Promise<void>;
  removeMedicine: (id: number) => Promise<void>;
  reloadMedicines: () => Promise<void>;
  markMedicineAsTaken: (notificationId?: string) => Promise<void>;
};

///////////////////////////////////////////////////////////

const MedicineContext = createContext<ContextType | null>(null);

///////////////////////////////////////////////////////////

export const MedicineProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  ///////////////////////////////////////////////////////////

  useEffect(() => {
    // ✅ FIX 1: No longer calls initMedicineDB() — _layout.tsx owns that.
    //    We only load medicines here, which is safe to call after DB is ready.
    initialize();
  }, []);

  ///////////////////////////////////////////////////////////

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadMedicines();
      }
    });

    return () => sub.remove();
  }, []);

  ///////////////////////////////////////////////////////////

  const initialize = async () => {
    try {
      await loadMedicines();
      await syncMedicineFile();

      console.log("💊 Medicine system ready");
    } catch (err) {
      console.log("Init error:", err);
    }
  };

  ///////////////////////////////////////////////////////////

  const loadMedicines = async () => {
    try {
      const data = getMedicines() as Medicine[];
      setMedicines([...data]);
    } catch (err) {
      console.log("Load medicines error:", err);
    }
  };

  ///////////////////////////////////////////////////////////

  const addMedicine = async (
    name: string,
    dose: string,
    type: string,
    time: string,
    timestamp: number,
    meal: "before" | "after",
    frequency: string,
    startDate: string,
    endDate: string,
    reminder: number
  ) => {
    try {
      // ✅ FIX 2: Validate and normalise timestamp.
      //    If the caller accidentally passes seconds instead of milliseconds
      //    (e.g. from a date picker that returns Unix seconds), new Date()
      //    produces a date in 1970 and the notification fires immediately
      //    or is skipped as "past time". We detect this and convert.
      const normalisedTimestamp =
        timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;

      dbAddMedicine(
        name,
        dose,
        type,
        time,
        normalisedTimestamp,
        meal,
        frequency,
        startDate,
        endDate,
        reminder,
        null
      );

      const allMedicines = getMedicines() as Medicine[];
      const lastMedicine = allMedicines[allMedicines.length - 1];
      if (!lastMedicine) return;

      let notifId: string | null = null;

      /////////////////////////////////////////////////////
      // 🔔 SCHEDULE NOTIFICATION
      /////////////////////////////////////////////////////

      if (reminder) {
        try {
          const dateObj = new Date(normalisedTimestamp);
          const now = new Date();
          const freq = frequency.toLowerCase();

          console.log("⏰ Scheduling medicine:", name, "at", dateObj.toISOString());

          if (freq === "once") {
            if (dateObj.getTime() > now.getTime()) {
              notifId = await scheduleMedicineOnce(
                `${name} — ${dose}`,
                dateObj,
                lastMedicine.id
              );
              console.log("✅ One-time notification scheduled:", notifId);
            } else {
              console.log("⚠️ Skipped — medicine time is in the past:", dateObj);
            }
          }

          if (freq === "daily") {
            notifId = await scheduleMedicineDaily(
              `${name} — ${dose}`,
              dateObj.getHours(),
              dateObj.getMinutes(),
              lastMedicine.id
            );
            console.log("✅ Daily notification scheduled:", notifId);
          }

          // ✅ FIX 3: Save notifId to DB immediately after scheduling,
          //    BEFORE calling loadMedicines(). Previously loadMedicines()
          //    was called first which reloaded stale data (notificationId = null)
          //    into state, meaning the action handler could never match
          //    incoming notification IDs to medicines in the DB.
          if (notifId) {
            updateMedicineNotificationId(lastMedicine.id, notifId);
            console.log("💾 NotificationId saved to DB:", notifId);
          }

        } catch (notifError) {
          console.log("❌ Notification scheduling failed:", notifError);
        }
      }

      /////////////////////////////////////////////////////
      // Sync to Firebase
      /////////////////////////////////////////////////////

      syncAddMedicine({
        id: lastMedicine.id,
        name,
        dose,
        type,
        time,
        timestamp: normalisedTimestamp,
        meal,
        frequency,
        startDate,
        endDate,
        reminder,
        notificationId: notifId,
      });

      if (notifId) {
        syncUpdateMedicineNotificationId(lastMedicine.id, notifId);
      }

      // ✅ FIX 3 continued: loadMedicines() now runs AFTER the notifId
      //    has been written to the DB, so state is always fresh and correct.
      await loadMedicines();
      await syncMedicineFile();

      console.log("💊 Medicine added & synced");
    } catch (err) {
      console.log("Add medicine error:", err);
    }
  };

  ///////////////////////////////////////////////////////////

  const markMedicineAsTaken = async (notificationId?: string) => {
    try {
      if (!notificationId) return;

      markMedicineTakenByNotificationId(notificationId);

      const medicine = (getMedicines() as Medicine[]).find(
        (m) => m.notificationId === notificationId
      );

      if (medicine) {
        syncMarkMedicineTaken(medicine.id);
      }

      await loadMedicines();

      console.log("💊 Medicine marked as taken");
    } catch (err) {
      console.log("Mark taken error:", err);
    }
  };

  ///////////////////////////////////////////////////////////

  const removeMedicine = async (id: number) => {
    try {
      const item = medicines.find((m) => m.id === id);

      if (item?.notificationId) {
        await cancelMedicineNotification(item.notificationId);
      }

      deleteMedicine(id);
      syncDeleteMedicine(id);

      await loadMedicines();

      console.log("🗑 Medicine removed");
    } catch (err) {
      console.log("Delete medicine error:", err);
    }
  };

  ///////////////////////////////////////////////////////////

  const reloadMedicines = async () => {
    await loadMedicines();
  };

  ///////////////////////////////////////////////////////////

  return (
    <MedicineContext.Provider
      value={{
        medicines,
        addMedicine,
        removeMedicine,
        reloadMedicines,
        markMedicineAsTaken,
      }}
    >
      {children}
    </MedicineContext.Provider>
  );
};

///////////////////////////////////////////////////////////

export const useMedicine = () => {
  const ctx = useContext(MedicineContext);
  if (!ctx) throw new Error("useMedicine must be inside provider");
  return ctx;
};