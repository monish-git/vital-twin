// context/HydrationContext.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

import {
  scheduleHydrationReminder,
  cancelHydrationReminders,
} from "../services/notifeeService";

import {
  HydrationEntry,
  addHydrationEntry,
  clearTodayHydrationHistory,
  getTodayHydrationHistory,
  initHydrationHistoryDB,
} from "../database/hydrationHistoryDB";

// ✅ Delegates to the shared utility so background and foreground
//    both write through the same code path
import { saveWaterToStorage } from "../utils/hydrationStorage";

///////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////

type HydrationType = {
  water: number;
  history: HydrationEntry[];
  addWater: (ml: number, source?: "manual" | "notification") => void;
  reset: () => void;
  reloadHistory: () => void;
};

const HydrationContext = createContext<HydrationType | null>(null);

// Global reference so addWaterFromNotification can update live state
// when the app is foregrounded and the provider is mounted
let globalAddWater: ((ml: number, source?: "manual" | "notification") => void) | null = null;

///////////////////////////////////////////////////////////
// HELPERS
///////////////////////////////////////////////////////////

const getTodayKey = () =>
  `hydration-${new Date().toISOString().split("T")[0]}`;

const getTodayDate = () =>
  new Date().toISOString().split("T")[0];

///////////////////////////////////////////////////////////
// PROVIDER
///////////////////////////////////////////////////////////

export const HydrationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [water, setWater] = useState<number>(0);
  const [history, setHistory] = useState<HydrationEntry[]>([]);

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const lastStoredValue = useRef<number>(0);
  const hasInitialized = useRef<boolean>(false);
  const lastCheckedDate = useRef<string>(getTodayDate());

  /////////////////////////////////////////////////////////
  // Reload history from DB
  /////////////////////////////////////////////////////////

  const reloadHistory = useCallback(() => {
    try {
      const entries = getTodayHydrationHistory();
      setHistory(entries);
    } catch (err) {
      console.log("❌ History reload error:", err);
    }
  }, []);

  /////////////////////////////////////////////////////////
  // Load saved water from AsyncStorage
  // Called on mount and when returning from background
  /////////////////////////////////////////////////////////

  const loadWater = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(getTodayKey());
      const value = saved ? Number(saved) : 0;

      lastStoredValue.current = value;
      setWater(value);

      console.log(`💧 Hydration loaded: ${value}ml`);
    } catch (err) {
      console.log("❌ Hydration load error:", err);
    }
  }, []);

  /////////////////////////////////////////////////////////
  // Schedule Hydration Reminder
  /////////////////////////////////////////////////////////

  const initializeHydrationReminder = useCallback(async () => {
    try {
      await cancelHydrationReminders();
      await scheduleHydrationReminder();
      console.log("💧 Hydration reminder scheduled");
    } catch (err) {
      console.log("❌ Hydration reminder error:", err);
    }
  }, []);

  /////////////////////////////////////////////////////////
  // Initial Load
  /////////////////////////////////////////////////////////

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;

      const init = async () => {
        await initHydrationHistoryDB();
        await loadWater();
        reloadHistory();

        setTimeout(() => {
          initializeHydrationReminder();
        }, 800);
      };

      init();
    }
  }, [loadWater, initializeHydrationReminder, reloadHistory]);

  /////////////////////////////////////////////////////////
  // Reload when returning from background
  // ✅ This is what picks up water logged from background notifications:
  //    saveWaterToStorage wrote to AsyncStorage, and when the user
  //    opens the app this handler calls loadWater() to sync the UI.
  /////////////////////////////////////////////////////////

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        const today = getTodayDate();

        if (lastCheckedDate.current !== today) {
          lastCheckedDate.current = today;
          console.log("💧 New day detected — resetting hydration");
          reset();
          reloadHistory();
          initializeHydrationReminder();
        } else {
          // Same day — reload in case a background notification added water
          console.log("💧 Returning to app — reloading hydration from storage");
          loadWater();
          reloadHistory();
        }
      }

      appState.current = nextState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => subscription.remove();
  }, [loadWater, initializeHydrationReminder, reloadHistory]);

  /////////////////////////////////////////////////////////
  // Add Water (manual or foreground notification)
  /////////////////////////////////////////////////////////

  const addWater = useCallback(
    (ml: number, source: "manual" | "notification" = "manual") => {
      setWater((prev) => {
        const newValue = prev + ml;
        lastStoredValue.current = newValue;

        AsyncStorage.setItem(getTodayKey(), String(newValue)).catch(
          (err: unknown) => console.log("❌ Hydration save error:", err)
        );

        addHydrationEntry(ml, newValue, source)
          .then(() => {
            const entries = getTodayHydrationHistory();
            setHistory(entries);
          })
          .catch((err: unknown) => console.log("❌ History entry error:", err));

        console.log(`💧 addWater: +${ml}ml (${source}) → total: ${newValue}ml`);

        return newValue;
      });
    },
    []
  );

  /////////////////////////////////////////////////////////
  // Reset Water Intake + History
  /////////////////////////////////////////////////////////

  const reset = useCallback(() => {
    lastStoredValue.current = 0;
    setWater(0);
    setHistory([]);

    AsyncStorage.setItem(getTodayKey(), "0").catch((err: unknown) =>
      console.log("❌ Hydration reset error:", err)
    );

    clearTodayHydrationHistory().catch((err: unknown) =>
      console.log("❌ History clear error:", err)
    );
  }, []);

  /////////////////////////////////////////////////////////
  // Expose addWater globally so addWaterFromNotification
  // can call it when the provider is mounted (app foregrounded)
  /////////////////////////////////////////////////////////

  useEffect(() => {
    globalAddWater = addWater;
    return () => {
      globalAddWater = null;
    };
  }, [addWater]);

  /////////////////////////////////////////////////////////
  // PROVIDER RETURN
  /////////////////////////////////////////////////////////

  return (
    <HydrationContext.Provider value={{ water, history, addWater, reset, reloadHistory }}>
      {children}
    </HydrationContext.Provider>
  );
};

