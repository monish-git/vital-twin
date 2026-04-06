// app/brain/StroopTest.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Stroop Focus — word says RED but is written in BLUE ink — tap the INK colour
// Cognitive domain: Cognitive control + selective attention + inhibition
// This is a validated neuropsychological test (Stroop, 1935)
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
import { GameResult, normaliseScore } from "./brainEngine";

type Phase = "countdown" | "playing" | "feedback" | "done";

type Props = {
  onDone: (result: GameResult) => void;
};

const COLORS = [
  { id: 0, hex: "#ef4444", label: "RED"    },
  { id: 1, hex: "#3b82f6", label: "BLUE"   },
  { id: 2, hex: "#22c55e", label: "GREEN"  },
  { id: 3, hex: "#f59e0b", label: "YELLOW" },
];

const ROUNDS          = 12;
const TIME_LIMIT_MS   = 3000; // 3 seconds per item
const FEEDBACK_MS     = 500;
// Congruent = word matches ink (easy), Incongruent = mismatch (hard)
const INCONGRUENT_RATIO = 0.65; // 65% incongruent for challenge

function makeStroopItem() {
  const wordColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  const isIncongruent = Math.random() < INCONGRUENT_RATIO;

  let inkColor = wordColor;
  if (isIncongruent) {
    const others = COLORS.filter(c => c.id !== wordColor.id);
    inkColor = others[Math.floor(Math.random() * others.length)];
  }

  return { wordColor, inkColor, isIncongruent };
}

