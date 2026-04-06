// app/brain/MemoryTest.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Working Memory — sequence recall (digit span style)
// Cognitive domain: Working memory capacity + verbal rehearsal
// Shows a sequence of numbers/colours one by one, user must recall in order
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
import { GameResult, scoreMemorySpan } from "./brainEngine";

type Phase = "countdown" | "showing" | "recall" | "feedback" | "done";

type Props = {
  onDone: (result: GameResult) => void;
};

const COLORS = [
  { id: 0, hex: "#ef4444", label: "RED"    },
  { id: 1, hex: "#3b82f6", label: "BLUE"   },
  { id: 2, hex: "#22c55e", label: "GREEN"  },
  { id: 3, hex: "#f59e0b", label: "YELLOW" },
  { id: 4, hex: "#a78bfa", label: "PURPLE" },
  { id: 5, hex: "#f97316", label: "ORANGE" },
];

const SHOW_EACH_MS  = 700;
const PAUSE_MS      = 300;
const FEEDBACK_MS   = 800;
const START_LENGTH  = 3;
const MAX_LENGTH    = 9;

function makeSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * COLORS.length));
}

export default function MemoryTest({ onDone }: Props) {
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
        gameTag: "#a78bfa",
        countdownText: "#020617",
        hintText: "#64748b",
        spanLabel: "#64748b",
        spanValue: "#020617",
        phaseLabelShowing: "#f59e0b",
        phaseLabelRecall: "#3b82f6",
        phaseLabelCorrect: "#22c55e",
        phaseLabelWrong: "#ef4444",
        flashBoxBg: "#ffffff",
        flashBoxShadow: "#000000",
        flashLabelText: "#ffffff",
        flashNumText: "rgba(255,255,255,0.5)",
        placeholderFlashBg: "#e2e8f0",
        placeholderFlashText: "#94a3b8",
        inputDotBg: "#cbd5e1",
        bestSpanText: "#94a3b8",
        livesActive: "#ffffff",
        livesInactive: "#94a3b8",
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
        gameTag: "#a78bfa",
        countdownText: "#ffffff",
        hintText: "#64748b",
        spanLabel: "#475569",
        spanValue: "#ffffff",
        phaseLabelShowing: "#f59e0b",
        phaseLabelRecall: "#38bdf8",
        phaseLabelCorrect: "#22c55e",
        phaseLabelWrong: "#ef4444",
        flashBoxBg: "#0f172a",
        flashBoxShadow: "#000000",
        flashLabelText: "#ffffff",
        flashNumText: "rgba(255,255,255,0.5)",
        placeholderFlashBg: "#0f172a",
        placeholderFlashText: "#334155",
        inputDotBg: "#1e293b",
        bestSpanText: "#334155",
        livesActive: "#ffffff",
        livesInactive: "#334155",
      };

  const [phase,         setPhase]         = useState<Phase>("countdown");
  const [countdown,     setCountdown]     = useState(3);
  const [sequence,      setSequence]      = useState<number[]>([]);
  const [showingIdx,    setShowingIdx]    = useState(-1); // which item is lit
  const [userInput,     setUserInput]     = useState<number[]>([]);
  const [maxSpan,       setMaxSpan]       = useState(0);
  const [currentLen,    setCurrentLen]    = useState(START_LENGTH);
  const [feedback,      setFeedback]      = useState<"correct" | "wrong" | null>(null);
  const [lives,         setLives]         = useState(2); // 2 mistakes allowed
  const [totalCorrect,  setTotalCorrect]  = useState(0);
  const [totalRounds,   setTotalRounds]   = useState(0);

  const scaleAnims = useRef(COLORS.map(() => new Animated.Value(1))).current;
  const flashAnim  = useRef(new Animated.Value(1)).current;

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown === 0) { startSequence(START_LENGTH); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── Show sequence one by one ───────────────────────────────────────────────
  const startSequence = useCallback((len: number) => {
    const seq = makeSequence(len);
    setSequence(seq);
    setUserInput([]);
    setFeedback(null);
    setShowingIdx(-1);
    setCurrentLen(len);
    setPhase("showing");

    // play through each item
    seq.forEach((colorId, i) => {
      // light up
      setTimeout(() => {
        setShowingIdx(i);
        Animated.sequence([
          Animated.timing(scaleAnims[colorId], { toValue: 1.15, duration: 150, useNativeDriver: true }),
          Animated.timing(scaleAnims[colorId], { toValue: 1,    duration: 150, useNativeDriver: true }),
        ]).start();
        Vibration.vibrate(30);
      }, i * (SHOW_EACH_MS + PAUSE_MS));

      // turn off
      setTimeout(() => {
        setShowingIdx(-1);
      }, i * (SHOW_EACH_MS + PAUSE_MS) + SHOW_EACH_MS);
    });

    // switch to recall after all shown
    const totalMs = seq.length * (SHOW_EACH_MS + PAUSE_MS) + 300;
    setTimeout(() => {
      setPhase("recall");
    }, totalMs);
  }, [scaleAnims]);

  // ── User taps a colour ────────────────────────────────────────────────────
  const tapColor = useCallback((colorId: number) => {
    if (phase !== "recall") return;

    Animated.sequence([
      Animated.timing(scaleAnims[colorId], { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnims[colorId], { toValue: 1,   duration: 100, useNativeDriver: true }),
    ]).start();

    const pos   = userInput.length;
    const next  = [...userInput, colorId];
    setUserInput(next);

    // wrong tap
    if (colorId !== sequence[pos]) {
      const newLives = lives - 1;
      setLives(newLives);
      setFeedback("wrong");
      Vibration.vibrate([0, 80, 60, 80]);
      setTotalRounds(r => r + 1);

      setTimeout(() => {
        if (newLives <= 0) {
          // game over
          setPhase("done");
        } else {
          // retry same length
          startSequence(currentLen);
        }
      }, FEEDBACK_MS);
      return;
    }

    // correct so far
    if (next.length === sequence.length) {
      // full sequence correct!
      const newLen = Math.min(currentLen + 1, MAX_LENGTH);
      setMaxSpan(Math.max(maxSpan, currentLen));
      setFeedback("correct");
      setTotalCorrect(c => c + 1);
      setTotalRounds(r => r + 1);
      Vibration.vibrate(50);

      setTimeout(() => {
        if (currentLen >= MAX_LENGTH) {
          setPhase("done");
        } else {
          startSequence(newLen);
        }
      }, FEEDBACK_MS);
    }
  }, [phase, userInput, sequence, lives, currentLen, maxSpan, startSequence]);

  // ── Done ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "done") return;
    const finalSpan = Math.max(maxSpan, currentLen - 1);
    const score     = scoreMemorySpan(finalSpan);
    const accuracy  = totalRounds > 0 ? totalCorrect / totalRounds : 0;

    onDone({
      game:     "memory",
      score,
      rawScore: finalSpan,
      accuracy,
      avgTimeMs: 0,
      label:    "Working Memory",
    });
  }, [phase]);

  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={[s.gameTag, { color: colors.gameTag }]}>WORKING MEMORY</Text>
        <Text style={[s.countdownNum, { color: colors.countdownText }]}>{countdown || "GO!"}</Text>
        <Text style={[s.hint, { color: colors.hintText }]}>Watch the colour sequence{"\n"}then tap them back in order</Text>
      </View>
    );
  }

  return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <Text style={[s.gameTag, { color: colors.gameTag }]}>WORKING MEMORY</Text>

      {/* Span indicator */}
      <View style={s.spanRow}>
        <Text style={[s.spanLabel, { color: colors.spanLabel }]}>SPAN</Text>
        <Text style={[s.spanValue, { color: colors.spanValue }]}>{currentLen}</Text>
        <View style={s.livesRow}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Text key={i} style={{ color: i < lives ? colors.livesActive : colors.livesInactive }}>❤️</Text>
          ))}
        </View>
      </View>

      {/* Phase label */}
      <Text style={[
        s.phaseLabel,
        phase === "showing"  && { color: colors.phaseLabelShowing },
        phase === "recall"   && { color: colors.phaseLabelRecall },
        phase === "feedback" && { color: feedback === "correct" ? colors.phaseLabelCorrect : colors.phaseLabelWrong },
      ]}>
        {phase === "showing"                    ? `👁  WATCH — ${currentLen} colours` :
         phase === "recall"                     ? `🧠  RECALL — tap ${sequence.length - userInput.length} more` :
         feedback === "correct"                 ? "✓  PERFECT!" :
         feedback === "wrong"                   ? `✗  WRONG  (${lives} lives left)` : ""}
      </Text>

      {/* Currently showing flash */}
      {phase === "showing" && showingIdx >= 0 && (
        <View style={[s.flashBox, { 
          backgroundColor: COLORS[sequence[showingIdx]].hex,
          shadowColor: colors.flashBoxShadow,
        }]}>
          <Text style={[s.flashLabel, { color: colors.flashLabelText }]}>{COLORS[sequence[showingIdx]].label}</Text>
          <Text style={[s.flashNum, { color: colors.flashNumText }]}>{showingIdx + 1}</Text>
        </View>
      )}

      {phase === "showing" && showingIdx < 0 && (
        <View style={[s.flashBox, { 
          backgroundColor: colors.placeholderFlashBg,
          shadowColor: colors.flashBoxShadow,
        }]}>
          <Text style={[s.flashLabel, { color: colors.placeholderFlashText }]}>···</Text>
        </View>
      )}

      {/* Colour buttons for recall */}
      {(phase === "recall" || phase === "feedback") && (
        <View style={s.colorGrid}>
          {COLORS.map((col) => (
            <Animated.View key={col.id} style={{ transform: [{ scale: scaleAnims[col.id] }] }}>
              <TouchableOpacity
                style={[s.colorBtn, { backgroundColor: col.hex }]}
                onPress={() => tapColor(col.id)}
                activeOpacity={0.7}
              >
                <Text style={s.colorBtnLabel}>{col.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Progress dots showing user input */}
      {phase === "recall" && (
        <View style={s.inputDots}>
          {sequence.map((_, i) => (
            <View
              key={i}
              style={[
                s.inputDot,
                { backgroundColor: i < userInput.length ? COLORS[userInput[i]].hex : colors.inputDotBg },
              ]}
            />
          ))}
        </View>
      )}

      {/* Best span */}
      <Text style={[s.bestSpan, { color: colors.bestSpanText }]}>
        Best span: {Math.max(maxSpan, currentLen - 1)} · Correct: {totalCorrect}/{totalRounds}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  center:       { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  gameTag:      { fontSize: 11, fontWeight: "800", letterSpacing: 3, marginBottom: 16 },
  countdownNum: { fontSize: 88, fontWeight: "900", lineHeight: 96 },
  hint:         { fontSize: 14, textAlign: "center", marginTop: 20, lineHeight: 24 },
  spanRow:      { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  spanLabel:    { fontSize: 11, letterSpacing: 2 },
  spanValue:    { fontSize: 36, fontWeight: "900", lineHeight: 40 },
  livesRow:     { flexDirection: "row", gap: 4 },
  phaseLabel:   { fontSize: 13, fontWeight: "700", marginBottom: 20, letterSpacing: 0.5 },
  flashBox: {
    width: 180,
    height: 100,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    shadowOpacity: 0.5,
    elevation: 10,
  },
  flashLabel:    { fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  flashNum:      { fontSize: 12, marginTop: 4 },
  colorGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 24 },
  colorBtn:      { width: 88, height: 60, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  colorBtnLabel: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  inputDots:     { flexDirection: "row", gap: 6, marginBottom: 16 },
  inputDot:      { width: 12, height: 12, borderRadius: 6 },
  bestSpan:      { fontSize: 12, marginTop: 8 },
}); 