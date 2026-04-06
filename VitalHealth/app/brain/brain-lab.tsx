// app/brain/brain-lab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Brain Lab — orchestrates 4 cognitive tests and displays a full brain report
// Flow: intro → pattern → reaction → memory → stroop → report
// ─────────────────────────────────────────────────────────────────────────────

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import {
  BrainReport,
  GameResult,
  buildReport,
  getGrade,
} from "./brainEngine";
import MemoryTest from "./MemoryTest";
import PatternTest from "./PatternTest";
import ReactionTest from "./ReactionTest";
import StroopTest from "./StroopTest";

const { width: W } = Dimensions.get("window");

type Stage = "intro" | "pattern" | "reaction" | "memory" | "stroop" | "report";

const GAME_ORDER: Stage[] = ["pattern", "reaction", "memory", "stroop"];

const GAME_INFO: Record<string, { icon: string; color: string; desc: string; science: string }> = {
  pattern:  { icon: "⬛", color: "#38bdf8", desc: "Visual Spatial Memory",  science: "Visuospatial WM"    },
  reaction: { icon: "⚡", color: "#22c55e", desc: "Neural Response Speed",  science: "Processing Speed"   },
  memory:   { icon: "🧩", color: "#a78bfa", desc: "Sequence Recall",        science: "Working Memory"     },
  stroop:   { icon: "🎨", color: "#f59e0b", desc: "Cognitive Control",      science: "Executive Function" },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function BrainLab() {
  const router = useRouter();
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
        headerBg: "#ffffff",
        headerText: "#0f172a",
        headerSubText: "#64748b",
        backBtnBg: "#f1f5f9",
        backBtnIcon: "#475569",
        progressBarBg: "#e2e8f0",
        progressBarFill: "#3b82f6",
        introHeroGradient: ["#e0f2fe", "#bae6fd", "#e0f2fe"] as const,
        introHeroText: "#0f172a",
        introHeroSubText: "#475569",
        gameCardBg: "#ffffff",
        gameCardBorder: "#3b82f6",
        gameCardNumBg: "#e0f2fe",
        gameCardNameText: "#0f172a",
        gameCardScienceText: "#64748b",
        startBtnGradient: ["#0ea5e9", "#6366f1"] as const,
        startBtnText: "#ffffff",
        reportHeroGradient: ["#e0f2fe", "#f8fafc"] as const,
        reportScoreText: "#0f172a",
        reportScoreLabel: "#64748b",
        insightCardBg: "#ffffff",
        insightCardBorder: "#f59e0b",
        insightText: "#475569",
        sectionTitle: "#64748b",
        resultCardBg: "#ffffff",
        resultNameText: "#0f172a",
        resultScienceText: "#64748b",
        resultBarTrack: "#e2e8f0",
        resultStatText: "#64748b",
        resultStatValue: "#0f172a",
        summaryCardBg: "#ffffff",
        summaryCardBorder1: "#22c55e",
        summaryCardBorder2: "#ef4444",
        summaryLabel: "#64748b",
        summaryValue1: "#22c55e",
        summaryValue2: "#ef4444",
        retakeBtnBg: "#0ea5e9",
        retakeBtnText: "#ffffff",
        homeBtnText: "#64748b",
        shadowColor: "#000000",
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
        headerBg: "#0f172a",
        headerText: "#ffffff",
        headerSubText: "#94a3b8",
        backBtnBg: "#0f172a",
        backBtnIcon: "#94a3b8",
        progressBarBg: "#1e293b",
        progressBarFill: "#3b82f6",
        introHeroGradient: ["#0f0a1e", "#1a0533", "#0a0f1e"] as const,
        introHeroText: "#ffffff",
        introHeroSubText: "#64748b",
        gameCardBg: "#0f172a",
        gameCardBorder: "#38bdf8",
        gameCardNumBg: "#1e293b",
        gameCardNameText: "#ffffff",
        gameCardScienceText: "#64748b",
        startBtnGradient: ["#0ea5e9", "#6366f1"] as const,
        startBtnText: "#ffffff",
        reportHeroGradient: ["#1e293b", "#0f172a"] as const,
        reportScoreText: "#ffffff",
        reportScoreLabel: "#94a3b8",
        insightCardBg: "#0f172a",
        insightCardBorder: "#f59e0b",
        insightText: "#94a3b8",
        sectionTitle: "#475569",
        resultCardBg: "#0f172a",
        resultNameText: "#ffffff",
        resultScienceText: "#94a3b8",
        resultBarTrack: "#1e293b",
        resultStatText: "#475569",
        resultStatValue: "#ffffff",
        summaryCardBg: "#0f172a",
        summaryCardBorder1: "#22c55e",
        summaryCardBorder2: "#ef4444",
        summaryLabel: "#475569",
        summaryValue1: "#22c55e",
        summaryValue2: "#ef4444",
        retakeBtnBg: "#0ea5e9",
        retakeBtnText: "#ffffff",
        homeBtnText: "#475569",
        shadowColor: "#000000",
      };

  const [stage,   setStage]   = useState<Stage>("intro");
  const [results, setResults] = useState<GameResult[]>([]);
  const [report,  setReport]  = useState<BrainReport | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const transition = (next: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    setTimeout(next, 200);
  };

  const handleGameDone = (result: GameResult) => {
    const updated = [...results, result];
    setResults(updated);

    const currentIdx = GAME_ORDER.indexOf(stage as any);
    const nextGame   = GAME_ORDER[currentIdx + 1];

    transition(() => {
      if (nextGame) {
        setStage(nextGame);
      } else {
        const r = buildReport(updated);
        setReport(r);
        setStage("report");
      }
    });
  };

  const restart = () => {
    transition(() => {
      setResults([]);
      setReport(null);
      setStage("intro");
    });
  };

  const currentGameIdx = GAME_ORDER.indexOf(stage as any);

  // ── Header ──────────────────────────────────────────────────────────────────
  const Header = ({ title }: { title: string }) => (
    <View style={[s.header, { backgroundColor: colors.headerBg }]}>
      <TouchableOpacity style={[s.backBtn, { backgroundColor: colors.backBtnBg }]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.backBtnIcon} />
      </TouchableOpacity>
      <Text style={[s.headerTitle, { color: colors.headerText }]}>{title}</Text>
      {currentGameIdx >= 0
        ? <Text style={[s.headerProgress, { color: colors.headerSubText }]}>{currentGameIdx + 1}/{GAME_ORDER.length}</Text>
        : <View style={{ width: 40 }} />
      }
    </View>
  );

  // ── Game progress bar ────────────────────────────────────────────────────────
  const GameProgress = () => (
    <View style={s.gameProgressBar}>
      {GAME_ORDER.map((g, i) => (
        <View
          key={g}
          style={[
            s.gameProgressSegment,
            {
              backgroundColor:
                i < currentGameIdx ? GAME_INFO[g].color
                : i === currentGameIdx ? GAME_INFO[g].color + "80"
                : colors.progressBarBg,
            },
          ]}
        />
      ))}
    </View>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // INTRO
  // ───────────────────────────────────────────────────────────────────────────
  if (stage === "intro") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <Header title="BRAIN LAB" />
        <ScrollView contentContainerStyle={s.introScroll} showsVerticalScrollIndicator={false}>

          <LinearGradient colors={colors.introHeroGradient} style={s.introHero}>
            <Text style={s.introBrain}>🧠</Text>
            <Text style={[s.introTitle, { color: colors.introHeroText }]}>Cognitive{"\n"}Assessment</Text>
            <Text style={[s.introSub, { color: colors.introHeroSubText }]}>4 scientifically validated tests{"\n"}Takes about 3 minutes</Text>
          </LinearGradient>

          {GAME_ORDER.map((g, i) => {
            const info = GAME_INFO[g];
            return (
              <View key={g} style={[s.gameCard, { 
                backgroundColor: colors.gameCardBg,
                borderLeftColor: info.color,
                borderColor: colors.border,
              }]}>
                <View style={[s.gameCardNum, { backgroundColor: colors.gameCardNumBg }]}>
                  <Text style={[s.gameCardNumText, { color: info.color }]}>{i + 1}</Text>
                </View>
                <Text style={s.gameCardIcon}>{info.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.gameCardName, { color: colors.gameCardNameText }]}>{info.desc}</Text>
                  <Text style={[s.gameCardScience, { color: colors.gameCardScienceText }]}>{info.science}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.subText2} />
              </View>
            );
          })}

          <TouchableOpacity
            style={s.startBtn}
            onPress={() => transition(() => setStage("pattern"))}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={colors.startBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.startBtnGrad}
            >
              <Text style={[s.startBtnText, { color: colors.startBtnText }]}>BEGIN ASSESSMENT</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.startBtnText} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ACTIVE GAME
  // ───────────────────────────────────────────────────────────────────────────
  if (stage !== "report") {
    const info = GAME_INFO[stage];
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <Header title={info.desc.toUpperCase()} />
        <GameProgress />
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          {stage === "pattern"  && <PatternTest  onDone={handleGameDone} />}
          {stage === "reaction" && <ReactionTest onDone={handleGameDone} />}
          {stage === "memory"   && <MemoryTest   onDone={handleGameDone} />}
          {stage === "stroop"   && <StroopTest   onDone={handleGameDone} />}
        </Animated.View>
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // REPORT
  // ───────────────────────────────────────────────────────────────────────────
  if (!report) return null;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <Header title="BRAIN REPORT" />
      <ScrollView contentContainerStyle={s.reportScroll} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={[report.gradeColor + "22", colors.card]} style={s.reportHero}>
          <Text style={[s.reportGrade, { color: report.gradeColor }]}>{report.grade}</Text>
          <Text style={[s.reportScore, { color: colors.reportScoreText }]}>{report.overallScore}</Text>
          <Text style={[s.reportScoreLabel, { color: colors.reportScoreLabel }]}>COGNITIVE SCORE</Text>
          <View style={[s.gradePill, { backgroundColor: report.gradeColor + "22", borderColor: report.gradeColor }]}>
            <Text style={[s.gradePillText, { color: report.gradeColor }]}>
              {getGrade(report.overallScore).label}
            </Text>
          </View>
        </LinearGradient>

        <View style={[s.insightCard, { 
          backgroundColor: colors.insightCardBg,
          borderColor: colors.insightCardBorder + "40",
        }]}>
          <Ionicons name="bulb" size={20} color="#f59e0b" />
          <Text style={[s.insightText, { color: colors.insightText }]}>{report.insight}</Text>
        </View>

        <Text style={[s.sectionTitle, { color: colors.sectionTitle }]}>GAME BREAKDOWN</Text>

        {report.results.map((r) => {
          const info  = GAME_INFO[r.game];
          const grade = getGrade(r.score);
          return (
            <View key={r.game} style={[s.resultCard, { backgroundColor: colors.resultCardBg }]}>
              <View style={s.resultTop}>
                <Text style={s.resultIcon}>{info.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.resultName, { color: colors.resultNameText }]}>{r.label}</Text>
                  <Text style={[s.resultScience, { color: colors.resultScienceText }]}>{info.science}</Text>
                </View>
                <View style={[s.resultGradePill, { backgroundColor: grade.color + "22" }]}>
                  <Text style={[s.resultGradeText, { color: grade.color }]}>{grade.grade}</Text>
                </View>
                <Text style={[s.resultScore, { color: info.color }]}>{r.score}</Text>
              </View>
              <View style={[s.resultBarTrack, { backgroundColor: colors.resultBarTrack }]}>
                <View style={[s.resultBarFill, { width: `${r.score}%`, backgroundColor: info.color }]} />
              </View>
              <View style={s.resultStats}>
                <Text style={[s.resultStat, { color: colors.resultStatText }]}>
                  Accuracy: <Text style={{ color: colors.resultStatValue }}>{Math.round(r.accuracy * 100)}%</Text>
                </Text>
                {r.avgTimeMs > 0 && (
                  <Text style={[s.resultStat, { color: colors.resultStatText }]}>
                    Avg time: <Text style={{ color: colors.resultStatValue }}>{Math.round(r.avgTimeMs)}ms</Text>
                  </Text>
                )}
                {r.game === "memory" && (
                  <Text style={[s.resultStat, { color: colors.resultStatText }]}>
                    Span: <Text style={{ color: colors.resultStatValue }}>{r.rawScore}</Text>
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { 
            backgroundColor: colors.summaryCardBg,
            borderColor: colors.summaryCardBorder1 + "40",
          }]}>
            <Text style={s.summaryIcon}>💪</Text>
            <Text style={[s.summaryLabel, { color: colors.summaryLabel }]}>STRONGEST</Text>
            <Text style={[s.summaryValue, { color: colors.summaryValue1 }]}>{report.dominantSkill}</Text>
          </View>
          <View style={[s.summaryCard, { 
            backgroundColor: colors.summaryCardBg,
            borderColor: colors.summaryCardBorder2 + "40",
          }]}>
            <Text style={s.summaryIcon}>🎯</Text>
            <Text style={[s.summaryLabel, { color: colors.summaryLabel }]}>TRAIN THIS</Text>
            <Text style={[s.summaryValue, { color: colors.summaryValue2 }]}>{report.weakestSkill}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[s.retakeBtn, { backgroundColor: colors.retakeBtnBg }]} 
          onPress={restart} 
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color={colors.retakeBtnText} />
          <Text style={[s.retakeBtnText, { color: colors.retakeBtnText }]}>RETAKE ASSESSMENT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.homeBtn} onPress={() => router.back()}>
          <Text style={[s.homeBtnText, { color: colors.homeBtnText }]}>Back to Home</Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  header:         { paddingTop: 54, paddingBottom: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn:        { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerTitle:    { fontWeight: "900", fontSize: 14, letterSpacing: 2 },
  headerProgress: { fontSize: 13, fontWeight: "700", width: 40, textAlign: "right" },

  gameProgressBar:     { flexDirection: "row", height: 3, marginHorizontal: 16, gap: 4, marginBottom: 4 },
  gameProgressSegment: { flex: 1, borderRadius: 2 },

  introScroll: { paddingHorizontal: 16, paddingTop: 8 },
  introHero:   { borderRadius: 28, padding: 32, alignItems: "center", marginBottom: 20 },
  introBrain:  { fontSize: 64, marginBottom: 12 },
  introTitle:  { fontSize: 36, fontWeight: "900", textAlign: "center", lineHeight: 42 },
  introSub:    { fontSize: 14, textAlign: "center", marginTop: 10, lineHeight: 22 },

  gameCard:        { flexDirection: "row", alignItems: "center", borderRadius: 20, padding: 16, marginBottom: 10, borderLeftWidth: 3, gap: 12, borderWidth: 1 },
  gameCardNum:     { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  gameCardNumText: { fontSize: 13, fontWeight: "900" },
  gameCardIcon:    { fontSize: 24 },
  gameCardName:    { fontSize: 14, fontWeight: "700" },
  gameCardScience: { fontSize: 11, marginTop: 2 },

  startBtn:     { marginTop: 16, borderRadius: 20, overflow: "hidden" },
  startBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, gap: 10 },
  startBtnText: { fontSize: 16, fontWeight: "900", letterSpacing: 1 },

  reportScroll:     { paddingHorizontal: 16, paddingTop: 8 },
  reportHero:       { borderRadius: 28, padding: 32, alignItems: "center", marginBottom: 16 },
  reportGrade:      { fontSize: 80, fontWeight: "900", lineHeight: 88 },
  reportScore:      { fontSize: 48, fontWeight: "900" },
  reportScoreLabel: { fontSize: 11, letterSpacing: 3, marginTop: 4 },
  gradePill:        { marginTop: 12, paddingHorizontal: 20, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  gradePillText:    { fontSize: 14, fontWeight: "700" },

  insightCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1 },
  insightText: { flex: 1, fontSize: 14, lineHeight: 22 },

  sectionTitle: { fontSize: 10, letterSpacing: 3, marginBottom: 12, fontWeight: "700" },

  resultCard:      { borderRadius: 20, padding: 16, marginBottom: 12 },
  resultTop:       { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  resultIcon:      { fontSize: 24 },
  resultName:      { fontSize: 14, fontWeight: "700" },
  resultScience:   { fontSize: 11, marginTop: 2 },
  resultGradePill: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  resultGradeText: { fontSize: 14, fontWeight: "900" },
  resultScore:     { fontSize: 22, fontWeight: "900", width: 44, textAlign: "right" },
  resultBarTrack:  { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  resultBarFill:   { height: 6, borderRadius: 3 },
  resultStats:     { flexDirection: "row", gap: 16 },
  resultStat:      { fontSize: 11 },

  summaryRow:   { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryCard:  { flex: 1, borderRadius: 20, padding: 16, alignItems: "center", borderWidth: 1, gap: 6 },
  summaryIcon:  { fontSize: 28 },
  summaryLabel: { fontSize: 9, letterSpacing: 2, fontWeight: "700" },
  summaryValue: { fontSize: 13, fontWeight: "800", textAlign: "center" },

  retakeBtn:     { borderRadius: 20, padding: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 12 },
  retakeBtnText: { fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  homeBtn:       { padding: 16, alignItems: "center" },
  homeBtnText:   { fontSize: 14 },
});