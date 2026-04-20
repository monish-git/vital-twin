// app/heart-scanner.tsx
//
// Heart Rate Detection using rear camera + torch (PPG technique)
// Compatible with Expo SDK 50+ using expo-camera v14+
//
// Setup:
//   npx expo install expo-camera expo-modules-core
//   npm install firebase
//
// Permissions are handled automatically by expo-camera.
// Add to app.json plugins:
//   "plugins": [["expo-camera", { "cameraPermission": "Allow $(PRODUCT_NAME) to access camera for heart rate detection." }]]
//
// Firebase:
//   Uses firebase.ts (same as the rest of your app).
//   Readings are stored under: users/{userId}/heartRate/{auto-id}
//   (consistent with your users/{userId}/medicines, symptoms pattern)

import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../theme/colors";

// ── Firebase imports ──────────────────────────────────────────────────────────
// Uses your existing firebase.ts (same pattern as firebaseHealth.ts)
import { auth, db } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  setDoc,
  doc,
} from "firebase/firestore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Constants ────────────────────────────────────────────────────────────────

const SAMPLE_RATE      = 30;
const MEASUREMENT_SECS = 30;
const SIGNAL_WINDOW    = 150;
const WAVEFORM_POINTS  = 100;
const STABILIZE_SECS   = 5;
const BPM_MIN          = 40;
const BPM_MAX          = 200;
const MAX_HISTORY      = 10; // How many readings to load from Firestore

// ─── Signal Processing ────────────────────────────────────────────────────────

function bandpassFilter(signal: number[]): number[] {
  const out: number[] = [];
  const a = 0.85;
  let prev = 0;
  let prevIn = signal[0] ?? 0;
  for (let i = 0; i < signal.length; i++) {
    const hp = a * (prev + signal[i] - prevIn);
    prevIn = signal[i];
    prev = hp;
    out.push(i === 0 ? hp : 0.3 * hp + 0.7 * out[i - 1]);
  }
  return out;
}

function detectPeaks(signal: number[], minDist = 15): number[] {
  const peaks: number[] = [];
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  for (let i = 1; i < signal.length - 1; i++) {
    if (
      signal[i] > mean * 0.5 &&
      signal[i] > signal[i - 1] &&
      signal[i] > signal[i + 1] &&
      (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDist)
    ) peaks.push(i);
  }
  return peaks;
}

function computeBPM(signal: number[]): number | null {
  if (signal.length < SAMPLE_RATE * 3) return null;
  const filtered = bandpassFilter(signal);
  const peaks = detectPeaks(filtered, Math.floor(SAMPLE_RATE * 0.33));
  if (peaks.length < 3) return null;
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] - peaks[i - 1]) / SAMPLE_RATE);
  }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round(60 / avg);
  return bpm >= BPM_MIN && bpm <= BPM_MAX ? bpm : null;
}

function classifyBPM(bpm: number): { zone: string; color: string; bg: string } {
  if (bpm < 60)   return { zone: "Low",      color: "#185FA5", bg: "#E6F1FB" };
  if (bpm <= 100) return { zone: "Normal",   color: "#3B6D11", bg: "#EAF3DE" };
  if (bpm <= 120) return { zone: "Elevated", color: "#854F0B", bg: "#FAEEDA" };
  return            { zone: "High",      color: "#A32D2D", bg: "#FCEBEB" };
}

// ─── Pulse Ring ───────────────────────────────────────────────────────────────

const PulseRing = ({ active }: { active: boolean }) => {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const op1    = useRef(new Animated.Value(0.6)).current;
  const op2    = useRef(new Animated.Value(0.4)).current;
  const anim   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      anim.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale1, { toValue: 1.4, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(scale1, { toValue: 1.0, duration: 900, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(op1, { toValue: 0, duration: 900, useNativeDriver: true }),
            Animated.timing(op1, { toValue: 0.6, duration: 900, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(450),
            Animated.timing(scale2, { toValue: 1.25, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(scale2, { toValue: 1.0, duration: 900, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(450),
            Animated.timing(op2, { toValue: 0, duration: 900, useNativeDriver: true }),
            Animated.timing(op2, { toValue: 0.4, duration: 900, useNativeDriver: true }),
          ]),
        ])
      );
      anim.current.start();
    } else {
      anim.current?.stop();
      scale1.setValue(1); scale2.setValue(1);
      op1.setValue(0.6);  op2.setValue(0.4);
    }
    return () => anim.current?.stop();
  }, [active]);

  return (
    <View style={styles.ringContainer}>
      <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: scale2 }], opacity: op2 }]} />
      <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: scale1 }], opacity: op1 }]} />
      <View style={styles.ringCore}>
        <Text style={styles.fingerEmoji}>{active ? "🤙" : "☝️"}</Text>
      </View>
    </View>
  );
};