export default function StroopTest({ onDone }: Props) {
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
        gameTag: "#f59e0b",
        countdownText: "#020617",
        hintText: "#64748b",
        exampleRowBg: "#ffffff",
        exampleArrow: "#64748b",
        exampleDotLabel: "#ffffff",
        progressDotBg: "#cbd5e1",
        progressDone: "#22c55e",
        progressActive: "#f59e0b",
        timerTrackBg: "#e2e8f0",
        conflictLabel: "#64748b",
        instructionText: "#64748b",
        feedbackCorrectBg: "#dcfce7",
        feedbackTimeoutBg: "#fef3c7",
        feedbackWrongBg: "#fee2e2",
        feedbackCorrectText: "#22c55e",
        feedbackTimeoutText: "#f59e0b",
        feedbackWrongText: "#ef4444",
        statsText: "#94a3b8",
        wordBoxShadow: "#000000",
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
        gameTag: "#f59e0b",
        countdownText: "#ffffff",
        hintText: "#64748b",
        exampleRowBg: "#0f172a",
        exampleArrow: "#475569",
        exampleDotLabel: "#ffffff",
        progressDotBg: "#1e293b",
        progressDone: "#22c55e",
        progressActive: "#f59e0b",
        timerTrackBg: "#1e293b",
        conflictLabel: "#475569",
        instructionText: "#475569",
        feedbackCorrectBg: "#052e16",
        feedbackTimeoutBg: "#1c1400",
        feedbackWrongBg: "#2d0707",
        feedbackCorrectText: "#22c55e",
        feedbackTimeoutText: "#f59e0b",
        feedbackWrongText: "#ef4444",
        statsText: "#334155",
        wordBoxShadow: "#000000",
      };

  const [phase,       setPhase]       = useState<Phase>("countdown");
  const [countdown,   setCountdown]   = useState(3);
  const [round,       setRound]       = useState(0);
  const [item,        setItem]        = useState(makeStroopItem());
  const [feedback,    setFeedback]    = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [correct,     setCorrect]     = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(TIME_LIMIT_MS);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);

  const roundStartRef = useRef(Date.now());
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef       = useRef(false);

  const barAnim  = useRef(new Animated.Value(1)).current;
  const itemAnim = useRef(new Animated.Value(0)).current;

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) { startRound(0); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Start a round ─────────────────────────────────────────────────────────
  const startRound = useCallback((r: number) => {
    if (doneRef.current) return;
    const newItem = makeStroopItem();
    setRound(r);
    setItem(newItem);
    setFeedback(null);
    setTimeLeft(TIME_LIMIT_MS);
    roundStartRef.current = Date.now();

    // Animate item in
    itemAnim.setValue(0);
    Animated.spring(itemAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }).start();

    // Timer bar
    barAnim.setValue(1);
    Animated.timing(barAnim, { toValue: 0, duration: TIME_LIMIT_MS, useNativeDriver: false }).start();

    setPhase("playing");

    // Timeout if no tap
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (doneRef.current) return;
      setFeedback("timeout");
      setPhase("feedback");
      Vibration.vibrate([0, 60, 40, 60]);

      setTimeout(() => {
        const next = r + 1;
        if (next >= ROUNDS) { finishGame(correct, reactionTimes); }
        else startRound(next);
      }, FEEDBACK_MS);
    }, TIME_LIMIT_MS);
  }, [barAnim, itemAnim, correct, reactionTimes]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // ── User taps ─────────────────────────────────────────────────────────────
  const tap = useCallback((colorId: number) => {
    if (phase !== "playing" || doneRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const elapsed = Date.now() - roundStartRef.current;
    const isRight = colorId === item.inkColor.id;

    const newTimes = [...reactionTimes, elapsed];
    setReactionTimes(newTimes);

    let newCorrect = correct;
    if (isRight) {
      newCorrect = correct + 1;
      setCorrect(newCorrect);
      Vibration.vibrate(30);
    } else {
      Vibration.vibrate([0, 80, 60, 80]);
    }

    setFeedback(isRight ? "correct" : "wrong");
    setPhase("feedback");

    setTimeout(() => {
      const next = round + 1;
      if (next >= ROUNDS) {
        finishGame(newCorrect, newTimes);
      } else {
        startRound(next);
      }
    }, FEEDBACK_MS);
  }, [phase, item, round, correct, reactionTimes, startRound]);

  const finishGame = useCallback((finalCorrect: number, times: number[]) => {
    doneRef.current = true;
    setPhase("done");
    const avgMs   = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 1500;
    const accuracy = finalCorrect / ROUNDS;
    // Stroop score penalises slow reaction on incongruent items
    const speedBonus = avgMs < 1000 ? 20 : avgMs < 1500 ? 10 : 0;
    const rawScore   = Math.round(accuracy * 80) + speedBonus;
    const score      = normaliseScore(rawScore, 100);

    onDone({
      game:     "stroop",
      score,
      rawScore,
      accuracy,
      avgTimeMs: avgMs,
      label:    "Stroop Focus",
    });
  }, [onDone]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={[s.gameTag, { color: colors.gameTag }]}>STROOP FOCUS</Text>
        <Text style={[s.countdownNum, { color: colors.countdownText }]}>{countdown || "GO!"}</Text>
        <Text style={[s.hint, { color: colors.hintText }]}>
          A colour word appears in a different ink{"\n"}
          Tap the <Text style={{ color: colors.gameTag, fontWeight: "800" }}>INK COLOUR</Text>, not the word!
        </Text>
        <View style={[s.exampleRow, { backgroundColor: colors.exampleRowBg }]}>
          <Text style={[s.exampleWord, { color: "#3b82f6" }]}>RED</Text>
          <Text style={[s.exampleArrow, { color: colors.exampleArrow }]}>→ tap</Text>
          <View style={[s.exampleDot, { backgroundColor: "#3b82f6" }]}>
            <Text style={[s.exampleDotLabel, { color: colors.exampleDotLabel }]}>BLUE</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <Text style={[s.gameTag, { color: colors.gameTag }]}>STROOP FOCUS</Text>

      {/* Round progress */}
      <View style={s.progressRow}>
        {Array.from({ length: ROUNDS }).map((_, i) => (
          <View
            key={i}
            style={[
              s.progressDot,
              { backgroundColor: colors.progressDotBg },
              i < round     && { backgroundColor: colors.progressDone },
              i === round   && phase !== "done" && { backgroundColor: colors.progressActive, width: 20 },
            ]}
          />
        ))}
      </View>

      {/* Timer bar */}
      <View style={[s.timerTrack, { backgroundColor: colors.timerTrackBg }]}>
        <Animated.View style={[s.timerFill, {
          width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          backgroundColor: barAnim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: ["#ef4444", "#f59e0b", "#22c55e"],
          }),
        }]} />
      </View>

      {/* The Stroop word */}
      <Animated.View style={[s.wordBox, {
        opacity:   itemAnim,
        transform: [{ scale: itemAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
      }]}>
        {/* Congruent/incongruent hint */}
        <Text style={[s.conflictLabel, { color: colors.conflictLabel }]}>
          {item.isIncongruent ? "⚡ CONFLICT" : "✓ MATCH"}
        </Text>
        <Text style={[s.stroopWord, { color: item.inkColor.hex }]}>
          {item.wordColor.label}
        </Text>
        <Text style={[s.instruction, { color: colors.instructionText }]}>Tap the INK colour →</Text>
      </Animated.View>

      {/* Feedback flash */}
      {phase === "feedback" && (
        <View style={[
          s.feedbackBadge,
          { 
            backgroundColor: 
              feedback === "correct" ? colors.feedbackCorrectBg 
              : feedback === "timeout" ? colors.feedbackTimeoutBg 
              : colors.feedbackWrongBg 
          },
        ]}>
          <Text style={[s.feedbackText, {
            color: 
              feedback === "correct" ? colors.feedbackCorrectText 
              : feedback === "timeout" ? colors.feedbackTimeoutText 
              : colors.feedbackWrongText,
          }]}>
            {feedback === "correct" ? "✓ Correct!" 
              : feedback === "timeout" ? "⏱ Time!" 
              : `✗ Wrong! It was ${item.inkColor.label}`}
          </Text>
        </View>
      )}

      {/* Colour buttons */}
      <View style={s.colorRow}>
        {COLORS.map(col => (
          <TouchableOpacity
            key={col.id}
            style={[s.colorBtn, { backgroundColor: col.hex }]}
            onPress={() => tap(col.id)}
            activeOpacity={0.75}
          >
            <Text style={s.colorBtnText}>{col.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <Text style={[s.stats, { color: colors.statsText }]}>
        ✓ {correct} / {round + (phase === "feedback" ? 1 : 0)} · Round {round + 1}/{ROUNDS}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  center:        { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  gameTag:       { fontSize: 11, fontWeight: "800", letterSpacing: 3, marginBottom: 16 },
  countdownNum:  { fontSize: 88, fontWeight: "900", lineHeight: 96 },
  hint:          { fontSize: 14, textAlign: "center", marginTop: 16, lineHeight: 24 },
  exampleRow:    { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, padding: 16, borderRadius: 16 },
  exampleWord:   { fontSize: 28, fontWeight: "900" },
  exampleArrow:  { fontSize: 13 },
  exampleDot:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  exampleDotLabel: { fontSize: 12, fontWeight: "800" },
  progressRow:   { flexDirection: "row", gap: 5, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" },
  progressDot:   { width: 7, height: 7, borderRadius: 4 },
  timerTrack:    { width: "90%", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 32 },
  timerFill:     { height: 6, borderRadius: 3 },
  wordBox:       { alignItems: "center", marginBottom: 24 },
  conflictLabel: { fontSize: 11, letterSpacing: 2, marginBottom: 8 },
  stroopWord:    { fontSize: 56, fontWeight: "900", letterSpacing: 2, lineHeight: 64 },
  instruction:   { fontSize: 12, marginTop: 8 },
  feedbackBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16, marginBottom: 16 },
  feedbackText:  { fontSize: 14, fontWeight: "700" },
  colorRow:      { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 },
  colorBtn:      { width: 76, height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  colorBtnText:  { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  stats:         { fontSize: 12 },
});