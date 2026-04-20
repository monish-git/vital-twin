// app/(tabs)/twin.tsx — Clinical Command Center
// Mode 1: Dashboard (vitals, organ scores, saved routines, history)
// Mode 2: Routine Panel (log events → simulate)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, FlatList,
  KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBiogearsTwin } from '../../context/BiogearsTwinContext';
import { useTheme } from '../../context/ThemeContext';
import { colors as themeColors } from '../../theme/colors';
import Header from '../components/Header';

const { width: W } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

/** Parse "120/80" BP string into systolic/diastolic */
function parseBP(bp: string | null | undefined): { sys: number | null; dia: number | null } {
  if (!bp) return { sys: null, dia: null };
  const parts = bp.split('/');
  return {
    sys: parts[0] ? parseFloat(parts[0]) : null,
    dia: parts[1] ? parseFloat(parts[1]) : null,
  };
}

function wallTimeToLabel(wallTime: string): string {
  if (!wallTime) return '';
  const [h, m] = wallTime.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${pad(m)} ${ampm}`;
}

function now(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Simulation Step Indicator ───────────────────────────────────────────────

const SIM_STEPS = ['Queue', 'Engine', 'Analyzing', 'Done'];

function SimStepper({ progress, status }: { progress: string; status: string }) {
  const stepIdx =
    status === 'queued' ? 0
    : status === 'running' && progress.toLowerCase().includes('analy') ? 2
    : status === 'running' ? 1
    : status === 'done' ? 3
    : 0;

  return (
    <View style={ss.stepperRow}>
      {SIM_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <View style={ss.stepItem}>
            <View style={[ss.stepDot, i <= stepIdx && ss.stepDotActive]}>
              {i < stepIdx
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={ss.stepNum}>{i + 1}</Text>}
            </View>
            <Text style={[ss.stepLabel, i <= stepIdx && ss.stepLabelActive]}>{s}</Text>
          </View>
          {i < SIM_STEPS.length - 1 && (
            <View style={[ss.stepLine, i < stepIdx && ss.stepLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Time Picker ─────────────────────────────────────────────────────────────

function TimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [h, m] = (value || now()).split(':').map(Number);
  return (
    <View style={ss.timePicker}>
      <TouchableOpacity onPress={() => onChange(`${pad((h - 1 + 24) % 24)}:${pad(m)}`)}>
        <Ionicons name="chevron-up" size={18} color="#38bdf8" />
      </TouchableOpacity>
      <Text style={ss.timeText}>{pad(h)}</Text>
      <TouchableOpacity onPress={() => onChange(`${pad((h + 1) % 24)}:${pad(m)}`)}>
        <Ionicons name="chevron-down" size={18} color="#38bdf8" />
      </TouchableOpacity>
      <Text style={ss.timeColon}>:</Text>
      <TouchableOpacity onPress={() => onChange(`${pad(h)}:${pad((m - 5 + 60) % 60)}`)}>
        <Ionicons name="chevron-up" size={18} color="#38bdf8" />
      </TouchableOpacity>
      <Text style={ss.timeText}>{pad(m)}</Text>
      <TouchableOpacity onPress={() => onChange(`${pad(h)}:${pad((m + 5) % 60)}`)}>
        <Ionicons name="chevron-down" size={18} color="#38bdf8" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Vital Card ──────────────────────────────────────────────────────────────

function VitalCard({ label, value, unit, icon, color, normal }: any) {
  const inRange = value != null;
  return (
    <View style={[ss.vitalCard, { borderColor: color + '40' }]}>
      <Text style={ss.vitalIcon}>{icon}</Text>
      <Text style={[ss.vitalValue, { color }]}>{value ?? '—'}</Text>
      <Text style={ss.vitalUnit}>{unit}</Text>
      <Text style={ss.vitalLabel}>{label}</Text>
      {normal && <Text style={ss.vitalNormal}>{normal}</Text>}
    </View>
  );
}

// ─── Organ Score Card ────────────────────────────────────────────────────────

function OrganCard({ name, score, status }: any) {
  const clr = status === 'critical' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981';
  const icons: Record<string, string> = {
    heart: '🫀', lungs: '🫁', gut: '🦠', brain: '🧠', liver: '🫀', legs: '🦵',
  };
  return (
    <View style={ss.organCard}>
      <Text style={{ fontSize: 24 }}>{icons[name] ?? '🔬'}</Text>
      <Text style={[ss.organScore, { color: clr }]}>{score}%</Text>
      <Text style={ss.organName}>{name.charAt(0).toUpperCase() + name.slice(1)}</Text>
      <View style={[ss.organBar]}>
        <View style={[ss.organBarFill, { width: `${score}%`, backgroundColor: clr }]} />
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

type Tab = 'substances' | 'stress';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'substances', label: 'Substances', icon: '☕' },
  { id: 'stress', label: 'Stress', icon: '🧘' },
];

export default function TwinScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = themeColors[theme as 'light' | 'dark'] ?? themeColors['dark'];

  const insets = useSafeAreaInsets();

  const {
    twinStatus, simulationStatus, simulationProgress, simulationError,
    lastVitals, lastAnomalies, lastInteractionWarnings, lastAiInsights,
    todayEvents, addEvent, removeEvent, clearToday,
    savedRoutines, saveCurrentRoutine, loadRoutine, deleteRoutine,
    sessions, refreshSessions,
    simulationName, setSimulationName,
    runSimulation,
    organScores, cvdRisk, recoveryReadiness, healthScore,
    substances, refreshSubstances,
    undoLastSimulation,
    refreshAnalytics,
  } = useBiogearsTwin();

  // ── mode ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'dashboard' | 'routine'>('dashboard');
  const fabAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (next: 'dashboard' | 'routine') => {
    Animated.spring(fabAnim, { toValue: next === 'routine' ? 1 : 0, useNativeDriver: true }).start();
    setMode(next);
  };

  // ── routine panel state ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('substances');

  // Per-event times (each event type has its own time so they're independent)
  const [substanceTime,  setSubstanceTime]  = useState(now());
  const [stressTime,     setStressTime]     = useState(now());

  // Substances
  const [subName, setSubName] = useState('Caffeine');
  const [subDose, setSubDose] = useState('200');

  // Stress
  const [stressLevel, setStressLevel] = useState('0.3');
  const [stressDur, setStressDur] = useState('5');

  // UI
  const [saveRoutineModal, setSaveRoutineModal] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [simNameModal, setSimNameModal] = useState(false);
  const [pendingSimName, setPendingSimName] = useState('');

  useEffect(() => {
    refreshSubstances();
    refreshSessions();
    refreshAnalytics();
  }, []);

  // ── Add event handlers ────────────────────────────────────────────────────

  const addSubstance = () => {
    const dose = parseFloat(subDose);
    if (!subName) return Alert.alert('Select substance');
    addEvent({
      event_type: 'substance', value: dose, wallTime: substanceTime,
      substance_name: subName,
      displayLabel: `${subName} · ${dose}`, displayIcon: '☕',
    });
  };

  const addStress = () => {
    const level = parseFloat(stressLevel);
    const dur = parseInt(stressDur, 10) * 60;
    addEvent({
      event_type: 'stress', value: level, wallTime: stressTime,
      duration_seconds: dur,
      displayLabel: `Stress · ${Math.round(level * 100)}% · ${stressDur}min`,
      displayIcon: '🧘',
    });
  };

  const handleLoadRoutine = (routineId: string, name: string) => {
    Alert.alert(
      `Load "${name}"`,
      'This will add all saved events to today\'s timeline at their original times.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load', onPress: () => { loadRoutine(routineId); switchMode('routine'); } },
      ]
    );
  };

  const handleSaveRoutine = async () => {
    if (!routineName.trim()) return;
    await saveCurrentRoutine(routineName.trim());
    setRoutineName('');
    setSaveRoutineModal(false);
    Alert.alert('✅ Routine Saved', `"${routineName}" saved with ${todayEvents.length} events.`);
  };

  const handleSimulate = () => {
    if (todayEvents.length === 0) {
      return Alert.alert('No Events', 'Add at least one event to your routine before simulating.');
    }
    if (twinStatus !== 'ready') {
      return Alert.alert('Twin Not Ready', 'Please register your clinical profile first (Profile → BioGears Clinical Profile).');
    }
    setSimNameModal(true);
  };

  const startSimulation = async () => {
    setSimulationName(pendingSimName || `Sim ${new Date().toLocaleDateString('en-IN')}`);
    setPendingSimName('');
    setSimNameModal(false);
    switchMode('dashboard');
    try {
      await runSimulation();
    } catch (e: any) {
      Alert.alert('Simulation Failed', e.message);
    }
  };

  const handleUndo = () => {
    Alert.alert('Undo Last Simulation', 'This will revert your twin engine to its previous state.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Undo', style: 'destructive', onPress: async () => {
        try { await undoLastSimulation(); Alert.alert('Reverted', 'Engine state restored.'); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  // ── Render tab content ────────────────────────────────────────────────────

  const renderTabContent = () => {
    switch (activeTab) {
      case 'substances': return (
        <View style={ss.tabContent}>
          <Text style={[ss.tabHint, { color: c.sub }]}>Caffeine, alcohol, medications and more</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.chipRow}>
            {['Caffeine', 'Ethanol', 'Nicotine', 'Epinephrine', 'Morphine', 'Ibuprofen'].map(s => (
              <TouchableOpacity key={s} onPress={() => setSubName(s)}
                style={[ss.chip, subName === s && { backgroundColor: '#8b5cf6' }]}>
                <Text style={[ss.chipTxt, subName === s && { color: '#fff' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput style={[ss.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
            placeholder="Dose (mg or standard drinks)" placeholderTextColor={c.sub}
            keyboardType="numeric" value={subDose} onChangeText={setSubDose} />
          <View style={[ss.inlineTimeRow, { backgroundColor: c.bg }]}>
            <Ionicons name="time-outline" size={14} color={c.sub} />
            <Text style={[ss.inlineTimeLabel, { color: c.sub }]}>Taken at:</Text>
            <TimePicker value={substanceTime} onChange={setSubstanceTime} />
          </View>
          <TouchableOpacity style={[ss.addBtn, { backgroundColor: '#8b5cf6' }]} onPress={addSubstance}>
            <Text style={ss.addBtnTxt}>+ Add Substance</Text>
          </TouchableOpacity>
        </View>
      );

      case 'stress': return (
        <View style={ss.tabContent}>
          <Text style={[ss.tabHint, { color: c.sub }]}>Log mental stress / anxiety event</Text>
          <View style={ss.row}>
            {[['0.2','Mild'],['0.5','Moderate'],['0.8','Severe'],['1.0','Extreme']].map(([v, l]) => (
              <TouchableOpacity key={v} onPress={() => setStressLevel(v)}
                style={[ss.chip, stressLevel === v && { backgroundColor: '#ef4444' }]}>
                <Text style={[ss.chipTxt, stressLevel === v && { color: '#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={ss.row}>
            <TextInput style={[ss.inputSm, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
              placeholder="Level 0-1" placeholderTextColor={c.sub}
              keyboardType="numeric" value={stressLevel} onChangeText={setStressLevel} />
            <TextInput style={[ss.inputSm, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
              placeholder="Duration (min)" placeholderTextColor={c.sub}
              keyboardType="numeric" value={stressDur} onChangeText={setStressDur} />
          </View>
          <View style={[ss.inlineTimeRow, { backgroundColor: c.bg }]}>
            <Ionicons name="time-outline" size={14} color={c.sub} />
            <Text style={[ss.inlineTimeLabel, { color: c.sub }]}>Occurred at:</Text>
            <TimePicker value={stressTime} onChange={setStressTime} />
          </View>
          <TouchableOpacity style={[ss.addBtn, { backgroundColor: '#ef4444' }]} onPress={addStress}>
            <Text style={ss.addBtnTxt}>+ Add Stress Event</Text>
          </TouchableOpacity>
        </View>
      );

      default: return null;
    }
  };

  // ── Dashboard ─────────────────────────────────────────────────────────────

  const renderDashboard = () => {
    const v = lastVitals;
    const simRunning = simulationStatus === 'running' || simulationStatus === 'queued';

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 62, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>

        {/* ── Simulation Progress ── */}
        {simRunning && (
          <View style={[ss.simBox, { backgroundColor: c.card, borderColor: '#38bdf8' }]}>
            <SimStepper progress={simulationProgress} status={simulationStatus} />
            <Text style={[ss.simMsg, { color: c.sub }]}>{simulationProgress}</Text>
            <ActivityIndicator color="#38bdf8" style={{ marginTop: 8 }} />
          </View>
        )}

        {simulationStatus === 'failed' && (
          <View style={[ss.errorBox, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="warning" size={18} color="#ef4444" />
            <Text style={ss.errorTxt}>{simulationError || 'Simulation failed'}</Text>
          </View>
        )}

        {/* ── Drug Interaction Banner ── */}
        {lastInteractionWarnings.length > 0 && (
          <View style={ss.interactionBanner}>
            <Ionicons name="medical" size={16} color="#fbbf24" />
            <Text style={ss.interactionTxt}>{lastInteractionWarnings[0]}</Text>
          </View>
        )}

        {/* ── Health Score Badge ── */}
        {healthScore && (
          <LinearGradient colors={
            healthScore.grade === 'A' ? ['#10b981', '#059669']
            : healthScore.grade === 'B' ? ['#38bdf8', '#0284c7']
            : healthScore.grade === 'C' ? ['#f59e0b', '#d97706']
            : ['#ef4444', '#dc2626']
          } style={ss.scoreBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View>
              <Text style={ss.scoreLetter}>{healthScore.grade}</Text>
              <Text style={ss.scoreLabel}>{healthScore.label}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={ss.scoreNum}>{healthScore.score}</Text>
              <Text style={ss.scoreSubLabel}>/ 100</Text>
            </View>
          </LinearGradient>
        )}

        {/* ── Vitals Grid ── */}
        <Text style={[ss.section, { color: c.text }]}>Simulation Vitals</Text>
        {v ? (() => {
            const bp = parseBP(v.blood_pressure);
            return (
              <View style={ss.vitalsGrid}>
                <VitalCard label="Heart Rate" value={v.heart_rate ? Math.round(v.heart_rate) : null}
                  unit="bpm" icon="🫀" color="#ef4444" normal="60–100" />
                <VitalCard label="Systolic BP" value={bp.sys ? Math.round(bp.sys) : null}
                  unit="mmHg" icon="🩸" color="#f59e0b" normal="90–120" />
                <VitalCard label="Diastolic BP" value={bp.dia ? Math.round(bp.dia) : null}
                  unit="mmHg" icon="🩸" color="#f97316" normal="60–80" />
                <VitalCard label="Glucose" value={v.glucose ? Math.round(v.glucose) : null}
                  unit="mg/dL" icon="🍬" color="#6366f1" normal="70–140" />
                <VitalCard label="SpO₂" value={v.spo2 ? Math.round(v.spo2) : null}
                  unit="%" icon="🫁" color="#38bdf8" normal="94–100" />
                <VitalCard label="Resp. Rate" value={v.respiration ? Math.round(v.respiration) : null}
                  unit="br/min" icon="💨" color="#10b981" normal="12–20" />
                {v.map != null && (
                  <VitalCard label="MAP" value={Math.round(v.map || 0)}
                    unit="mmHg" icon="📈" color="#a78bfa" normal="70–100" />
                )}
                {v.core_temperature != null && (
                  <VitalCard label="Core Temp" value={(v.core_temperature || 0).toFixed(1)}
                    unit="°C" icon="🌡️" color="#fb923c" normal="36.5–37.5" />
                )}
              </View>
            );
          })() : (
          <View style={[ss.emptyCard, { backgroundColor: c.card }]}>
            <Text style={{ fontSize: 32 }}>🔬</Text>
            <Text style={[ss.emptyTitle, { color: c.text }]}>No Simulation Yet</Text>
            <Text style={[ss.emptySub, { color: c.sub }]}>Tap + to log your routine and run a simulation</Text>
          </View>
        )}

        {/* ── AI Insights ── */}
        {lastAiInsights.length > 0 && (
          <>
            <Text style={[ss.section, { color: c.text }]}>AI Insights</Text>
            {lastAiInsights.map((ins, i) => (
              <View key={i} style={[ss.insightPill, { backgroundColor: c.card }]}>
                <Text style={{ color: c.text, fontSize: 13, lineHeight: 18 }}>{ins}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Organ Health Scores ── */}
        {organScores?.scores && (
          <>
            <Text style={[ss.section, { color: c.text }]}>Organ Health</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(Object.keys(organScores.scores) as string[]).map(name => {
                const data = organScores.scores[name];
                return <OrganCard key={name} name={name} score={data.score} status={data.status} />;
              })}
            </ScrollView>
          </>
        )}

        {/* ── CVD / Recovery Cards ── */}
        {(cvdRisk || recoveryReadiness) && (
          <View style={ss.row}>
            {cvdRisk && (
              <View style={[ss.analyticsCard, { backgroundColor: c.card, flex: 1, marginRight: 8 }]}>
                <Text style={[ss.analyticsTitle, { color: c.sub }]}>CVD Risk (10yr)</Text>
                <Text style={[ss.analyticsValue, { color: cvdRisk.color }]}>{cvdRisk.ten_year_risk_pct}%</Text>
                <Text style={[ss.analyticsLabel, { color: c.sub }]}>{cvdRisk.category}</Text>
              </View>
            )}
            {recoveryReadiness && (
              <View style={[ss.analyticsCard, { backgroundColor: c.card, flex: 1 }]}>
                <Text style={[ss.analyticsTitle, { color: c.sub }]}>Recovery</Text>
                <Text style={[ss.analyticsValue, { color:
                  recoveryReadiness.status === 'Ready' ? '#10b981'
                  : recoveryReadiness.status === 'Caution' ? '#f59e0b' : '#ef4444'
                }]}>{recoveryReadiness.readiness_score}</Text>
                <Text style={[ss.analyticsLabel, { color: c.sub }]}>{recoveryReadiness.status}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Saved Routines ── */}
        {savedRoutines.length > 0 && (
          <>
            <Text style={[ss.section, { color: c.text }]}>Saved Routines</Text>
            {savedRoutines.map(r => (
              <TouchableOpacity key={r.id} style={[ss.routineCard, { backgroundColor: c.card }]}
                onPress={() => handleLoadRoutine(r.id, r.name)}
                onLongPress={() => Alert.alert('Delete', `Delete "${r.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine(r.id) },
                ])}>
                <View style={ss.routineIcon}>
                  <Text style={{ fontSize: 20 }}>📋</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.routineName, { color: c.text }]}>{r.name}</Text>
                  <Text style={[ss.routineMeta, { color: c.sub }]}>
                    {r.eventCount} events · {new Date(r.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                  {r.tags && r.tags.length > 0 && (
                    <View style={ss.row}>
                      {r.tags.map(t => (
                        <View key={t} style={ss.tagPill}>
                          <Text style={ss.tagTxt}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Ionicons name="play-circle" size={28} color={c.active} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Session History ── */}
        {sessions.length > 0 && (
          <>
            <View style={ss.rowBetween}>
              <Text style={[ss.section, { color: c.text }]}>Recent Simulations</Text>
              {sessions.length > 0 && (
                <TouchableOpacity onPress={handleUndo}>
                  <Text style={{ color: '#ef4444', fontSize: 12 }}>⏪ Undo Last</Text>
                </TouchableOpacity>
              )}
            </View>
            {sessions.slice(0, 5).map(s => (
              <TouchableOpacity key={s.session_id}
                style={[ss.sessionCard, { backgroundColor: c.card }]}
                onPress={() => router.push(`/session/${s.session_id}`)}>
                <View style={[ss.sessionDot, { backgroundColor: s.has_anomaly ? '#ef444420' : '#10b98120' }]}>
                  <Ionicons name={s.has_anomaly ? 'warning' : 'checkmark-circle'}
                    size={22} color={s.has_anomaly ? '#ef4444' : '#10b981'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.sessionName, { color: c.text }]}>{s.name || 'Simulation'}</Text>
                  <Text style={[ss.sessionMeta, { color: c.sub }]}>
                    {s.timestamp ? new Date(s.timestamp).toLocaleDateString('en-IN') : 'Recent'} · {s.event_count ?? 0} events
                  </Text>
                  {s.ai_insights?.[0] && (
                    <Text style={[ss.sessionInsight, { color: c.sub }]} numberOfLines={1}>
                      {s.ai_insights[0]}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.sub} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  // ── Routine Panel ─────────────────────────────────────────────────────────

  const renderRoutinePanel = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 62, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}>

        {/* Linked Health Modules - Navigation to External Modules */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[ss.section, { color: c.text, marginTop: 0 }]}>
            Linked Health Modules
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              style={[ss.actionBtn, { backgroundColor: '#0ea5e9', flex: 0 }]}
              onPress={() => router.push('/hydration')}>
              <Text style={ss.addBtnTxt}>💧 Hydration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ss.actionBtn, { backgroundColor: '#10b981', flex: 0 }]}
              onPress={() => router.push('/activity')}>
              <Text style={ss.addBtnTxt}>🏃 Activity</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ss.actionBtn, { backgroundColor: '#f59e0b', flex: 0 }]}
              onPress={() => router.push('/nutrition')}>
              <Text style={ss.addBtnTxt}>🍽️ Nutrition</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ss.actionBtn, { backgroundColor: '#6366f1', flex: 0 }]}
              onPress={() => router.push('/rest')}>
              <Text style={ss.addBtnTxt}>😴 Rest</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)}
              style={[ss.tabBtn, activeTab === t.id && { borderBottomWidth: 2, borderBottomColor: c.active }]}>
              <Text style={{ fontSize: 18 }}>{t.icon}</Text>
              <Text style={[ss.tabBtnLabel, { color: activeTab === t.id ? c.active : c.sub }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <View style={[ss.tabPanel, { backgroundColor: c.card }]}>
          {renderTabContent()}
        </View>

        {/* Today's Timeline */}
        {todayEvents.length > 0 && (
          <>
            <View style={ss.rowBetween}>
              <Text style={[ss.section, { color: c.text }]}>Today's Timeline ({todayEvents.length})</Text>
              <TouchableOpacity onPress={() => Alert.alert('Clear', 'Clear all events?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clearToday },
              ])}>
                <Text style={{ color: '#ef4444', fontSize: 12 }}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {todayEvents.map(ev => (
              <View key={ev.id} style={[ss.eventRow, { backgroundColor: c.card }]}>
                <Text style={{ fontSize: 22 }}>{ev.displayIcon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.eventLabel, { color: c.text }]}>{ev.displayLabel}</Text>
                  <Text style={[ss.eventTime, { color: c.sub }]}>{wallTimeToLabel(ev.wallTime)}</Text>
                </View>
                <TouchableOpacity onPress={() => removeEvent(ev.id)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Action Buttons */}
        <View style={ss.actionRow}>
          {todayEvents.length > 0 && (
            <TouchableOpacity style={[ss.actionBtn, { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}
              onPress={() => setSaveRoutineModal(true)}>
              <Ionicons name="bookmark-outline" size={18} color={c.active} />
              <Text style={[ss.actionBtnTxt, { color: c.active }]}>Save Routine</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[ss.actionBtn, { backgroundColor: c.active, flex: 1 }]}
            onPress={handleSimulate}
            disabled={simulationStatus === 'running' || simulationStatus === 'queued'}>
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={[ss.actionBtnTxt, { color: '#fff' }]}>
              {simulationStatus === 'running' ? 'Running...' : 'Simulate'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Modals ────────────────────────────────────────────────────────────────

  const renderModals = () => (
    <>
      {/* Save Routine Modal */}
      <Modal visible={saveRoutineModal} transparent animationType="slide">
        <View style={ss.modalOverlay}>
          <View style={[ss.modalCard, { backgroundColor: c.card }]}>
            <Text style={[ss.modalTitle, { color: c.text }]}>Save Routine</Text>
            <Text style={[ss.modalSub, { color: c.sub }]}>
              Events will be saved with their current wall times.
              Loading later adds them back at the same time of day.
            </Text>
            <TextInput style={[ss.input, { backgroundColor: c.bg, color: c.text, borderColor: c.border }]}
              placeholder="Routine name (e.g. 'Gym Day')" placeholderTextColor={c.sub}
              value={routineName} onChangeText={setRoutineName} />
            <View style={ss.rowBetween}>
              <TouchableOpacity style={[ss.modalBtn, { borderColor: c.border, borderWidth: 1 }]}
                onPress={() => setSaveRoutineModal(false)}>
                <Text style={{ color: c.sub }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ss.modalBtn, { backgroundColor: c.active }]} onPress={handleSaveRoutine}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sim Name Modal */}
      <Modal visible={simNameModal} transparent animationType="fade">
        <View style={ss.modalOverlay}>
          <View style={[ss.modalCard, { backgroundColor: c.card }]}>
            <Text style={[ss.modalTitle, { color: c.text }]}>Name This Simulation</Text>
            <TextInput style={[ss.input, { backgroundColor: c.bg, color: c.text, borderColor: c.border }]}
              placeholder="e.g. 'Monday workout day'" placeholderTextColor={c.sub}
              value={pendingSimName} onChangeText={setPendingSimName} />
            <View style={ss.rowBetween}>
              <TouchableOpacity style={[ss.modalBtn, { borderColor: c.border, borderWidth: 1 }]}
                onPress={() => setSimNameModal(false)}>
                <Text style={{ color: c.sub }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ss.modalBtn, { backgroundColor: c.active }]} onPress={startSimulation}>
                <Ionicons name="flash" size={16} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 4, fontWeight: '700' }}>Run Simulation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  // ── Root Render ───────────────────────────────────────────────────────────

  return (
    <View style={[ss.root, { backgroundColor: c.bg }]}>
      <Header title={mode === 'dashboard' ? 'Clinical Twin' : 'Log Routine'} showBack={false} />
      

      {twinStatus === 'unregistered' && (
        <View style={[ss.noticeBar, { backgroundColor: '#f59e0b20', borderColor: '#f59e0b',
          marginTop: insets.top + 52 }]}>
          <Ionicons name="warning-outline" size={14} color="#f59e0b" />
          <Text style={ss.noticeTxt}>No twin registered — go to Profile → Calibrate Twin System</Text>
        </View>
      )}

      {mode === 'dashboard' ? renderDashboard() : renderRoutinePanel()}

      {/* FAB */}
      <TouchableOpacity
        style={[ss.fab, { backgroundColor: mode === 'dashboard' ? c.active : '#ef4444',
          bottom: insets.bottom + -5 }]}
        onPress={() => switchMode(mode === 'dashboard' ? 'routine' : 'dashboard')}>
        <Animated.View style={{ transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
          <Ionicons name="add" size={32} color="#fff" />
        </Animated.View>
      </TouchableOpacity>

      {renderModals()}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root: { flex: 1 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepItem: { alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#38bdf8' },
  stepNum: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
  stepLabel: { color: '#64748b', fontSize: 10, marginTop: 2 },
  stepLabelActive: { color: '#38bdf8' },
  stepLine: { width: 24, height: 2, backgroundColor: '#334155', marginHorizontal: 2 },
  stepLineActive: { backgroundColor: '#38bdf8' },
  simBox: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, alignItems: 'center' },
  simMsg: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  errorBox: { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  errorTxt: { color: '#ef4444', fontSize: 13, flex: 1 },
  interactionBanner: { backgroundColor: '#fbbf2420', borderRadius: 10, padding: 10, flexDirection: 'row', gap: 8, marginBottom: 10, borderWidth: 1, borderColor: '#fbbf24' },
  interactionTxt: { color: '#fbbf24', fontSize: 12, flex: 1 },

  // Score Badge
  scoreBadge: { borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scoreLetter: { fontSize: 48, fontWeight: '900', color: '#fff' },
  scoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  scoreNum: { fontSize: 36, fontWeight: '800', color: '#fff' },
  scoreSubLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  // Vitals
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vitalCard: { width: (W - 52) / 2, backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1 },
  vitalIcon: { fontSize: 20, marginBottom: 4 },
  vitalValue: { fontSize: 28, fontWeight: '800' },
  vitalUnit: { color: '#64748b', fontSize: 11, marginTop: 1 },
  vitalLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4, fontWeight: '600' },
  vitalNormal: { color: '#475569', fontSize: 10, marginTop: 2 },

  // Empty
  emptyCard: { borderRadius: 20, padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Insights
  insightPill: { borderRadius: 12, padding: 12, marginBottom: 8 },

  // Organ
  organCard: { width: 100, alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 16, padding: 12, marginRight: 10 },
  organScore: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  organName: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  organBar: { width: '100%', height: 4, backgroundColor: '#1e293b', borderRadius: 2, marginTop: 6 },
  organBarFill: { height: '100%', borderRadius: 2 },

  // Analytics Cards
  analyticsCard: { borderRadius: 16, padding: 14, marginBottom: 12 },
  analyticsTitle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  analyticsValue: { fontSize: 28, fontWeight: '800' },
  analyticsLabel: { fontSize: 12, marginTop: 2 },

  // Notice
  noticeBar: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderTopWidth: 1, borderBottomWidth: 1, paddingHorizontal: 16 },
  noticeTxt: { color: '#f59e0b', fontSize: 12, flex: 1 },

  // FAB
  fab: { position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },

  // Saved Routines
  routineCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12 },
  routineIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  routineName: { fontSize: 15, fontWeight: '700' },
  routineMeta: { fontSize: 12, marginTop: 2 },
  tagPill: { backgroundColor: '#38bdf820', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, marginRight: 4 },
  tagTxt: { color: '#38bdf8', fontSize: 10 },

  // Sessions
  sessionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12 },
  sessionDot: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sessionName: { fontSize: 14, fontWeight: '600' },
  sessionMeta: { fontSize: 12, marginTop: 2 },
  sessionInsight: { fontSize: 11, marginTop: 3, fontStyle: 'italic' },

  // Inline time row (shown inside each event tab)
  inlineTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, padding: 10, marginBottom: 10 },
  inlineTimeLabel: { fontSize: 12, fontWeight: '600', width: 80 },
  // Time Picker
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 22, fontWeight: '800', color: '#38bdf8', minWidth: 32, textAlign: 'center' },
  timeColon: { fontSize: 20, fontWeight: '800', color: '#38bdf8' },

  // Tab Bar
  tabBar: { marginBottom: 8 },
  tabBtn: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, marginRight: 4 },
  tabBtnLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  tabPanel: { borderRadius: 16, marginBottom: 10 },
  tabContent: { padding: 16 },
  tabHint: { fontSize: 12, marginBottom: 12 },

  // Inputs
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  inputSm: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, flex: 1 },

  // Chips
  chipRow: { marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', marginRight: 8 },
  chipTxt: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },

  // Add button
  addBtn: { borderRadius: 14, padding: 14, alignItems: 'center' },
  addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Events
  eventRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  eventLabel: { fontSize: 13, fontWeight: '600' },
  eventTime: { fontSize: 11, marginTop: 2 },

  // Action Row
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, padding: 14, gap: 6 },
  actionBtnTxt: { fontWeight: '700', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalSub: { fontSize: 13, marginBottom: 14, lineHeight: 18 },
  modalBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, flex: 1, justifyContent: 'center', gap: 4 },
});