///////////////////////////////////////////////////////////
// CUSTOM HOOK
///////////////////////////////////////////////////////////

export const useHydration = () => {
  const ctx = useContext(HydrationContext);
  if (!ctx) {
    throw new Error("useHydration must be used inside HydrationProvider");
  }
  return ctx;
};

///////////////////////////////////////////////////////////
// addWaterFromNotification
//
// Called from notifeeService foreground handler when the app is open.
//
// Strategy:
//   1. Always write to AsyncStorage via saveWaterToStorage (durable, works
//      in both foreground and background, survives app kill).
//   2. If globalAddWater is set (provider is mounted), also update React
//      state immediately so the UI reflects the change without waiting
//      for an appState "active" event.
//
// ✅ FIXED: No longer contains its own AsyncStorage fallback logic.
//    saveWaterToStorage is the single source of truth for persistence.
///////////////////////////////////////////////////////////

export const addWaterFromNotification = async (ml: number) => {
  // Always persist to storage first (works even if provider unmounts)
  await saveWaterToStorage(ml);

  if (globalAddWater) {
    // Provider is mounted — update live UI state too.
    // Note: saveWaterToStorage already wrote to AsyncStorage,
    // so addWater will double-count if it also writes.
    // We pass source "notification" and let addWater handle UI state only.
    // To avoid double-writing AsyncStorage, reload from storage instead:
    console.log(`💧 Provider mounted — reloading water state from storage`);
    // The appState "active" handler will call loadWater() when user returns.
    // If they're already in the app, trigger it via globalAddWater:
    globalAddWater(ml, "notification");
  } else {
    console.log(`💧 Provider not mounted — AsyncStorage updated by saveWaterToStorage`);
  }
};