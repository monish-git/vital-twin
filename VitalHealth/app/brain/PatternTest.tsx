// app/brain/PatternTest.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Pattern Memory — flash a grid pattern, hide it, tap the correct cells
// Cognitive domain: Visual working memory + spatial recall
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

type Phase = "countdown" | "show" | "recall" | "feedback" | "done";

type Props = {
  onDone: (result: GameResult) => void;
};

const ROUNDS          = 5;
const GRID_SIZE       = 9; // 3×3
const SHOW_MS         = 1200; // how long pattern stays visible
const FEEDBACK_MS     = 600;
const COUNTDOWN_SECS  = 3;

// cells to highlight per round (increasing difficulty)
const PATTERN_SIZES = [2, 2, 3, 3, 4];

function makePattern(size: number): number[] {
  const cells = Array.from({ length: GRID_SIZE }, (_, i) => i);
  return cells.sort(() => Math.random() - 0.5).slice(0, size);
}

export default function PatternTest({ onDone }: Props) {
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
        phaseLabelShow: "#f59e0b",
        phaseLabelRecall: "#38bdf8",
        phaseLabelCorrect: "#22c55e",
        phaseLabelWrong: "#ef4444",
        cellBg: "#ffffff",
        cellBorder: "#e2e8f0",
        cellTargetBg: "#0ea5e9",
        cellTargetBorder: "#38bdf8",
        cellTargetShadow: "#38bdf8",
        cellSelectedBg: "#e0f2fe",
        cellSelectedBorder: "#38bdf8",
        cellRightBg: "#dcfce7",
        cellRightBorder: "#22c55e",
        cellWrongBg: "#fee2e2",
        cellWrongBorder: "#ef4444",
        cellInnerBg: "#ffffff",
        scoreText: "#64748b",
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
        phaseLabelShow: "#f59e0b",
        phaseLabelRecall: "#38bdf8",
        phaseLabelCorrect: "#22c55e",
        phaseLabelWrong: "#ef4444",
        cellBg: "#0f172a",
        cellBorder: "#1e293b",
        cellTargetBg: "#0ea5e9",
        cellTargetBorder: "#38bdf8",
        cellTargetShadow: "#38bdf8",
        cellSelectedBg: "#0c2238",
        cellSelectedBorder: "#38bdf8",
        cellRightBg: "#052e16",
        cellRightBorder: "#22c55e",
        cellWrongBg: "#2d0707",
        cellWrongBorder: "#ef4444",
        cellInnerBg: "#ffffff",
        scoreText: "#475569",
      };

  const [phase,     setPhase]     = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [round,     setRound]     = useState(0);           // 0-indexed
  const [pattern,   setPattern]   = useState<number[]>([]); // correct cells
  const [selected,  setSelected]  = useState<number[]>([]); // user taps
  const [feedback,  setFeedback]  = useState<"correct" | "wrong" | null>(null);
  const [correct,   setCorrect]   = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const tapTimesRef               = useRef<number[]>([]);
  const roundStartRef             = useRef(0);

  // pulse animation for show phase
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const pulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 300, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 300, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim]);

  const fadeIn = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) {
      startRound(0);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Start a round ─────────────────────────────────────────────────────────
  const startRound = useCallback((r: number) => {
    const pat = makePattern(PATTERN_SIZES[r]);
    setPattern(pat);
    setSelected([]);
    setFeedback(null);
    fadeAnim.setValue(0);
    setPhase("show");
    pulse();
    fadeIn();

    // hide pattern after SHOW_MS
    const t = setTimeout(() => {
      fadeAnim.setValue(0);
      setPhase("recall");
      roundStartRef.current = Date.now();
    }, SHOW_MS);

    return () => clearTimeout(t);
  }, [pulse, fadeIn, fadeAnim]);

  // ── User taps a cell ──────────────────────────────────────────────────────
  const tapCell = useCallback((idx: number) => {
    if (phase !== "recall") return;
    if (selected.includes(idx)) return;

    const elapsed = Date.now() - roundStartRef.current;
    tapTimesRef.current.push(elapsed);

    const next = [...selected, idx];
    setSelected(next);
    setTotalTaps(t => t + 1);

    // check once user has tapped enough cells
    if (next.length === pattern.length) {
      const isCorrect = pattern.every(c => next.includes(c));
      setFeedback(isCorrect ? "correct" : "wrong");
      if (isCorrect) {
        setCorrect(c => c + 1);
        Vibration.vibrate(40);
      } else {
        Vibration.vibrate([0, 80, 60, 80]);
      }

      setPhase("feedback");

      setTimeout(() => {
        const nextRound = round + 1;
        if (nextRound >= ROUNDS) {
          setPhase("done");
        } else {
          setRound(nextRound);
          startRound(nextRound);
        }
      }, FEEDBACK_MS);
    }
  }, [phase, selected, pattern, round, startRound]);

  // ── Done → fire result ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "done") return;
    const avgMs = tapTimesRef.current.length
      ? tapTimesRef.current.reduce((a, b) => a + b, 0) / tapTimesRef.current.length
      : 999;

    const accuracy = correct / ROUNDS;
    const rawScore = correct * 20;
    const score    = normaliseScore(rawScore, 100);

    onDone({
      game:     "pattern",
      score,
      rawScore,
      accuracy,
      avgTimeMs: avgMs,
      label:    "Pattern Memory",
    });
  }, [phase]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={[s.gameTag, { color: colors.gameTag }]}>PATTERN MEMORY</Text>
        <Text style={[s.countdownNum, { color: colors.countdownText }]}>{countdown || "GO!"}</Text>
        <Text style={[s.hint, { color: colors.hintText }]}>Memorize the highlighted cells{"\n"}then tap them from memory</Text>
      </View>
    );
  }

  const patternSize = PATTERN_SIZES[round] ?? 2;

  return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <Text style={[s.gameTag, { color: colors.gameTag }]}>PATTERN MEMORY</Text>

      {/* Round + progress */}
      <View style={s.progressRow}>
        {Array.from({ length: ROUNDS }).map((_, i) => (
          <View
            key={i}
            style={[
              s.progressDot,
              { backgroundColor: colors.progressDotBg },
              i < round     && { backgroundColor: colors.progressDone },
              i === round   && { backgroundColor: colors.progressActive, width: 24 },
            ]}
          />
        ))}
      </View>

      {/* Phase label */}
      <Text style={[
        s.phaseLabel,
        phase === "show"     && { color: colors.phaseLabelShow },
        phase === "recall"   && { color: colors.phaseLabelRecall },
        phase === "feedback" && { color: feedback === "correct" ? colors.phaseLabelCorrect : colors.phaseLabelWrong },
      ]}>
        {phase === "show"                        ? `👁  MEMORIZE  (${patternSize} cells)` :
         phase === "recall"                      ? `🧠  RECALL  — tap ${patternSize} cells` :
         feedback === "correct"                  ? "✓  CORRECT!" :
         feedback === "wrong"                    ? "✗  WRONG" : ""}
      </Text>

      {/* 3×3 Grid */}
      <Animated.View style={[s.grid, { transform: [{ scale: pulseAnim }] }]}>
        {Array.from({ length: GRID_SIZE }).map((_, i) => {
          const isTarget   = pattern.includes(i);
          const isSelected = selected.includes(i);
          const showTarget = phase === "show" && isTarget;
          const showRight  = phase === "feedback" && isTarget;
          const showWrong  = phase === "feedback" && isSelected && !isTarget;

          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => tapCell(i)}
              style={[
                s.cell,
                { 
                  backgroundColor: colors.cellBg,
                  borderColor: colors.cellBorder,
                },
                showTarget && { 
                  backgroundColor: colors.cellTargetBg,
                  borderColor: colors.cellTargetBorder,
                  shadowColor: colors.cellTargetShadow,
                },
                isSelected && phase === "recall" && { 
                  backgroundColor: colors.cellSelectedBg,
                  borderColor: colors.cellSelectedBorder,
                },
                showRight  && { 
                  backgroundColor: colors.cellRightBg,
                  borderColor: colors.cellRightBorder,
                },
                showWrong  && { 
                  backgroundColor: colors.cellWrongBg,
                  borderColor: colors.cellWrongBorder,
                },
              ]}
            >
              {showTarget && <View style={[s.cellInner, { backgroundColor: colors.cellInnerBg }]} />}
              {isSelected && phase === "recall" && <View style={[s.cellInner, { backgroundColor: colors.phaseLabelRecall }]} />}
              {showRight  && <Text style={[s.cellCheck, { color: colors.phaseLabelCorrect }]}>✓</Text>}
              {showWrong  && <Text style={[s.cellX, { color: colors.phaseLabelWrong }]}>✗</Text>}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Score */}
      <Text style={[s.scoreText, { color: colors.scoreText }]}>
        {correct * 20} pts · Round {round + 1}/{ROUNDS}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  center:        { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  gameTag:       { fontSize: 11, fontWeight: "800", letterSpacing: 3, marginBottom: 20 },
  countdownNum:  { fontSize: 88, fontWeight: "900", lineHeight: 96 },
  hint:          { fontSize: 14, textAlign: "center", marginTop: 20, lineHeight: 22 },
  progressRow:   { flexDirection: "row", gap: 8, marginBottom: 24 },
  progressDot:   { width: 8, height: 8, borderRadius: 4 },
  phaseLabel:    { fontSize: 14, fontWeight: "700", marginBottom: 20, letterSpacing: 1 },
  grid: {
    width: 252,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 32,
  },
  cell:         { width: 72, height: 72, borderRadius: 16, borderWidth: 2, justifyContent: "center", alignItems: "center", shadowRadius: 12, shadowOpacity: 0.6, elevation: 8 },
  cellInner:    { width: 28, height: 28, borderRadius: 14, opacity: 0.9 },
  cellCheck:    { fontSize: 22, fontWeight: "900" },
  cellX:        { fontSize: 22, fontWeight: "900" },
  scoreText:    { fontSize: 13, fontWeight: "600" },
}); 