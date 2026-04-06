// app/brain/ReactionTest.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Reaction Speed — wait for green, tap as fast as possible
// Cognitive domain: Processing speed + inhibitory control (don't tap on red)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { GameResult, scoreReactionTime } from "./brainEngine";

type Phase = "countdown" | "waiting" | "ready" | "tapped" | "toosoon" | "done";

type Props = {
  onDone: (result: GameResult) => void;
};

const ROUNDS          = 6;
const MIN_WAIT_MS     = 1500;
const MAX_WAIT_MS     = 4500;
const TOO_SOON_DELAY  = 1500; // penalty wait before next round

export default function ReactionTest({ onDone }: Props) {
  const { theme } = useTheme();
  
  const colors = theme === "light"
    ? {
        background: "#f8fafc",
        card: "#ffffff",
        card2: "#f1f5f9",
        text: "#020617",
        subText: "#475569",
        subText2: "#64748b",
        border: "#e2e8f0",
        border2: "#cbd5e1",
        gameTag: "#38bdf8",
        countdownText: "#020617",
        hintText: "#64748b",
        progressDotBg: "#cbd5e1",
        progressDone: "#22c55e",
        progressActive: "#38bdf8",
        tapZoneWaiting: "#e2e8f0",
        tapZoneReady: "#22c55e",
        tapZoneTooSoon: "#ef4444",
        tapZoneTapped: "#38bdf8",
        tapZoneDefault: "#94a3b8",
        tapZoneShadow: "#22c55e",
        tapIconText: "#ffffff",
        tapSubText: "rgba(0,0,0,0.4)",
        speedLabel: "#f59e0b",
        statValue: "#020617",
        statLabel: "#64748b",
        bgWaiting: "#f1f5f9",
        bgReady: "#dcfce7",
        bgTooSoon: "#fee2e2",
        bgTapped: "#e0f2fe",
        bgDefault: "#f1f5f9",
      }
    : {
        background: "#020617",
        card: "#0f172a",
        card2: "#1e293b",
        text: "#ffffff",
        subText: "#94a3b8",
        subText2: "#64748b",
        border: "#334155",
        border2: "#475569",
        gameTag: "#38bdf8",
        countdownText: "#ffffff",
        hintText: "#64748b",
        progressDotBg: "#1e293b",
        progressDone: "#22c55e",
        progressActive: "#38bdf8",
        tapZoneWaiting: "#1e293b",
        tapZoneReady: "#22c55e",
        tapZoneTooSoon: "#ef4444",
        tapZoneTapped: "#0ea5e9",
        tapZoneDefault: "#0f172a",
        tapZoneShadow: "#22c55e",
        tapIconText: "#ffffff",
        tapSubText: "rgba(255,255,255,0.4)",
        speedLabel: "#f59e0b",
        statValue: "#ffffff",
        statLabel: "#475569",
        bgWaiting: "#0f172a",
        bgReady: "#052e16",
        bgTooSoon: "#2d0707",
        bgTapped: "#0d1f12",
        bgDefault: "#0f172a",
      };

  const [phase,       setPhase]       = useState<Phase>("countdown");
  const [countdown,   setCountdown]   = useState(3);
  const [round,       setRound]       = useState(0);
  const [reactionMs,  setReactionMs]  = useState<number | null>(null);
  const [allTimes,    setAllTimes]    = useState<number[]>([]);
  const [tooSoonCount, setTooSoonCount] = useState(0);

  const readyTimeRef  = useRef<number>(0);
  const waitTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnim     = useRef(new Animated.Value(0.8)).current;
  const glowAnim      = useRef(new Animated.Value(0)).current;

  const popIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 6,
    }).start();
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [scaleAnim, glowAnim]);

  const popOut = useCallback(() => {
    scaleAnim.setValue(0.8);
    glowAnim.setValue(0);
  }, [scaleAnim, glowAnim]);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) { beginRound(0); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Begin round — schedule the green light ────────────────────────────────
  const beginRound = useCallback((r: number) => {
    setRound(r);
    setReactionMs(null);
    popOut();
    setPhase("waiting");

    const delay = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    waitTimerRef.current = setTimeout(() => {
      readyTimeRef.current = Date.now();
      setPhase("ready");
      popIn();
      Vibration.vibrate(30);
    }, delay);
  }, [popIn, popOut]);

  // cleanup on unmount
  useEffect(() => () => { if (waitTimerRef.current) clearTimeout(waitTimerRef.current); }, []);

  // ── User taps ─────────────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    if (phase === "waiting") {
      // Tapped too early!
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
      setPhase("toosoon");
      setTooSoonCount(c => c + 1);
      Vibration.vibrate([0, 80, 60, 80]);
      setTimeout(() => beginRound(round), TOO_SOON_DELAY);
      return;
    }

    if (phase !== "ready") return;

    const elapsed = Date.now() - readyTimeRef.current;
    setReactionMs(elapsed);
    setAllTimes(prev => {
      const next = [...prev, elapsed];

      const nextRound = round + 1;
      if (nextRound >= ROUNDS) {
        // done — calculate result
        const avg = next.reduce((a, b) => a + b, 0) / next.length;
        const best = Math.min(...next);
        const score = scoreReactionTime(avg);

        setTimeout(() => {
          onDone({
            game:     "reaction",
            score,
            rawScore: Math.round(avg),
            accuracy: Math.max(0, 1 - tooSoonCount / ROUNDS),
            avgTimeMs: avg,
            label:   "Reaction Speed",
          });
        }, 800);

        setPhase("done");
      } else {
        setPhase("tapped");
        setTimeout(() => beginRound(nextRound), 900);
      }
      return next;
    });
  }, [phase, round, tooSoonCount, beginRound, onDone]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const avgTime = allTimes.length
    ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
    : null;

  const speedLabel = reactionMs
    ? reactionMs < 200 ? "⚡ Lightning!"
    : reactionMs < 300 ? "🔥 Fast!"
    : reactionMs < 450 ? "👍 Good"
    : reactionMs < 600 ? "🐢 Slow"
    : "😴 Very Slow"
    : null;

  const bgColor =
    phase === "waiting"  ? colors.bgWaiting :
    phase === "ready"    ? colors.bgReady :
    phase === "toosoon"  ? colors.bgTooSoon :
    phase === "tapped"   ? colors.bgTapped :
    colors.bgDefault;

  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <View style={[s.full, { backgroundColor: colors.card }]}>
        <Text style={[s.gameTag, { color: colors.gameTag }]}>REACTION SPEED</Text>
        <Text style={[s.countdownNum, { color: colors.countdownText }]}>{countdown || "GO!"}</Text>
        <Text style={[s.hint, { color: colors.hintText }]}>Wait for GREEN{"\n"}Tap as fast as you can{"\n"}Don't tap on RED — penalty!</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[s.full, { backgroundColor: bgColor }]}
      onPress={handleTap}
    >
      {/* Round dots */}
      <View style={s.progressRow}>
        {Array.from({ length: ROUNDS }).map((_, i) => (
          <View
            key={i}
            style={[
              s.progressDot,
              { backgroundColor: colors.progressDotBg },
              i < allTimes.length && { backgroundColor: colors.progressDone },
              i === round && phase !== "done" && { backgroundColor: colors.progressActive, width: 24 },
            ]}
          />
        ))}
      </View>

      {/* Central tap zone */}
      <Animated.View style={[
        s.tapZone,
        {
          transform: [{ scale: scaleAnim }],
          backgroundColor:
            phase === "ready"   ? colors.tapZoneReady :
            phase === "toosoon" ? colors.tapZoneTooSoon :
            phase === "tapped"  ? colors.tapZoneTapped :
            phase === "waiting" ? colors.tapZoneWaiting :
            colors.tapZoneDefault,
          shadowColor:
            phase === "ready" ? colors.tapZoneShadow : "transparent",
          shadowRadius: 32,
          shadowOpacity: 0.6,
          elevation: phase === "ready" ? 20 : 0,
        },
      ]}>
        <Text style={[s.tapIcon, { color: colors.tapIconText }]}>
          {phase === "waiting"  ? "⏳" :
           phase === "ready"    ? "TAP!" :
           phase === "toosoon"  ? "TOO\nEARLY" :
           phase === "tapped"   ? `${reactionMs}ms` :
           phase === "done"     ? "✓" : ""}
        </Text>
        {phase === "waiting" && (
          <Text style={[s.tapSub, { color: colors.tapSubText }]}>Wait for green...</Text>
        )}
      </Animated.View>

      {/* Speed label */}
      {speedLabel && phase === "tapped" && (
        <Text style={[s.speedLabel, { color: colors.speedLabel }]}>{speedLabel}</Text>
      )}

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: colors.statValue }]}>{reactionMs ?? "—"}</Text>
          <Text style={[s.statLabel, { color: colors.statLabel }]}>Last (ms)</Text>
        </View>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: colors.statValue }]}>{avgTime ?? "—"}</Text>
          <Text style={[s.statLabel, { color: colors.statLabel }]}>Avg (ms)</Text>
        </View>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: colors.tapZoneTooSoon }]}>{tooSoonCount}</Text>
          <Text style={[s.statLabel, { color: colors.statLabel }]}>Early taps</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  full:          { flex: 1, justifyContent: "center", alignItems: "center" },
  gameTag:       { fontSize: 11, fontWeight: "800", letterSpacing: 3, marginBottom: 24, position: "absolute", top: 60 },
  countdownNum:  { fontSize: 88, fontWeight: "900", lineHeight: 96 },
  hint:          { fontSize: 14, textAlign: "center", marginTop: 20, lineHeight: 24 },
  progressRow:   { position: "absolute", top: 120, flexDirection: "row", gap: 8 },
  progressDot:   { width: 8, height: 8, borderRadius: 4 },
  tapZone: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center", 
    alignItems: "center",
    marginBottom: 48,
  },
  tapIcon:    { fontSize: 28, fontWeight: "900", textAlign: "center", lineHeight: 34 },
  tapSub:     { fontSize: 12, marginTop: 8 },
  speedLabel: { fontSize: 20, fontWeight: "800", marginTop: -32, marginBottom: 32 },
  statsRow:   { position: "absolute", bottom: 48, flexDirection: "row", gap: 32 },
  statBox:    { alignItems: "center" },
  statVal:    { fontSize: 22, fontWeight: "900" },
  statLabel:  { fontSize: 11, marginTop: 2 },
});