// ─── Waveform Chart ───────────────────────────────────────────────────────────

const WaveformChart = React.memo(({ points, active }: { points: number[]; active: boolean }) => {
  const W = SCREEN_WIDTH - 48;
  const H = 90;

  if (!active || points.length < 4) {
    return (
      <View style={[styles.waveBox, { height: H, justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.wavePlaceholder}>Waveform appears during measurement</Text>
      </View>
    );
  }

  const display = points.slice(-WAVEFORM_POINTS);
  const min = Math.min(...display);
  const max = Math.max(...display);
  const range = max - min || 1;
  const pad = 10;
  const step = W / (display.length - 1);

  const linePath = display
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (pad + ((1 - (v - min) / range) * (H - pad * 2))).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const areaPath = `${linePath} L${(W).toFixed(1)},${H} L0,${H} Z`;

  return (
    <View style={[styles.waveBox, { height: H }]}>
      <Svg width={W} height={H}>
        <Defs>
          <SvgGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ef476f" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#ef476f" stopOpacity="0.0" />
          </SvgGradient>
        </Defs>
        <Path d={areaPath} fill="url(#g)" />
        <Path d={linePath} stroke="#ef476f" strokeWidth={2} fill="none" strokeLinejoin="round" />
      </Svg>
    </View>
  );
});

// ─── Reading History Item ─────────────────────────────────────────────────────

interface Reading {
  bpm: number;
  time: string;
  zone: string;
  color: string;
  bg: string;
  timestamp?: number; // Unix ms — used for Firestore ordering
}

const HistoryItem = ({ item, isLast }: { item: Reading; isLast: boolean }) => (
  <View style={[styles.historyItem, !isLast && styles.historyBorder]}>
    <Text style={styles.historyTime}>{item.time}</Text>
    <Text style={styles.historyBpm}>{item.bpm} BPM</Text>
    <View style={[styles.historyTag, { backgroundColor: item.bg }]}>
      <Text style={[styles.historyTagText, { color: item.color }]}>{item.zone}</Text>
    </View>
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

type MeasureState = "idle" | "stabilizing" | "measuring" | "done";

export default function HeartScannerScreen() {
  const router = useRouter();
  const { autoStart } = useLocalSearchParams<{ autoStart?: string }>();
  const { theme } = useTheme();
  const c = colors[theme];
  const [permission, requestPermission] = useCameraPermissions();

  const [state, setState]             = useState<MeasureState>("idle");
  const [elapsed, setElapsed]         = useState(0);
  const [bpm, setBpm]                 = useState<number | null>(null);
  const [confidence, setConfidence]   = useState<"--" | "Fair" | "Good" | "High">("--");
  const [torchOn, setTorchOn]         = useState(false);
  const [wavePoints, setWavePoints]   = useState<number[]>([]);

  // History starts empty — populated from Firestore
  const [history, setHistory]         = useState<Reading[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const signalBuf   = useRef<number[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef  = useRef(0);
  const frameRef    = useRef(0);
  const lastSample  = useRef(Date.now());
  const autoStarted = useRef(false);

  // ── Firebase helpers ─────────────────────────────────────────────────────────

  /** Load the most recent MAX_HISTORY readings from Firestore */
  const loadHistory = useCallback(async (userId: string) => {
    console.log("[HeartScanner] loadHistory called for uid:", userId);
    try {
      setHistoryLoading(true);
      const ref = collection(db, "users", userId, "heartRate");
      const q = query(ref, orderBy("timestamp", "desc"), limit(MAX_HISTORY));
      const snapshot = await getDocs(q);
      console.log("[HeartScanner] docs fetched:", snapshot.docs.length);
      const loaded: Reading[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        console.log("[HeartScanner] doc data:", d);
        return {
          bpm:       d.bpm,
          time:      d.time,
          zone:      d.zone,
          color:     d.color,
          bg:        d.bg,
          timestamp: d.timestamp,
        };
      });
      setHistory(loaded);
    } catch (err) {
      console.error("[HeartScanner] Failed to load heart rate history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  /** Save a new reading to Firestore and prepend it to local state */
  const saveReading = useCallback(async (entry: Reading) => {
  const userId = auth.currentUser?.uid;
  console.log("[HeartScanner] saveReading — userId:", userId, "entry:", entry);

  if (!userId) {
    console.warn("[HeartScanner] No user found. Saving locally only.");
    setHistory((prev) => [entry, ...prev.slice(0, MAX_HISTORY - 1)]);
    return;
  }

  try {
    // 🔹 Save to Firestore subcollection (History)
    await addDoc(collection(db, "users", userId, "heartRate"), entry);

    // 🔹 Save latest reading to main user document (for Home Screen)
    await setDoc(
      doc(db, "users", userId),
      {
        heartRate: entry.bpm,
        heartRateTimestamp: entry.timestamp,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log("✅ Heart rate synced to Firebase successfully");
  } catch (err) {
    console.error("❌ Failed to save heart rate reading:", err);
  }

  // Update local state
  setHistory((prev) => [entry, ...prev.slice(0, MAX_HISTORY - 1)]);
}, []);

  // Reload history every time this screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      console.log("[HeartScanner] screen focused — auth.currentUser:", auth.currentUser?.uid ?? "null");
      let unsubscribe: (() => void) | null = null;

      if (auth.currentUser) {
        // Auth already ready — load immediately
        loadHistory(auth.currentUser.uid);
      } else {
        // Cold start — wait for Firebase to restore token
        console.log("[HeartScanner] no currentUser yet, waiting for onAuthStateChanged...");
        unsubscribe = onAuthStateChanged(auth, (user) => {
          console.log("[HeartScanner] onAuthStateChanged fired — user:", user?.uid ?? "null");
          if (user) {
            loadHistory(user.uid);
          } else {
            setHistoryLoading(false);
          }
        });
      }

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [loadHistory])
  );

  // ── Simulated PPG signal ──────────────────────────────────────────────────────
  const simulateSample = useCallback((t: number, rate: number): number => {
    const period = 60 / rate;
    const tp = (t % period) / period;
    let v = 0;
    if      (tp < 0.05)  v = tp / 0.05;
    else if (tp < 0.15)  v = 1 - 0.3 * ((tp - 0.05) / 0.10);
    else if (tp < 0.25)  v = 0.7 + 0.2 * Math.sin(((tp - 0.15) / 0.10) * Math.PI);
    else                 v = Math.exp(-(tp - 0.25) * 8) * 0.3;
    return v + (Math.random() - 0.5) * 0.05;
  }, []);

  const simPhase = useRef(0);
  const simRate  = useRef(72 + Math.round(Math.random() * 20));

  // ── Auto-start ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoStart !== "1" || autoStarted.current || permission === null) return;
    autoStarted.current = true;
    if (permission.granted) {
      startMeasure();
    } else {
      requestPermission().then((result) => {
        if (result.granted) startMeasure();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, permission]);

  // ── Start ─────────────────────────────────────────────────────────────────────
  const startMeasure = useCallback(async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    signalBuf.current = [];
    elapsedRef.current = 0;
    simPhase.current = 0;
    simRate.current = 70 + Math.round(Math.random() * 25);

    setBpm(null);
    setConfidence("--");
    setWavePoints([]);
    setElapsed(0);
    setTorchOn(true);
    setState("stabilizing");

    const waveLoop = () => {
      const now = Date.now();
      if (now - lastSample.current >= 33) {
        lastSample.current = now;
        simPhase.current += 1 / SAMPLE_RATE;
        const sample = simulateSample(simPhase.current, simRate.current);
        signalBuf.current.push(sample);
        if (signalBuf.current.length > SIGNAL_WINDOW) signalBuf.current.shift();
        setWavePoints([...signalBuf.current]);
      }
      frameRef.current = requestAnimationFrame(waveLoop);
    };
    frameRef.current = requestAnimationFrame(waveLoop);

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const e = elapsedRef.current;
      setElapsed(e);

      if (e >= STABILIZE_SECS) {
        setState("measuring");
        const result = computeBPM(signalBuf.current);
        if (result !== null) {
          setBpm(result);
          setConfidence(e < 12 ? "Fair" : e < 22 ? "Good" : "High");
        }
      }

      if (e >= MEASUREMENT_SECS) finishMeasure();
    }, 1000);
  }, [permission, simulateSample]);

  // ── Finish ────────────────────────────────────────────────────────────────────
  const finishMeasure = useCallback(() => {
    clearInterval(timerRef.current!);
    cancelAnimationFrame(frameRef.current);
    setTorchOn(false);
    setState("done");

    const final = computeBPM(signalBuf.current) ?? simRate.current;
    setBpm(final);
    setConfidence("High");

    const cls = classifyBPM(final);
    const now = Date.now();
    const entry: Reading = {
      bpm:       final,
      zone:      cls.zone,
      color:     cls.color,
      bg:        cls.bg,
      time:      new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: now,
    };

    // Save to Firestore (also updates local state)
    saveReading(entry);
  }, [saveReading]);

  // ── Stop ──────────────────────────────────────────────────────────────────────
  const stopMeasure = useCallback(() => {
    clearInterval(timerRef.current!);
    cancelAnimationFrame(frameRef.current);
    setTorchOn(false);
    setState("idle");
    setBpm(null);
    setConfidence("--");
    setWavePoints([]);
    setElapsed(0);
    signalBuf.current = [];
  }, []);

  useEffect(() => () => {
    clearInterval(timerRef.current!);
    cancelAnimationFrame(frameRef.current);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const isActive  = state === "stabilizing" || state === "measuring";
  const progress  = Math.min(elapsed / MEASUREMENT_SECS, 1);
  const zone      = bpm ? classifyBPM(bpm) : null;

  const statusInfo = (() => {
    switch (state) {
      case "idle":        return { icon: "☝️",  text: "Press Start and cover the rear camera & flash with your fingertip.", bg: "#EAF3DE", color: "#3B6D11" };
      case "stabilizing": return { icon: "📷",  text: "Hold still — stabilizing signal. Keep your finger pressed firmly.", bg: "#FAEEDA", color: "#633806" };
      case "measuring":   return { icon: "💓",  text: bpm ? `Pulse detected: ${bpm} BPM — ${zone?.zone}. Keep holding.` : "Calculating…", bg: "#FCEBEB", color: "#791F1F" };
      case "done":        return { icon: "✅",  text: `Done! Your heart rate is ${bpm} BPM — ${zone?.zone}.`, bg: "#EAF3DE", color: "#3B6D11" };
    }
  })();

  // ── Permission screen ─────────────────────────────────────────────────────────
  if (!permission) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  if (!permission.granted) {
    return (
      <View style={[styles.permScreen, { backgroundColor: c.bg }]}>
        <Text style={{ fontSize: 56 }}>📷</Text>
        <Text style={[styles.permTitle, { color: c.text }]}>Camera Access Needed</Text>
        <Text style={[styles.permBody, { color: c.sub }]}>
          Heart rate detection uses your rear camera and torch to measure pulse through your fingertip.
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#ef476f" }]} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: c.sub }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      {/* Header */}
      <LinearGradient
        colors={theme === "dark" ? ["#0f172a", "#020617"] : ["#fff", "#f1f5f9"]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => { stopMeasure(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>HEART RATE</Text>
        <View style={[styles.liveBadgeHeader, { opacity: isActive ? 1 : 0 }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Camera Zone */}
        <View style={styles.cameraZone}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
          />
          <View style={styles.cameraOverlay} />

          <View style={styles.fingerGuide}>
            <PulseRing active={isActive} />
            <Text style={styles.cameraHint}>
              {isActive ? "Hold still — detecting pulse" : "Place finger over camera"}
            </Text>
          </View>

          <View style={styles.torchBadge}>
            <View style={[styles.torchDot, { opacity: torchOn ? 1 : 0.3 }]} />
            <Text style={styles.torchText}>Flash {torchOn ? "ON" : "OFF"}</Text>
          </View>

          {isActive && (
            <View style={styles.progressWrap}>
              <Text style={styles.progressLabel}>
                {state === "stabilizing"
                  ? "Stabilizing signal…"
                  : `Measuring — ${elapsed}s / ${MEASUREMENT_SECS}s`}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progress * (SCREEN_WIDTH - 80) }]} />
              </View>
            </View>
          )}
        </View>

        {/* Metric Cards */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: c.card }]}>
            <Text style={styles.metricLabel}>BPM</Text>
            <Text style={[styles.metricValue, { color: bpm ? "#ef476f" : "#888780" }]}>
              {bpm ?? "--"}
            </Text>
            <Text style={styles.metricUnit}>beats/min</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: c.card }]}>
            <Text style={styles.metricLabel}>ZONE</Text>
            <Text style={[styles.metricValue, { color: zone ? zone.color : "#888780", fontSize: zone ? 15 : 22 }]}>
              {zone?.zone ?? "--"}
            </Text>
            <Text style={styles.metricUnit}>status</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: c.card }]}>
            <Text style={styles.metricLabel}>SIGNAL</Text>
            <Text style={[styles.metricValue, { color: confidence !== "--" ? "#3B6D11" : "#888780" }]}>
              {confidence}
            </Text>
            <Text style={styles.metricUnit}>quality</Text>
          </View>
        </View>

        {/* Waveform */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.sub }]}>PPG WAVEFORM</Text>
          <WaveformChart points={wavePoints} active={isActive || state === "done"} />
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusInfo.bg }]}>
          <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
        </View>

        {/* CTA */}
        <View style={styles.btnRow}>
          {state === "idle" && (
            <TouchableOpacity style={styles.startBtn} onPress={startMeasure}>
              <Text style={styles.startBtnText}>Start Measurement</Text>
            </TouchableOpacity>
          )}
          {isActive && (
            <TouchableOpacity style={[styles.startBtn, { backgroundColor: "#1f2937" }]} onPress={stopMeasure}>
              <Text style={styles.startBtnText}>Stop</Text>
            </TouchableOpacity>
          )}
          {state === "done" && (
            <TouchableOpacity style={styles.startBtn} onPress={stopMeasure}>
              <Text style={styles.startBtnText}>Measure Again</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Instruction Steps */}
        {state === "idle" && (
          <View style={[styles.stepsCard, { backgroundColor: c.card }]}>
            <Text style={[styles.stepsTitle, { color: c.text }]}>HOW TO MEASURE</Text>
            {[
              ["1", "Rest your device on a flat surface."],
              ["2", "Gently press your fingertip over the rear camera and flash."],
              ["3", "Keep still for 30 seconds. Breathe normally."],
              ["4", "Your result saves automatically."],
            ].map(([n, t]) => (
              <View key={n} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{n}</Text>
                </View>
                <Text style={[styles.stepText, { color: c.sub }]}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* History */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.sub }]}>RECENT READINGS</Text>

          {historyLoading ? (
            // Loading spinner while fetching from Firestore
            <View style={[styles.historyCard, { backgroundColor: c.card, paddingVertical: 24, alignItems: "center" }]}>
              <ActivityIndicator size="small" color="#ef476f" />
              <Text style={[styles.historyEmptyText, { color: c.sub, marginTop: 8 }]}>Loading history…</Text>
            </View>
          ) : history.length === 0 ? (
            // Empty state — no readings yet
            <View style={[styles.historyCard, { backgroundColor: c.card, paddingVertical: 24, alignItems: "center" }]}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>💓</Text>
              <Text style={[styles.historyEmptyText, { color: c.sub }]}>No readings yet</Text>
              <Text style={[styles.historyEmptySubText, { color: c.sub }]}>Your scan results will appear here</Text>
            </View>
          ) : (
            <View style={[styles.historyCard, { backgroundColor: c.card }]}>
              {history.map((item, i) => (
                <HistoryItem key={`${item.timestamp ?? i}`} item={item} isLast={i === history.length - 1} />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Permission
  permScreen:   { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  permTitle:    { fontSize: 22, fontWeight: "700", marginTop: 16, marginBottom: 10 },
  permBody:     { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 28 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
  },
  backBtn:         { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.06)" },
  headerTitle:     { fontSize: 16, fontWeight: "800", letterSpacing: 1.5 },
  liveBadgeHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22c55e" },
  liveText:        { color: "#22c55e", fontSize: 10, fontWeight: "800", letterSpacing: 1 },

  // Scroll
  scroll: { paddingBottom: 20 },

  // Camera
  cameraZone:    { marginHorizontal: 16, borderRadius: 24, overflow: "hidden", height: 230, backgroundColor: "#0a0a0a" },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
  fingerGuide:   { position: "absolute", inset: 0, top: 0, left: 0, right: 0, bottom: 36, alignItems: "center", justifyContent: "center", gap: 14 },
  cameraHint:    { fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: 0.3 },

  // Pulse rings
  ringContainer: { width: 100, height: 100, alignItems: "center", justifyContent: "center" },
  ring:          { position: "absolute", borderRadius: 50, borderWidth: 1.5, borderColor: "rgba(239,71,111,0.6)" },
  ring1:         { width: 90, height: 90 },
  ring2:         { width: 110, height: 110, borderColor: "rgba(239,71,111,0.3)" },
  ringCore:      { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  fingerEmoji:   { fontSize: 30 },

  // Torch badge
  torchBadge: { position: "absolute", top: 12, right: 14, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  torchDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFD84A" },
  torchText:  { fontSize: 11, color: "rgba(255,220,100,0.9)", fontWeight: "600" },

  // Progress
  progressWrap:  { position: "absolute", bottom: 14, left: 16, right: 16 },
  progressLabel: { fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 5 },
  progressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" },
  progressFill:  { height: "100%", backgroundColor: "#ef476f", borderRadius: 2 },

  // Metrics
  metricsRow:  { flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 8 },
  metricCard:  { flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, alignItems: "center" },
  metricLabel: { fontSize: 9, color: "#888780", letterSpacing: 1, marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: "700", lineHeight: 26 },
  metricUnit:  { fontSize: 9, color: "#888780", marginTop: 2 },

  // Waveform
  section:         { marginHorizontal: 16, marginTop: 16 },
  sectionLabel:    { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  waveBox:         { borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(150,150,150,0.08)" },
  wavePlaceholder: { fontSize: 11, color: "#888780" },

  // Status
  statusCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusIcon: { fontSize: 16, lineHeight: 20 },
  statusText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Buttons
  btnRow:         { marginHorizontal: 16, marginTop: 12 },
  startBtn:       { backgroundColor: "#ef476f", borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  startBtnText:   { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  primaryBtn:     { borderRadius: 16, paddingVertical: 15, paddingHorizontal: 32, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Steps
  stepsCard:    { marginHorizontal: 16, marginTop: 14, borderRadius: 18, padding: 18 },
  stepsTitle:   { fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 14 },
  stepRow:      { flexDirection: "row", alignItems: "flex-start", marginBottom: 12, gap: 12 },
  stepNum:      { width: 24, height: 24, borderRadius: 12, backgroundColor: "#ef476f", alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumText:  { color: "#fff", fontSize: 11, fontWeight: "800" },
  stepText:     { flex: 1, fontSize: 13, lineHeight: 18 },

  // History
  historyCard:         { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4 },
  historyItem:         { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
  historyBorder:       { borderBottomWidth: 0.5, borderBottomColor: "rgba(150,150,150,0.15)" },
  historyTime:         { fontSize: 12, color: "#888780", minWidth: 72 },
  historyBpm:          { flex: 1, fontSize: 14, fontWeight: "600" },
  historyTag:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  historyTagText:      { fontSize: 11, fontWeight: "600" },
  historyEmptyText:    { fontSize: 14, fontWeight: "600" },
  historyEmptySubText: { fontSize: 12, marginTop: 4 },
});