import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
// BlurView removed — not used in this screen

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBiogearsTwin } from '../../context/BiogearsTwinContext';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import Header from '../components/Header';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * INSIGHTS SCREEN
 * High-fidelity Physiological Dashboard showing trends, organ health, and session history.
 */
export default function InsightsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    sessions,
    refreshSessions,
    organScores,
    vitalsTrends,
    refreshAnalytics,
    todayMacros,
    twinStatus,
    weeklySummary,
    healthScore,
  } = useBiogearsTwin();

  const [refreshing, setRefreshing] = useState(false);
  const c = colors[theme];
  const insets = useSafeAreaInsets();
  const statusBarH = Math.max(insets.top, Platform.OS === 'android' ? 24 : 20);
  const headerH = statusBarH + 52;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshSessions(), refreshAnalytics()]);
    setRefreshing(false);
  }, [refreshSessions, refreshAnalytics]);

  useEffect(() => {
    refreshAnalytics();
    refreshSessions();
  }, [refreshAnalytics, refreshSessions]);

  if (twinStatus === 'unregistered') {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Header title="Insights" showBack={false} />
        <View style={[styles.emptyContainer, { marginTop: headerH }]}>
          <Ionicons name="analytics-outline" size={80} color={c.sub} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>No Insights Yet</Text>
          <Text style={[styles.emptySub, { color: c.sub }]}>
            Register your Digital Twin to start tracking physiological trends.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Header title="Physiology Insights" showBack={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerH }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.active}
            progressViewOffset={headerH} />
        }
      >
        {/* ── SECTION 1: TODAY'S MACROS ── */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Daily Nutrition Balance</Text>
        <View style={styles.macroRow}>
          <MacroRing
            label="Calories"
            value={todayMacros.calories}
            target={2500}
            unit="kcal"
            color="#38bdf8"
            theme={c}
          />
          <View style={styles.macroStatsContainer}>
            <MacroStat label="Carbs" value={todayMacros.carbs} target={300} color="#f59e0b" theme={c} />
            <MacroStat label="Protein" value={todayMacros.protein} target={150} color="#ef4444" theme={c} />
            <MacroStat label="Fat" value={todayMacros.fat} target={80} color="#10b981" theme={c} />
          </View>
        </View>

        {/* ── SECTION 2: ORGAN HEALTH SCORES ── */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Organ System Health</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {organScores?.scores ? (
            Object.entries(organScores.scores).map(([name, data]: [string, any]) => (
              <OrganCard key={name} name={name} score={data.score} status={data.status} theme={c} />
            ))
          ) : (
             <View style={{ width: SCREEN_WIDTH - 40, alignItems: 'center' }}>
               <Text style={{ color: c.sub }}>Simulate a routine to see scores.</Text>
             </View>
          )}
        </ScrollView>

        {/* ── SECTION 3: PHYSIOLOGICAL TRENDS ── */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Vitals Trajectory</Text>
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <TrendChart data={vitalsTrends?.sessions || []} metric="heart_rate" label="Heart Rate" color="#38bdf8" theme={c} />
          <View style={styles.divider} />
          <TrendChart data={vitalsTrends?.sessions || []} metric="glucose" label="Glucose" color="#f59e0b" theme={c} />
        </View>

        {/* ── SECTION 4: SIMULATION HISTORY ── */}
        <View style={styles.rowBetween}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Simulation History</Text>
          <TouchableOpacity onPress={() => refreshSessions()}>
             <Text style={{ color: c.active }}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {sessions.length === 0 ? (
          <Text style={[styles.emptySub, { color: c.sub, textAlign: 'center', marginTop: 20 }]}>
            No simulations recorded. Go to 'Twin' to log your first routine.
          </Text>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.session_id}
              style={[styles.historyCard, { backgroundColor: c.card }]}
              onPress={() => router.push(`/session/${session.session_id}`)}
            >
              <View style={[styles.sessionIcon, { backgroundColor: session.has_anomaly ? '#ef444420' : '#10b98120' }]}>
                <Ionicons
                  name={session.has_anomaly ? 'warning' : 'checkmark-circle'}
                  size={24}
                  color={session.has_anomaly ? '#ef4444' : '#10b981'}
                />
              </View>
              <View style={styles.sessionMeta}>
                <Text style={[styles.sessionName, { color: c.text }]}>{session.name || 'Simulation Run'}</Text>
                <Text style={[styles.sessionDate, { color: c.sub }]}>
                   {session.timestamp ? new Date(session.timestamp).toLocaleDateString() : 'Recent'} · {session.event_count || 0} events
                </Text>
                {session.ai_insights && session.ai_insights.length > 0 && (
                  <Text style={[styles.sessionInsight, { color: c.sub }]} numberOfLines={1}>
                    {session.ai_insights[0]}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.sub} />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FLOATING ACTION BUTTON ── */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: c.active }]}
          onPress={() => router.navigate('/twin')}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function MacroRing({ label, value, target, unit, color, theme }: any) {
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const progress = Math.min(value / target, 1);
  const offset = circ - progress * circ;

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringLabelContainer}>
        <Text style={[styles.ringValue, { color: theme.text }]}>{Math.round(value)}</Text>
        <Text style={[styles.ringUnit, { color: theme.sub }]}>{unit}</Text>
      </View>
    </View>
  );
}

