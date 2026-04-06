// context/StepContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Global Step State
// Uses @notifee/react-native foreground service so steps survive recents swipe.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  listenForegroundServiceEvents,
  startForegroundStepService,
  stopForegroundStepService,
  updateForegroundNotification,
} from "../services/foregroundStepService";
import {
  AVG_STRIDE_M,
  GOAL_KEY,
  STORAGE_KEY,
  calcCaloriesMET,
  registerBackgroundStepTask,
  saveStepState,
  startAccelerometerTracking,
  stopAccelerometerTracking,
  unregisterBackgroundStepTask,
} from "../tasks/stepTrackingTask";
import { useProfile } from "./ProfileContext";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface StepContextType {
  steps:         number;
  calories:      number;
  distanceKm:    number;
  goal:          number;
  sessionSecs:   number;
  isTracking:    boolean;
  setGoal:       (g: number) => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking:  () => Promise<void>;
  resetToday:    () => Promise<void>;
}

const StepContext = createContext<StepContextType>({
  steps: 0, calories: 0, distanceKm: 0, goal: 10000,
  sessionSecs: 0, isTracking: false,
  setGoal: async () => {}, startTracking: async () => {},
  stopTracking: async () => {}, resetToday: async () => {},
});

export function useSteps() {
  return useContext(StepContext);
}

export function StepProvider({ children }: { children: React.ReactNode }) {
  // Safely read weight from ProfileContext
  let weightKg = 70;
  try {
    const p = useProfile();
    weightKg = p.weightKg;
  } catch {}

  const [steps,       setSteps]    = useState(0);
  const [goal,        setGoalState] = useState(10000);
  const [sessionSecs, setSession]  = useState(0);
  const [isTracking,  setTracking] = useState(false);

  const stepsRef      = useRef(0);
  const sessionRef    = useRef(0);
  const weightRef     = useRef(weightKg);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const foregroundUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => { weightRef.current = weightKg; }, [weightKg]);

  // Derived values — auto-recalculate when profile weight changes
  const calories   = useMemo(
    () => calcCaloriesMET(steps, sessionSecs, weightKg),
    [steps, sessionSecs, weightKg]
  );
  const distanceKm = useMemo(() => (steps * AVG_STRIDE_M) / 1000, [steps]);

  // ── Load persisted steps on mount ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const gRaw = await AsyncStorage.getItem(GOAL_KEY);
        if (gRaw) setGoalState(JSON.parse(gRaw));

        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d.lastReset === todayStr()) {
            stepsRef.current   = d.steps       ?? 0;
            sessionRef.current = d.sessionSecs ?? 0;
            setSteps(stepsRef.current);
            setSession(sessionRef.current);
          }
        }
      } catch (e) {
        console.log("StepContext load error:", e);
      }
    })();
  }, []);

  // ── Poll AsyncStorage every 2s (syncs with background/foreground service) ─
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.lastReset !== todayStr()) return;
        stepsRef.current   = d.steps       ?? stepsRef.current;
        sessionRef.current = d.sessionSecs ?? sessionRef.current;
        setSteps(stepsRef.current);
        setSession(sessionRef.current);
      } catch {}
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Start tracking ────────────────────────────────────────────────────────
  const startTracking = useCallback(async () => {
    try {
      setTracking(true);

      // 1. Start expo-background-fetch task (handles background resume)
      await registerBackgroundStepTask();

      // 2. Start notifee foreground service (survives recents swipe)
      //    This shows a persistent notification + keeps process alive
      await startForegroundStepService();

      // 3. Also start accelerometer in foreground (app is open right now)
      //    The foreground service will restart it if app is killed
      startAccelerometerTracking();

      // 4. Session timer — updates UI every second
      timerRef.current = setInterval(() => {
        sessionRef.current += 1;
        setSession(sessionRef.current);
      }, 1000);

      // 5. Update foreground notification with live count every 10s
      notifUpdateRef.current = setInterval(async () => {
        const cal = calcCaloriesMET(
          stepsRef.current,
          sessionRef.current,
          weightRef.current
        );
        await updateForegroundNotification(stepsRef.current, cal);
        // Sync steps from in-memory task state to React state
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) {
            const d = JSON.parse(raw);
            if (d.lastReset === todayStr()) {
              stepsRef.current   = d.steps       ?? stepsRef.current;
              sessionRef.current = d.sessionSecs ?? sessionRef.current;
              setSteps(stepsRef.current);
            }
          }
        } catch {}
      }, 10000);

      // 6. Listen for "Stop Tracking" button press on notification
      foregroundUnsubRef.current = listenForegroundServiceEvents(async () => {
        await stopTracking();
      });

    } catch (e) {
      console.log("startTracking error:", e);
      setTracking(false);
    }
  }, []);

  // ── Stop tracking ─────────────────────────────────────────────────────────
  const stopTracking = useCallback(async () => {
    try {
      setTracking(false);

      // Clear UI timer
      if (timerRef.current)      { clearInterval(timerRef.current);      timerRef.current = null; }
      if (notifUpdateRef.current) { clearInterval(notifUpdateRef.current); notifUpdateRef.current = null; }

      // Unsubscribe foreground event listener
      foregroundUnsubRef.current?.();
      foregroundUnsubRef.current = null;

      // Stop accelerometer
      stopAccelerometerTracking();

      // Stop foreground service + dismiss notification
      await stopForegroundStepService();

      // Unregister background fetch
      await unregisterBackgroundStepTask();

      // Final save
      await saveStepState(stepsRef.current, sessionRef.current, Date.now(), false);
    } catch (e) {
      console.log("stopTracking error:", e);
    }
  }, []);

  // ── Set goal ──────────────────────────────────────────────────────────────
  const setGoal = useCallback(async (g: number) => {
    setGoalState(g);
    await AsyncStorage.setItem(GOAL_KEY, JSON.stringify(g));
    await saveStepState(stepsRef.current, sessionRef.current, Date.now(), false);
  }, []);

  // ── Reset today ───────────────────────────────────────────────────────────
  const resetToday = useCallback(async () => {
    stepsRef.current   = 0;
    sessionRef.current = 0;
    setSteps(0);
    setSession(0);
    await saveStepState(0, 0, Date.now(), false);
  }, []);

  // Cleanup
  useEffect(() => () => {
    if (timerRef.current)       clearInterval(timerRef.current);
    if (pollRef.current)        clearInterval(pollRef.current);
    if (notifUpdateRef.current) clearInterval(notifUpdateRef.current);
    foregroundUnsubRef.current?.();
  }, []);

  return (
    <StepContext.Provider value={{
      steps, calories, distanceKm, goal, sessionSecs,
      isTracking, setGoal, startTracking, stopTracking, resetToday,
    }}>
      {children}
    </StepContext.Provider>
  );
}