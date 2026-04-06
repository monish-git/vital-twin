// context/MedicineContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

import {
  addMedicine as dbAddMedicine,
  deleteMedicine,
  getMedicines,
  initMedicineDB,
  markMedicineTakenByNotificationId,
  updateMedicineNotificationId,
} from "../database/medicineDB";

import {
  cancelMedicineNotification,
  requestPermission, // ✅ FIXED
} from "../services/notificationService";

import {
  scheduleDailyMedicineReminder,
  scheduleOneTimeMedicineReminder,
} from "../app/brain/medicineReminder";

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

export const MedicineProvider = ({ children }: { children: React.ReactNode }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  ///////////////////////////////////////////////////////////
  useEffect(() => {
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
      await initMedicineDB();

      // ✅ FIXED PERMISSION
      await requestPermission();

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
      dbAddMedicine(
        name,
        dose,
        type,
        time,
        timestamp,
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

      if (reminder) {
        try {
          const dateObj = new Date(timestamp);
          const freq = frequency.toLowerCase();

          console.log("⏰ Scheduling medicine:", name, dateObj);

          if (freq === "once") {
            notifId = await scheduleOneTimeMedicineReminder(
              `${name} — ${dose}`,
              dateObj
            );
          } else if (freq === "daily") {
            notifId = await scheduleDailyMedicineReminder(
              `${name} — ${dose}`,
              dateObj.getHours(),
              dateObj.getMinutes()
            );
          }

          if (notifId) {
            updateMedicineNotificationId(lastMedicine.id, notifId);
          }
        } catch (notifError) {
          console.log("❌ Notification scheduling failed:", notifError);
        }
      }

      syncAddMedicine({
        id: lastMedicine.id,
        name,
        dose,
        type,
        time,
        timestamp,
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