function MacroStat({ label, value, target, color, theme }: any) {
  const progress = Math.min(value / (target || 1), 1);
  return (
    <View style={styles.macroStat}>
      <View style={styles.rowBetween}>
        <Text style={[styles.macroLabel, { color: theme.sub }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: theme.text }]}>{Math.round(value)}g</Text>
      </View>
      <View style={[styles.barBg, { backgroundColor: theme.border }]}>
        <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function OrganCard({ name, score, status, theme }: any) {
  const getColor = (s: string) => {
    if (s.includes('Critical')) return '#ef4444';
    if (s.includes('Warning')) return '#f59e0b';
    return '#10b981';
  };

  return (
    <View style={[styles.organCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.organName, { color: theme.text }]}>{name}</Text>
      <Text style={[styles.organScore, { color: getColor(status) }]}>{score}%</Text>
      <Text style={[styles.organStatus, { color: theme.sub }]}>{status}</Text>
    </View>
  );
}

function TrendChart({ data, metric, label, color, theme }: any) {
  if (!data || data.length < 2) return null;
  const values: number[] = data.map((d: any) => d[metric]).filter((v: any) => v != null);
  if (values.length < 2) return null;

  const h = 80;
  const w = SCREEN_WIDTH - 80;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  });

  return (
    <View style={styles.chartContainer}>
      <View style={styles.rowBetween}>
        <Text style={[styles.chartLabel, { color: theme.sub }]}>{label}</Text>
        <Text style={[styles.chartValue, { color: theme.text }]}>
          {Math.round(values[values.length - 1])}
        </Text>
      </View>
      <Svg width={w} height={h} style={styles.chartSvg}>
        <Path d={points.join(' ')} stroke={color} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 100 },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginTop: 20 },
  emptySub: { fontSize: 16, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginVertical: 15 },
  macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ringContainer: { alignItems: 'center', justifyContent: 'center', width: 140 },
  ringLabelContainer: { position: 'absolute', alignItems: 'center' },
  ringValue: { fontSize: 24, fontWeight: '800' },
  ringUnit: { fontSize: 12 },
  macroStatsContainer: { flex: 1, paddingLeft: 10 },
  macroStat: { marginBottom: 12 },
  macroLabel: { fontSize: 13, fontWeight: '500' },
  macroValue: { fontSize: 13, fontWeight: '700' },
  barBg: { height: 6, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  horizontalScroll: { marginHorizontal: -20, paddingLeft: 20, marginBottom: 10 },
  organCard: { width: 120, padding: 15, borderRadius: 16, marginRight: 15, alignItems: 'center' },
  organName: { fontSize: 14, fontWeight: '600' },
  organScore: { fontSize: 20, fontWeight: '800', marginVertical: 4 },
  organStatus: { fontSize: 10, textAlign: 'center' },
  card: { borderRadius: 20, padding: 20, marginBottom: 15 },
  chartContainer: { marginVertical: 10 },
  chartLabel: { fontSize: 12, fontWeight: '500' },
  chartValue: { fontSize: 16, fontWeight: '700' },
  chartSvg: { marginTop: 10 },
  divider: { height: 1, backgroundColor: '#ffffff10', marginVertical: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, marginBottom: 12 },
  sessionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sessionMeta: { flex: 1, marginLeft: 15 },
  sessionName: { fontSize: 16, fontWeight: '600' },
  sessionDate: { fontSize: 12, marginTop: 2 },
  sessionInsight: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  fabContainer: {
     position: 'absolute',
     right: 25,
     bottom: 25,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
