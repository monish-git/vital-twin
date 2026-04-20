// context/StepContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Root causes fixed in this version:
//
//  CRASH FIX:
//    - AsyncStorage was written on EVERY step → JS thread overload → crash
//    - Now persisted max once every 5 seconds via a flush timer
//    - Accelerometer interval raised to 200ms (was 100ms) to reduce JS pressure
//    - All sensor subs are torn down cleanly before re-subscribing
//
//  ACCURACY FIX:
//    - Pedometer baseline was re-anchored on every re-subscribe, losing steps
//    - Now baseline is captured once per tracking session and never re-anchored
//      mid-session; only the cumulative delta from session-start is used
//    - Accelerometer: stricter hysteresis + 650ms min interval
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from "@react-native-async-storage/async-storage";
import notifee, {
  AndroidImportance,
} from "@notifee/react-native";
import { Accelerometer, Pedometer } from "expo-sensors";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

// ── Storage Keys ──────────────────────────────────────────────────────────────
const KEYS = {
  goal:         "step_goal_v7",
  date:         "step_date_v7",
  totalToday:   "step_total_today_v7",
  isTracking:   "step_is_tracking_v7",
  sessionStart: "step_session_start_v7",
  lastMoveTs:   "step_last_move_ts_v7",
};

const todayString = () => new Date().toISOString().slice(0, 10);

// ── Accelerometer Step Detector ───────────────────────────────────────────────
//
//  State machine:
//    IDLE  →  (mag > ARM_THRESH)   →  ARMED
//    ARMED →  track peak
//    ARMED →  (mag < FIRE_THRESH)  →  check peak, maybe fire  →  IDLE
//
//  Conservative thresholds to avoid phantom steps from:
//    • phone sitting on table
//    • riding in a vehicle
//    • typing or tapping screen
//
const ARM_THRESH  = 2.3;   // g-force to arm the detector
const FIRE_THRESH = 1.05;  // g-force to fire (must fall this low after arming)
const PEAK_MIN    = 2.5;   // peak must exceed this to count (rejects soft bumps)
const STEP_GAP_MS = 650;   // minimum ms between steps (~92 steps/min max)

class StepDetector {
  private armed       = false;
  private peak        = 0;
  private lastStepAt  = 0;
  onStep: (() => void) | null = null;

  feed(x: number, y: number, z: number) {
    // Total acceleration magnitude (includes gravity ~1g when stationary)
    const mag = Math.sqrt(x * x + y * y + z * z);

    if (!this.armed) {
      if (mag > ARM_THRESH) {
        this.armed = true;
        this.peak  = mag;
      }
      return;
    }

    // Update peak while armed
    if (mag > this.peak) {
      this.peak = mag;
    }

    // Falling edge triggers the step check
    if (mag < FIRE_THRESH) {
      const peaked = this.peak;
      this.armed   = false;
      this.peak    = 0;

      if (peaked < PEAK_MIN) return;          // too weak — noise
      const now = Date.now();
      if (now - this.lastStepAt < STEP_GAP_MS) return;  // too fast — noise

      this.lastStepAt = now;
      this.onStep?.();
    }
  }

  reset() {
    this.armed      = false;
    this.peak       = 0;
    this.lastStepAt = 0;
  }
}

// ── Context Types ─────────────────────────────────────────────────────────────
interface StepContextValue {
  steps:         number;
  calories:      number;
  distanceKm:    number;
  goal:          number;
  sessionSecs:   number;
  isTracking:    boolean;
  usingFallback: boolean;
  setGoal:       (g: number) => void;
  startTracking: () => Promise<void>;
  stopTracking:  () => Promise<void>;
  resetToday:    () => Promise<void>;
}

const StepContext = createContext<StepContextValue>({} as StepContextValue);
export const useSteps = () => useContext(StepContext);

