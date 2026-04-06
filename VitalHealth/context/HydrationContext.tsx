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

type HydrationType = {
  water:    number;
  addWater: (ml: number) => void;
  reset:    () => void;
};

const HydrationContext = createContext<HydrationType | null>(null);

// Global ref so notification actions can add water without opening app
let globalAddWater: ((ml: number) => void) | null = null;

export const HydrationProvider = ({ children }: any) => {
  const [water, setWater] = useState(0);
  const appState = useRef(AppState.currentState);

  /////////////////////////////////////////////////////////
  // Generate unique key per day
  /////////////////////////////////////////////////////////

  const todayKey = () => {
    const d = new Date();
    return `hydration-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  /////////////////////////////////////////////////////////
  // Load saved water from AsyncStorage
  /////////////////////////////////////////////////////////

  const loadWater = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(todayKey());
      if (saved !== null) {
        setWater(Number(saved));
        console.log(`💧 Hydration loaded: ${saved}ml`);
      }
    } catch (err) {
      console.log("❌ Hydration load error:", err);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadWater();
  }, []);

  // ✅ FIX: Reload from AsyncStorage when app comes back to foreground
  // This fixes the bug where notification button adds water to AsyncStorage
  // but HydrationContext still shows the old value until app restart
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          // App just came to foreground — reload water from AsyncStorage
          console.log("💧 App came to foreground — reloading hydration...");
          loadWater();
        }
        appState.current = nextState;
      }
    );

    return () => subscription.remove();
  }, [loadWater]);

  /////////////////////////////////////////////////////////
  // Add Water
  // ✅ Uses functional setWater(prev => ...) so it never
  // captures a stale `water` value from closure.
  /////////////////////////////////////////////////////////

  const addWater = useCallback((ml: number) => {
    setWater((prev) => {
      const newValue = prev + ml;
      const key = `hydration-${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`;
      AsyncStorage.setItem(key, String(newValue)).catch((err) =>
        console.log("❌ Hydration save error:", err)
      );
      console.log(`💧 addWater called: +${ml}ml → total: ${newValue}ml`);
      return newValue;
    });
  }, []);

  /////////////////////////////////////////////////////////
  // Reset
  /////////////////////////////////////////////////////////

  const reset = () => {
    setWater(0);
    AsyncStorage.setItem(todayKey(), "0").catch((err) =>
      console.log("❌ Hydration reset error:", err)
    );
  };

  /////////////////////////////////////////////////////////
  // Store global reference for notification buttons
  // ✅ addWater is stable (no deps) so this only runs once
  /////////////////////////////////////////////////////////

  useEffect(() => {
    globalAddWater = addWater;
    console.log("✅ globalAddWater reference set");
  }, [addWater]);

  return (
    <HydrationContext.Provider value={{ water, addWater, reset }}>
      {children}
    </HydrationContext.Provider>
  );
};

export const useHydration = () => {
  const ctx = useContext(HydrationContext);
  if (!ctx) throw new Error("useHydration must be used inside HydrationProvider");
  return ctx;
};

/////////////////////////////////////////////////////////
// Used from notification listeners (no React hook needed)
// ✅ globalAddWater is set when HydrationProvider mounts
/////////////////////////////////////////////////////////

export const addWaterFromNotification = (ml: number) => {
  if (globalAddWater) {
    globalAddWater(ml);
    console.log(`💧 Added ${ml}ml from notification`);
  } else {
    // ✅ Fallback: write directly to AsyncStorage if context not ready
    // HydrationContext will pick it up when app comes to foreground
    const d   = new Date();
    const key = `hydration-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    AsyncStorage.getItem(key).then((saved) => {
      const current  = saved ? Number(saved) : 0;
      const newValue = current + ml;
      AsyncStorage.setItem(key, String(newValue));
      console.log(`💧 [fallback] Water saved to AsyncStorage: ${ml}ml (total: ${newValue}ml)`);
    });
  }
};