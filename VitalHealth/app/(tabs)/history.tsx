// app/(tabs)/history.tsx
// COMBINED HEALTH HISTORY — Original app logs + BioGears simulation sessions
// Shows: BioGears sims (if registered) + symptoms + medicines + hydration + steps

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBiogearsTwin } from '../../context/BiogearsTwinContext';
import { useHydration } from '../../context/HydrationContext';
import { useMedicine } from '../../context/MedicineContext';
import { useSteps } from '../../context/StepContext';
import { useSymptoms } from '../../context/SymptomContext';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import Header from '../components/Header';

// ─── Types ────────────────────────────────────────────────────────────────────

type HistorySection = 'all' | 'biogears' | 'health' | 'symptoms';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0)  return `${days}d ago`;
  if (hrs > 0)   return `${hrs}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'Just now';
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTab({ label, active, onPress, c }: any) {
  return (
    <TouchableOpacity
      style={[styles.filterTab, active && { backgroundColor: c.active }]}
      onPress={onPress}
    >
      <Text style={[styles.filterTabText, { color: active ? '#fff' : c.sub }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// BioGears simulation session card
function SimCard({ session, onPress, c }: any) {
  const hasAnomaly = session.has_anomaly;
  return (
    <TouchableOpacity
      style={[styles.simCard, { backgroundColor: c.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={hasAnomaly ? ['#ef444410', '#ef444405'] : ['#10b98110', '#10b98105']}
        style={styles.simCardGradient}
      >
        <View style={[styles.simIcon, { backgroundColor: hasAnomaly ? '#ef444420' : '#10b98120' }]}>
          <Ionicons
            name={hasAnomaly ? 'warning' : 'checkmark-circle'}
            size={22}
            color={hasAnomaly ? '#ef4444' : '#10b981'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.simName, { color: c.text }]}>
            {session.name || 'Simulation Run'}
          </Text>
          <Text style={[styles.simMeta, { color: c.sub }]}>
            {session.timestamp ? formatDate(session.timestamp) : 'Recent'} · {session.event_count ?? 0} events
          </Text>
          {session.ai_insights?.[0] && (
            <Text style={[styles.simInsight, { color: c.sub }]} numberOfLines={1}>
              💡 {session.ai_insights[0]}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={c.sub} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Generic health log entry card
function LogCard({ icon, title, subtitle, time, color, onPress, c }: any) {
  return (
    <TouchableOpacity
      style={[styles.logCard, { backgroundColor: c.card }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.logIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.logTitle, { color: c.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.logSub, { color: c.sub }]}>{subtitle}</Text> : null}
      </View>
      <Text style={[styles.logTime, { color: c.sub }]}>{time}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = colors[theme];

  const insets = useSafeAreaInsets();
  const statusBarH = Math.max(insets.top, Platform.OS === 'android' ? 24 : 20);
  const headerH = statusBarH + 52;

  const { sessions, refreshSessions, twinStatus } = useBiogearsTwin();
  const { activeSymptoms, historySymptoms, refreshSymptoms } = useSymptoms();
  const { medicines } = useMedicine();
  const { water } = useHydration();
  const { steps, calories } = useSteps();

  const [section, setSection] = useState<HistorySection>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshSessions(),
      refreshSymptoms(),
    ]);
    setRefreshing(false);
  }, [refreshSessions, refreshSymptoms]);

  useEffect(() => {
    refreshSymptoms();
    if (twinStatus === 'ready') refreshSessions();
  }, [twinStatus]);

  // ── Severity color ────────────────────────────────────────────────────────
  const severityColor = (s: string) => {
    switch (s) {
      case 'emergency': return '#ef4444';
      case 'severe':    return '#f97316';
      case 'moderate':  return '#f59e0b';
      default:          return '#10b981';
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const showBio     = section === 'all' || section === 'biogears';
  const showHealth  = section === 'all' || section === 'health';
  const showSymptom = section === 'all' || section === 'symptoms';

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Header title="Health History" showBack={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: headerH + 12 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.active}
            progressViewOffset={headerH}
          />
        }
      >
        {/* ── Filter Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {([
            ['all',      'All'],
            ['biogears', '🫀 Simulations'],
            ['health',   '📊 Health Log'],
            ['symptoms', '🩺 Symptoms'],
          ] as [HistorySection, string][]).map(([key, label]) => (
            <SectionTab key={key} label={label} active={section === key} onPress={() => setSection(key)} c={c} />
          ))}
        </ScrollView>

        {/* ── BioGears Simulations ── */}
        {showBio && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Simulation History</Text>
              {sessions.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/twin')}>
                  <Text style={[styles.sectionAction, { color: c.active }]}>+ New</Text>
                </TouchableOpacity>
              )}
            </View>

            {twinStatus === 'unregistered' ? (
              <TouchableOpacity
                style={[styles.emptyCard, { backgroundColor: c.card }]}
                onPress={() => router.push('/profile')}
              >
                <Text style={{ fontSize: 32 }}>🔬</Text>
                <Text style={[styles.emptyTitle, { color: c.text }]}>Twin Not Set Up</Text>
                <Text style={[styles.emptySub, { color: c.sub }]}>
                  Go to Profile → calibrate your BioGears digital twin to see simulations here.
                </Text>
                <View style={[styles.emptyBtn, { backgroundColor: c.active }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Go to Profile</Text>
                </View>
              </TouchableOpacity>
            ) : sessions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: c.card }]}>
                <Text style={{ fontSize: 32 }}>📭</Text>
                <Text style={[styles.emptyTitle, { color: c.text }]}>No Simulations Yet</Text>
                <Text style={[styles.emptySub, { color: c.sub }]}>
                  Log your daily routine in the Twin tab and run your first simulation.
                </Text>
              </View>
            ) : (
              sessions.map(s => (
                <SimCard
                  key={s.session_id}
                  session={s}
                  c={c}
                  onPress={() => router.push(`/session/${s.session_id}`)}
                />
              ))
            )}
          </>
        )}

        {/* ── Health Log ── */}
        {showHealth && (
          <>
            <Text style={[styles.sectionTitle, { color: c.text, marginTop: showBio ? 24 : 0 }]}>
              Today's Health Log
            </Text>

            {/* Steps & Calories */}
            <LogCard
              icon="🚶"
              title={`${steps.toLocaleString('en-IN')} steps`}
              subtitle={`${calories} kcal burned`}
              time="Today"
              color="#f97316"
              c={c}
              onPress={() => router.push('/step-intelligence')}
            />

            {/* Hydration */}
            <LogCard
              icon="💧"
              title={`${water} mL hydration`}
              subtitle={water >= 2000 ? '✅ Goal reached' : `${2000 - water} mL until goal`}
              time="Today"
              color="#38bdf8"
              c={c}
              onPress={() => router.push('/hydration')}
            />

            {/* Medicines */}
            {medicines.length === 0 ? (
              <LogCard
                icon="💊"
                title="No medicines scheduled"
                subtitle="Tap to add medication reminders"
                time=""
                color="#8b5cf6"
                c={c}
                onPress={() => router.push('/MedicationVault')}
              />
            ) : (
              medicines.slice(0, 3).map((m: any) => (
                <LogCard
                  key={m.id}
                  icon="💊"
                  title={m.name}
                  subtitle={`${m.dose} · ${m.time}`}
                  time={m.time || '—'}
                  color="#8b5cf6"
                  c={c}
                  onPress={() => router.push('/MedicationVault')}
                />
              ))
            )}

            {medicines.length > 3 && (
              <TouchableOpacity onPress={() => router.push('/MedicationVault')}>
                <Text style={[styles.viewMore, { color: c.active }]}>
                  +{medicines.length - 3} more medicines →
                </Text>
              </TouchableOpacity>
            )}

            {/* Quick actions row */}
            <View style={styles.quickRow}>
              {[
                { icon: '🍎', label: 'Nutrition',  route: '/nutrition' },
                { icon: '💪', label: 'Activity',   route: '/activity' },
                { icon: '😴', label: 'Sleep',      route: '/rest' },
                { icon: '🧠', label: 'AI Health',  route: '/ai-health' },
              ].map(item => (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.quickCard, { backgroundColor: c.card }]}
                  onPress={() => router.push(item.route as any)}
                >
                  <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                  <Text style={[styles.quickLabel, { color: c.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Symptoms ── */}
        {showSymptom && (
          <>
            <View style={[styles.sectionHeader, { marginTop: (showBio || showHealth) ? 24 : 0 }]}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Symptom History</Text>
              <TouchableOpacity onPress={() => router.push('/symptom-log')}>
                <Text style={[styles.sectionAction, { color: c.active }]}>+ Log</Text>
              </TouchableOpacity>
            </View>

            {activeSymptoms.length === 0 && (!historySymptoms || historySymptoms.length === 0) ? (
              <View style={[styles.emptyCard, { backgroundColor: c.card }]}>
                <Text style={{ fontSize: 32 }}>🩺</Text>
                <Text style={[styles.emptyTitle, { color: c.text }]}>No Symptoms Logged</Text>
                <Text style={[styles.emptySub, { color: c.sub }]}>
                  Log symptoms anytime to track patterns over time.
                </Text>
              </View>
            ) : (
              <>
                {activeSymptoms.map((s: any) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.symptomCard, { backgroundColor: c.card }]}
                    onPress={() => router.push({
                      pathname: '/symptom-followup',
                      params: { id: s.id.toString(), name: s.name },
                    })}
                  >
                    <View style={[styles.symptomBadge, { backgroundColor: severityColor(s.severity) + '20' }]}>
                      <Ionicons name="medical" size={20} color={severityColor(s.severity)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.symptomName, { color: c.text }]}>{s.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
                        <View style={[styles.severityPill, { backgroundColor: severityColor(s.severity) }]}>
                          <Text style={styles.severityTxt}>{s.severity}</Text>
                        </View>
                        <Text style={[styles.logSub, { color: c.sub }]}>Active · {timeAgo(s.startedAt)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.sub} />
                  </TouchableOpacity>
                ))}

                {historySymptoms?.slice(0, 5).map((s: any) => (
                  <LogCard
                    key={s.id}
                    icon="🩹"
                    title={s.name}
                    subtitle={`Resolved · ${s.severity}`}
                    time={s.startedAt ? timeAgo(s.startedAt) : ''}
                    color="#94a3b8"
                    c={c}
                    onPress={() => router.push('/symptom-history')}
                  />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1 },
  scroll:           { flex: 1 },
  content:          { paddingHorizontal: 16, paddingBottom: 20 },

  filterRow:        { marginBottom: 12, marginHorizontal: -4 },
  filterTab:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  filterTabText:    { fontSize: 12, fontWeight: '600' },

  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:     { fontSize: 17, fontWeight: '700' },
  sectionAction:    { fontSize: 14, fontWeight: '600' },

  // Sim cards
  simCard:          { borderRadius: 16, marginBottom: 10, overflow: 'hidden' },
  simCardGradient:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  simIcon:          { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  simName:          { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  simMeta:          { fontSize: 12 },
  simInsight:       { fontSize: 11, marginTop: 4, fontStyle: 'italic' },

  // Log cards
  logCard:          { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, gap: 12 },
  logIcon:          { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logTitle:         { fontSize: 14, fontWeight: '600' },
  logSub:           { fontSize: 12, marginTop: 2 },
  logTime:          { fontSize: 11 },

  // Symptom cards
  symptomCard:      { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, gap: 12 },
  symptomBadge:     { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  symptomName:      { fontSize: 15, fontWeight: '600' },
  severityPill:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  severityTxt:      { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  // Quick actions
  quickRow:         { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 4 },
  quickCard:        { width: '23%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', gap: 4 },
  quickLabel:       { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  viewMore:         { fontSize: 13, fontWeight: '600', textAlign: 'right', marginVertical: 6 },

  // Empty state
  emptyCard:        { borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 10 },
  emptyTitle:       { fontSize: 17, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  emptySub:         { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn:         { marginTop: 14, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
});