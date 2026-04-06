// app/hydration.tsx
// HYDRATION TRACKER — Simple Water Tracking with Notifications

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useHydration } from "../context/HydrationContext";
import { useTheme } from "../context/ThemeContext";
import { cancelHydrationReminder, scheduleHydrationReminder } from "../services/hydrationNotification";
import { isExpoGo } from "../utils/expoGo";

const REMINDER_STORAGE_KEY = "hydration_reminder_settings";

type ReminderSettings = {
  enabled: boolean;
  interval: string; // '30m', '1h', '2h'
  startTime: Date;
  endTime: Date;
};

export default function HydrationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { water, addWater, reset } = useHydration();

  const colors =
    theme === "light"
      ? {
          bg: "#f8fafc",
          card: "#ffffff",
          text: "#020617",
          sub: "#64748b",
          border: "#e2e8f0",
          accent: "#0ea5e9",
          accentSoft: "#bae6fd",
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
        }
      : {
          bg: "#020617",
          card: "#0f172a",
          text: "#ffffff",
          sub: "#94a3b8",
          border: "#334155",
          accent: "#38bdf8",
          accentSoft: "#0ea5e9",
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
        };

  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enabled: false,
    interval: "1h",
    startTime: new Date(new Date().setHours(7, 0, 0, 0)),
    endTime: new Date(new Date().setHours(21, 0, 0, 0)),
  });

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [toast, setToast] = useState("");
  const [isSleepTime, setIsSleepTime] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ✅ STEP 1 — REMOVED ANDROID CHANNEL BLOCK (Notifee handles channels)

  // 🔹 Modified scheduleReminder to accept optional custom interval
  const scheduleReminder = async (customInterval?: string) => {
    // Skip reminder scheduling in Expo Go
    if (isExpoGo()) {
      setToast("Reminders require a development build");
      setTimeout(() => setToast(""), 2000);
      return;
    }

    try {
      // ✅ STEP 2 — REPLACED WITH SIMPLE VERSION
      // cancel existing reminders
      await cancelHydrationReminder();

      if (!reminderSettings.enabled) return;

      const intervalMap: { [key: string]: number } = {
        "30m": 1800, // 30 minutes
        "1h": 3600,  // 1 hour
        "2h": 7200,  // 2 hours
      };

      // Use customInterval if provided, otherwise use the state value
      const intervalToUse = customInterval || reminderSettings.interval;
      const seconds = intervalMap[intervalToUse];

      if (!seconds) {
        console.error("Invalid interval:", intervalToUse);
        return;
      }

      // schedule new ones
      await scheduleHydrationReminder(seconds);

      console.log(`Reminder scheduled every ${intervalToUse}`);
      setToast(`Reminders set for every ${intervalToUse}`);
      setTimeout(() => setToast(""), 2000);
    } catch (error) {
      console.error("Error scheduling reminder:", error);
      setToast("Failed to set reminders");
      setTimeout(() => setToast(""), 2000);
    }
  };

  // Load reminder settings
  useEffect(() => {
    loadReminderSettings();
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveReminderSettings();
    }
  }, [reminderSettings]);

  // Check if current time is within waking hours
  useEffect(() => {
    if (reminderSettings.enabled) {
      checkIfSleepTime();
    }
  }, [reminderSettings.enabled, reminderSettings.startTime, reminderSettings.endTime]);

  // Celebrate animation when water is added
  useEffect(() => {
    if (water > 0) {
      celebrate();
    }
  }, [water]);

  // Check if current time is within waking hours
  const checkIfSleepTime = () => {
    const now = new Date();
    const start = new Date(reminderSettings.startTime);
    const end = new Date(reminderSettings.endTime);
    
    start.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    end.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());

    const isSleeping = now < start || now > end;
    setIsSleepTime(isSleeping);
    return isSleeping;
  };

  // Load saved reminder settings
  const loadReminderSettings = async () => {
    try {
      setIsLoading(true);
      const saved = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setReminderSettings({
          enabled: parsed.enabled || false,
          interval: parsed.interval || "1h",
          startTime: new Date(parsed.startTime) || new Date(new Date().setHours(7, 0, 0, 0)),
          endTime: new Date(parsed.endTime) || new Date(new Date().setHours(21, 0, 0, 0)),
        });
      }
    } catch (error) {
      console.error("Error loading reminder settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save reminder settings
  const saveReminderSettings = async () => {
    try {
      const settingsToSave = {
        enabled: reminderSettings.enabled,
        interval: reminderSettings.interval,
        startTime: reminderSettings.startTime.toISOString(),
        endTime: reminderSettings.endTime.toISOString(),
      };
      await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settingsToSave));
      console.log("Settings saved:", settingsToSave);
    } catch (error) {
      console.error("Error saving reminder settings:", error);
    }
  };

  // ✅ STEP 3 — FIXED toggleReminders (removed requestPermissionsAsync)
  const toggleReminders = async (value: boolean) => {
    setReminderSettings(prev => ({ ...prev, enabled: value }));

    if (value) {
      if (isExpoGo()) {
        setToast("Reminders require a development build");
        setTimeout(() => setToast(""), 2000);
        setReminderSettings(prev => ({ ...prev, enabled: false }));
        return;
      }

      await scheduleReminder(reminderSettings.interval);
    } else {
      await cancelHydrationReminder();
      setToast("Reminders turned off");
      setTimeout(() => setToast(""), 2000);
    }
  };

  // 🔹 Fixed handleIntervalSelect - passes interval directly to scheduleReminder
  const handleIntervalSelect = async (interval: string) => {
    setReminderSettings(prev => ({ 
      ...prev, 
      interval: interval 
    }));

    // If reminders are enabled, reschedule with the new interval directly
    if (reminderSettings.enabled) {
      await scheduleReminder(interval); // Pass interval directly to avoid state delay
    }
  };

  // 🔹 Fixed onTimeChange - passes interval to scheduleReminder
  const onTimeChange = async (type: 'start' | 'end', event: any, selectedDate?: Date) => {
    if (type === 'start') {
      setShowStartPicker(false);
      if (selectedDate) {
        setReminderSettings(prev => ({ ...prev, startTime: selectedDate }));
      }
    } else {
      setShowEndPicker(false);
      if (selectedDate) {
        setReminderSettings(prev => ({ ...prev, endTime: selectedDate }));
      }
    }

    // Reschedule with current interval if reminders are enabled
    if (reminderSettings.enabled) {
      console.log("Time range updated, rescheduling notifications...");
      await scheduleReminder(reminderSettings.interval);
    }
  };

  const celebrate = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.08,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAddWater = (ml: number) => {
    addWater(ml);
    setToast(`Added ${ml}ml ✓`);
    setTimeout(() => setToast(""), 2000);
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Hydration",
      "Are you sure you want to reset today's water intake?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            reset();
            setToast("Reset complete ✓");
            setTimeout(() => setToast(""), 2000);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Hydration
        </Text>

        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Ionicons name="refresh" size={22} color={colors.sub} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* WATER DISPLAY */}
        <Animated.View style={[styles.waterCard, { transform: [{ scale: pulseAnim }] }]}>
          <View
            style={[
              styles.waterContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.waterIconContainer}>
              <Text style={styles.waterIcon}>💧</Text>
            </View>

            <View style={styles.waterInfo}>
              <Text style={[styles.waterLabel, { color: colors.sub }]}>
                Water drunk today
              </Text>
              <Text style={[styles.waterAmount, { color: colors.accent }]}>
                {water} ml
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* QUICK BUTTONS */}
        <View style={styles.grid}>
          {[150, 250, 500, 750].map((ml) => (
            <TouchableOpacity
              key={ml}
              style={[styles.btn, { backgroundColor: colors.card }]}
              onPress={() => handleAddWater(ml)}
            >
              <Text style={styles.icon}>🥛</Text>
              <Text style={[styles.btnText, { color: colors.text }]}>
                +{ml}ml
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* REMINDER SETTINGS */}
        <View style={[styles.module, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={styles.moduleHeader}>
              <Ionicons name="notifications-outline" size={20} color={colors.accent} />
              <Text style={[styles.moduleTitle, { color: colors.text }]}>
                Reminders
              </Text>
            </View>

            <Switch 
              value={reminderSettings.enabled} 
              onValueChange={toggleReminders}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={Platform.OS === 'ios' ? undefined : colors.card}
            />
          </View>

          {reminderSettings.enabled && (
            <View style={styles.reminderDetails}>
              {/* Interval Selection */}
              <View style={styles.intervalSection}>
                <Text style={[styles.sectionLabel, { color: colors.sub }]}>
                  Remind me every
                </Text>
                <View style={styles.intervalRow}>
                  {['30m', '1h', '2h'].map(interval => (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.intervalBtn,
                        {
                          backgroundColor:
                            reminderSettings.interval === interval 
                              ? colors.accent 
                              : colors.border,
                        },
                      ]}
                      onPress={() => handleIntervalSelect(interval)}
                    >
                      <Text
                        style={{
                          color: reminderSettings.interval === interval 
                            ? "#fff" 
                            : colors.text,
                          fontWeight: reminderSettings.interval === interval ? "bold" : "normal",
                          fontSize: 16,
                        }}
                      >
                        {interval}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time Range - Between */}
              <View style={styles.timeRangeSection}>
                <Text style={[styles.sectionLabel, { color: colors.sub }]}>
                  Between
                </Text>
                
                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={[styles.timeButton, { backgroundColor: colors.border }]}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Ionicons name="sunny" size={16} color={colors.accent} />
                    <Text style={[styles.timeText, { color: colors.text }]}>
                      {reminderSettings.startTime.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </TouchableOpacity>

                  <Text style={[styles.timeSeparator, { color: colors.sub }]}>and</Text>

                  <TouchableOpacity
                    style={[styles.timeButton, { backgroundColor: colors.border }]}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Ionicons name="moon" size={16} color={colors.accent} />
                    <Text style={[styles.timeText, { color: colors.text }]}>
                      {reminderSettings.endTime.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isSleepTime && (
                  <View style={[styles.sleepNotice, { backgroundColor: colors.danger + '20' }]}>
                    <Ionicons name="moon" size={16} color={colors.danger} />
                    <Text style={[styles.sleepNoticeText, { color: colors.danger }]}>
                      Currently outside selected hours - notifications will be paused
                    </Text>
                  </View>
                )}
              </View>

              {/* Testing Notice for Expo Go */}
              {__DEV__ && isExpoGo() && (
                <View style={[styles.testingNotice, { backgroundColor: colors.warning + '20' }]}>
                  <Ionicons name="information-circle" size={16} color={colors.warning} />
                  <Text style={[styles.testingText, { color: colors.warning }]}>
                    Expo Go mode: Notifications require a development build. Use "npx expo run:android" to test notifications.
                  </Text>
                </View>
              )}

              {/* Reminder Status */}
              <View style={[styles.statusCard, { backgroundColor: colors.border }]}>
                <Ionicons 
                  name={reminderSettings.enabled ? "notifications" : "notifications-off"} 
                  size={16} 
                  color={reminderSettings.enabled ? colors.success : colors.sub} 
                />
                <Text style={[styles.statusText, { color: colors.sub }]}>
                  {reminderSettings.enabled 
                    ? `Notifications set for every ${reminderSettings.interval}` 
                    : "Enable reminders to get notified to drink water"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Time Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={reminderSettings.startTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={(event, date) => onTimeChange('start', event, date)}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={reminderSettings.endTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={(event, date) => onTimeChange('end', event, date)}
          />
        )}

        {/* SYNC STATUS */}
        <View style={[styles.syncStatus, { backgroundColor: colors.card }]}>
          <Ionicons name="sync" size={20} color={colors.accent} />
          <Text style={[styles.syncText, { color: colors.sub }]}>
            Auto-syncs with Home screen
          </Text>
        </View>

        {/* Toast Message */}
        {toast !== "" && (
          <View style={[styles.toast, { backgroundColor: colors.accent }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

///////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
  },

  resetButton: {
    padding: 8,
  },

  container: {
    paddingBottom: 60,
    alignItems: "center",
  },

  waterCard: {
    width: "90%",
    marginVertical: 20,
  },

  waterContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  waterIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  waterIcon: {
    fontSize: 32,
  },

  waterInfo: {
    flex: 1,
  },

  waterLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },

  waterAmount: {
    fontSize: 40,
    fontWeight: "bold",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    marginBottom: 16,
    width: "90%",
  },

  btn: {
    flex: 1,
    minWidth: 130,
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
  },

  icon: { fontSize: 24 },

  btnText: { fontWeight: "bold", marginTop: 6 },

  module: {
    width: "90%",
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
  },

  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  moduleTitle: { 
    fontWeight: "bold",
    fontSize: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  reminderDetails: {
    marginTop: 16,
    gap: 16,
  },

  intervalSection: {
    gap: 8,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },

  intervalRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 8,
  },

  intervalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  timeRangeSection: {
    gap: 8,
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  timeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },

  timeText: {
    fontSize: 14,
    fontWeight: "500",
  },

  timeSeparator: {
    fontSize: 14,
    fontWeight: "500",
  },

  sleepNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },

  sleepNoticeText: {
    fontSize: 13,
    flex: 1,
  },

  testingNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },

  testingText: {
    flex: 1,
    fontSize: 12,
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },

  statusText: {
    flex: 1,
    fontSize: 12,
  },

  syncStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    padding: 12,
    borderRadius: 20,
    gap: 8,
  },

  syncText: {
    fontSize: 14,
  },

  toast: {
    position: "absolute",
    bottom: 30,
    padding: 12,
    borderRadius: 20,
  },

  toastText: {
    color: "#fff",
    fontWeight: "bold",
  },
});