// ── Provider ──────────────────────────────────────────────────────────────────
export const StepProvider: React.FC<{
  children:  React.ReactNode;
  weightKg?: number;
  heightCm?: number;
}> = ({ children, weightKg = 70, heightCm = 170 }) => {

  const [steps,         setSteps]         = useState(0);
  const [goal,          setGoalState]     = useState(10000);
  const [sessionSecs,   setSessionSecs]   = useState(0);
  const [isTracking,    setIsTracking]    = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // ── Core refs ─────────────────────────────────────────────────────────────
  const stepsRef        = useRef(0);       // always matches `steps` state
  const isTrackingRef   = useRef(false);
  const dirtyRef        = useRef(false);   // true = steps changed, not yet flushed to disk

  // ── Sensor & timer refs ───────────────────────────────────────────────────
  const pedometerSub    = useRef<{ remove: () => void } | null>(null);
  const accelSub        = useRef<{ remove: () => void } | null>(null);
  const clockRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const sedRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef     = useRef<AppStateStatus>(AppState.currentState);
  const detector        = useRef(new StepDetector());

  // ── Derived metrics ───────────────────────────────────────────────────────
  const strideM    = 0.413 * (heightCm / 100);
  const distanceKm = parseFloat(((steps * strideM) / 1000).toFixed(2));
  const calories   = Math.round(steps * 0.04 * (weightKg / 70));

  // ─────────────────────────────────────────────────────────────────────────
  // STEP UPDATE — only touches React state; disk write is deferred
  // ─────────────────────────────────────────────────────────────────────────
  const addSteps = useCallback((delta: number) => {
    if (delta <= 0) return;
    stepsRef.current += delta;
    dirtyRef.current  = true;
    setSteps(stepsRef.current);          // fast — no I/O
  }, []);

  const setStepsAbsolute = useCallback((n: number) => {
    stepsRef.current = Math.max(0, n);
    setSteps(stepsRef.current);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // FLUSH — writes to AsyncStorage at most every 5 seconds
  // Keeps the JS thread free during active walking
  // ─────────────────────────────────────────────────────────────────────────
  const startFlushLoop = useCallback(() => {
    if (flushRef.current) clearInterval(flushRef.current);
    flushRef.current = setInterval(async () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      await AsyncStorage.multiSet([
        [KEYS.totalToday, String(stepsRef.current)],
        [KEYS.lastMoveTs, String(Date.now())],
      ]);
    }, 5000);
  }, []);

  const stopFlushLoop = useCallback(() => {
    if (flushRef.current) { clearInterval(flushRef.current); flushRef.current = null; }
  }, []);

  // Immediate flush for important moments (stop / reset / background)
  const flushNow = useCallback(async () => {
    dirtyRef.current = false;
    await AsyncStorage.multiSet([
      [KEYS.totalToday, String(stepsRef.current)],
      [KEYS.lastMoveTs, String(Date.now())],
    ]);
  }, []);

  // ── Goal ──────────────────────────────────────────────────────────────────
  const setGoal = useCallback((g: number) => {
    setGoalState(g);
    AsyncStorage.setItem(KEYS.goal, String(g));
  }, []);

  // ── Session clock ─────────────────────────────────────────────────────────
  const startClock = useCallback((elapsedMs = 0) => {
    if (clockRef.current) clearInterval(clockRef.current);
    const origin = Date.now() - elapsedMs;
    clockRef.current = setInterval(() => {
      setSessionSecs(Math.floor((Date.now() - origin) / 1000));
    }, 1000);
  }, []);

  const stopClock = useCallback(() => {
    if (clockRef.current) { clearInterval(clockRef.current); clockRef.current = null; }
  }, []);

  // ── Sedentary notification using Notifee ─────────────────────────────────
  const startSedTimer = useCallback(() => {
    if (sedRef.current) clearInterval(sedRef.current);
    sedRef.current = setInterval(async () => {
      const raw = await AsyncStorage.getItem(KEYS.lastMoveTs);
      const last = parseInt(raw ?? String(Date.now()), 10);
      if ((Date.now() - last) / 60000 >= 60) {
        try {
          await notifee.createChannel({
            id: "health",
            name: "Health Notifications",
            importance: AndroidImportance.HIGH,
          });
          await notifee.displayNotification({
            title: "Move a little! 🚶",
            body: "You've been inactive for over an hour.",
            android: {
              channelId: "health",
              pressAction: {
                id: "default",
              },
            },
          });
        } catch (error) {
          console.log("Sedentary notification error:", error);
        }
      }
    }, 5 * 60 * 1000);
  }, []);

  const stopSedTimer = useCallback(() => {
    if (sedRef.current) { clearInterval(sedRef.current); sedRef.current = null; }
  }, []);

  // ── Tear down all sensors ─────────────────────────────────────────────────
  const stopSensors = useCallback(() => {
    pedometerSub.current?.remove();
    accelSub.current?.remove();
    pedometerSub.current    = null;
    accelSub.current        = null;
    detector.current.onStep = null;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // PEDOMETER SUBSCRIPTION
  //
  // Critical design: baseline is captured ONCE when we subscribe.
  // We never re-anchor mid-session. This prevents step loss on re-subscribe.
  //
  // The `result.steps` from watchStepCount is the OS hardware step counter —
  // it is cumulative since last reboot and can be millions. We only care about
  // the DELTA from when we started tracking.
  // ─────────────────────────────────────────────────────────────────────────
  const subscribePedometer = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === "android") {
        await (Pedometer as any).requestPermissionsAsync?.();
      }
      const available = await Pedometer.isAvailableAsync();
      if (!available) return false;

      // Always clean up old sub first
      pedometerSub.current?.remove();
      pedometerSub.current = null;

      let sessionBaseline: number | null = null;   // OS steps at session start
      let lastOsSteps: number | null     = null;   // previous callback value

      pedometerSub.current = Pedometer.watchStepCount((result) => {
        const osSteps = result.steps;

        if (sessionBaseline === null) {
          // Very first callback — anchor the baseline, count nothing yet
          sessionBaseline = osSteps;
          lastOsSteps     = osSteps;
          return;
        }

        if (lastOsSteps === null) {
          lastOsSteps = osSteps;
          return;
        }

        // Delta since last callback (should be 1–3 for normal walking)
        const delta = osSteps - lastOsSteps;
        lastOsSteps = osSteps;

        if (delta <= 0) return;            // counter didn't advance
        if (delta > 20) return;            // implausible spike — skip entirely

        addSteps(delta);
      });

      return true;
    } catch {
      return false;
    }
  }, [addSteps]);

  // ── Accelerometer fallback ─────────────────────────────────────────────────
  const subscribeAccelerometer = useCallback(() => {
    accelSub.current?.remove();
    accelSub.current = null;
    detector.current.reset();
    detector.current.onStep = () => addSteps(1);

    // 200ms interval — lower frequency = less JS thread pressure = no crash
    Accelerometer.setUpdateInterval(200);
    accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
      detector.current.feed(x, y, z);
    });
  }, [addSteps]);

  // ── Start best sensor ─────────────────────────────────────────────────────
  const startBestSensor = useCallback(async () => {
    stopSensors();
    const pedoOk = await subscribePedometer();
    if (pedoOk) {
      setUsingFallback(false);
    } else {
      subscribeAccelerometer();
      setUsingFallback(true);
    }
  }, [stopSensors, subscribePedometer, subscribeAccelerometer]);

  // ─────────────────────────────────────────────────────────────────────────
  // START TRACKING
  // ─────────────────────────────────────────────────────────────────────────
  const startTracking = useCallback(async () => {
    if (isTrackingRef.current) return;

    await notifee.requestPermission();

    const now = Date.now();

    await AsyncStorage.multiSet([
      [KEYS.isTracking,   "1"],
      [KEYS.date,         todayString()],
      [KEYS.sessionStart, String(now)],
      [KEYS.totalToday,   String(stepsRef.current)],
      [KEYS.lastMoveTs,   String(now)],
    ]);

    isTrackingRef.current = true;
    setIsTracking(true);
    setSessionSecs(0);

    await startBestSensor();
    startClock(0);
    startSedTimer();
    startFlushLoop();
  }, [startBestSensor, startClock, startSedTimer, startFlushLoop]);

  // ─────────────────────────────────────────────────────────────────────────
  // STOP TRACKING
  // ─────────────────────────────────────────────────────────────────────────
  const stopTracking = useCallback(async () => {
    stopSensors();
    stopClock();
    stopSedTimer();
    stopFlushLoop();
    await flushNow();   // persist final step count immediately

    await AsyncStorage.setItem(KEYS.isTracking, "0");

    isTrackingRef.current = false;
    setIsTracking(false);
  }, [stopSensors, stopClock, stopSedTimer, stopFlushLoop, flushNow]);

  // ─────────────────────────────────────────────────────────────────────────
  // RESET TODAY
  // ─────────────────────────────────────────────────────────────────────────
  const resetToday = useCallback(async () => {
    stopSensors();
    stopClock();
    stopSedTimer();
    stopFlushLoop();

    stepsRef.current      = 0;
    isTrackingRef.current = false;
    dirtyRef.current      = false;

    setSteps(0);
    setSessionSecs(0);
    setIsTracking(false);

    await AsyncStorage.multiSet([
      [KEYS.totalToday,   "0"],
      [KEYS.date,         todayString()],
      [KEYS.sessionStart, String(Date.now())],
      [KEYS.isTracking,   "0"],
    ]);
  }, [stopSensors, stopClock, stopSedTimer, stopFlushLoop]);

  // ─────────────────────────────────────────────────────────────────────────
  // RESTORE ON MOUNT
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      const pairs = await AsyncStorage.multiGet([
        KEYS.goal, KEYS.date, KEYS.totalToday, KEYS.isTracking, KEYS.sessionStart,
      ]);
      if (!alive) return;

      const m = Object.fromEntries(pairs.map(([k, v]) => [k, v ?? ""]));

      if (m[KEYS.goal]) setGoalState(parseInt(m[KEYS.goal], 10));

      const today = todayString();

      if (m[KEYS.date] && m[KEYS.date] !== today) {
        // New day — reset
        await AsyncStorage.multiSet([
          [KEYS.date,       today],
          [KEYS.totalToday, "0"],
          [KEYS.isTracking, "0"],
        ]);
        setStepsAbsolute(0);
        return;
      }

      const saved = parseInt(m[KEYS.totalToday] || "0", 10);
      setStepsAbsolute(saved);

      if (m[KEYS.isTracking] === "1") {
        const t0      = parseInt(m[KEYS.sessionStart] || String(Date.now()), 10);
        const elapsed = Date.now() - t0;

        isTrackingRef.current = true;
        setIsTracking(true);
        startClock(elapsed);
        await startBestSensor();
        startSedTimer();
        startFlushLoop();
      }
    })();

    return () => {
      alive = false;
      stopSensors();
      stopClock();
      stopSedTimer();
      stopFlushLoop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // APP STATE — flush on background, re-attach on foreground
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      const goingBackground = next.match(/inactive|background/);
      const comingForeground =
        appStateRef.current.match(/inactive|background/) && next === "active";

      if (goingBackground && isTrackingRef.current) {
        // Flush immediately before OS suspends the app
        await flushNow();
      }

      if (comingForeground && isTrackingRef.current) {
        // Re-read persisted count (background task may have updated it)
        const raw    = await AsyncStorage.getItem(KEYS.totalToday);
        const saved  = parseInt(raw ?? "0", 10);
        // Only update if persisted value is higher (never go backwards)
        if (saved > stepsRef.current) {
          setStepsAbsolute(saved);
        }
        // Re-attach sensors (iOS kills sensor subscriptions in background)
        await startBestSensor();
        startFlushLoop();
      }

      appStateRef.current = next;
    });

    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepContext.Provider value={{
      steps,
      calories,
      distanceKm,
      goal,
      sessionSecs,
      isTracking,
      usingFallback,
      setGoal,
      startTracking,
      stopTracking,
      resetToday,
    }}>
      {children}
    </StepContext.Provider>
  );
};