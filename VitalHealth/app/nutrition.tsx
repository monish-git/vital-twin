// app/nutrition.tsx
// PROFESSIONAL NUTRITION PAGE — synced via NutritionContext

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import {
  foodDatabase,
  healthProfiles,
  mealTypes,
  useNutrition,
} from "../context/NutritionContext";
import { useTheme } from "../context/ThemeContext";
import { useBiogearsTwin } from "../context/BiogearsTwinContext";

const GOAL = 2000;

export default function NutritionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    totals,
    selectedProfile,
    foodEntries,
    mealReminders,
    addFoodEntry,
    removeFoodEntry,
    setProfile,
    toggleReminder,
    updateReminderTime,
    getMealEntries,
  } = useNutrition();

  const { addEvent } = useBiogearsTwin();

  const { calories, protein, carbs, fat, sugar, sodium, fiber } = totals;

  const colors =
    theme === "light"
      ? {
          bg: "#f8fafc", card: "#ffffff", text: "#020617", sub: "#64748b",
          border: "#e2e8f0", accent: "#0ea5e9", success: "#10b981",
          warning: "#f59e0b", danger: "#ef4444", purple: "#8b5cf6", orange: "#f97316",
        }
      : {
          bg: "#020617", card: "#1e293b", text: "#ffffff", sub: "#94a3b8",
          border: "#334155", accent: "#38bdf8", success: "#22c55e",
          warning: "#f59e0b", danger: "#ef4444", purple: "#a78bfa", orange: "#fb923c",
        };

  const [modalVisible, setModalVisible]         = useState(false);
  const [selectedMeal, setSelectedMeal]         = useState<typeof mealTypes[0] | null>(null);
  const [showFoodPicker, setShowFoodPicker]     = useState(false);
  const [showTimePicker, setShowTimePicker]     = useState(false);
  const [aiTip, setAiTip]                       = useState("");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReminder, setEditingReminder]   = useState<typeof mealReminders[0] | null>(null);
  const [customFood, setCustomFood]             = useState("");
  const [customCalories, setCustomCalories]     = useState("");

  // Animate in
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Generate AI tip whenever totals or profile change
  useEffect(() => {
    generateAITip();
  }, [selectedProfile, calories, protein, sugar, sodium]);

  const generateAITip = () => {
    const rec = selectedProfile.recommendations;
    const remainingCal  = rec.calories - calories;
    const proteinPct    = (protein / rec.protein) * 100;
    const sugarPct      = (sugar   / rec.sugar)   * 100;
    const sodiumPct     = (sodium  / rec.sodium)   * 100;

    let tip = "";
    if (sodiumPct > 90)       tip = "⚠️ High sodium intake! Choose low-sodium options for your next meal.";
    else if (sugarPct > 90)   tip = "🍬 Sugar alert! Opt for fruits instead of processed sweets.";
    else if (proteinPct < 50) tip = "💪 Increase protein intake with lean meats, eggs, or legumes.";
    else if (remainingCal < 300) tip = "🎯 You're close to your calorie goal! Make your next meal count.";
    else {
      const idx = Math.floor(Math.random() * selectedProfile.tips.length);
      tip = `💡 ${selectedProfile.tips[idx]}`;
    }
    setAiTip(tip);
  };

  // ── Food entry helpers ────────────────────────────────────────────────────
  const handleAddFood = (food: typeof foodDatabase[0]) => {
    if (!selectedMeal) return;

    // Add to Nutrition Context
    addFoodEntry({
      mealId:   selectedMeal.id,
      foodId:   food.id,
      foodName: food.name,
      calories: food.calories,
      protein:  food.protein,
      carbs:    food.carbs,
      fat:      food.fat,
      sugar:    food.sugar,
      sodium:   food.sodium,
      fiber:    food.fiber,
    });

    // Sync with Bio-GARES Digital Twin
    try {
      const now = new Date();
      const wallTime = now.toTimeString().slice(0, 5);

      addEvent({
  event_type: "meal",
  value: food.calories,
  wallTime,
  meal_type: selectedMeal.id as
    | "balanced"
    | "high_carb"
    | "high_protein"
    | "fast_food"
    | "ketogenic"
    | "custom",
  carb_g: food.carbs,
  fat_g: food.fat,
  protein_g: food.protein,
  displayLabel: `${selectedMeal.label} · ${food.name} (${food.calories} kcal)`,
  displayIcon: selectedMeal.icon,
});
    } catch (error) {
      console.error("BioGears Nutrition Sync Error:", error);
    }

    setShowFoodPicker(false);
    setModalVisible(false);
    Alert.alert("Added", `${food.name} added to ${selectedMeal.label}`);
  };

  const handleAddCustomFood = () => {
    if (!selectedMeal || !customFood || !customCalories) return;
    const cal = parseInt(customCalories);
    if (isNaN(cal)) return;

    // Add to Nutrition Context
    addFoodEntry({
      mealId:   selectedMeal.id,
      foodId:   `custom_${Date.now()}`,
      foodName: customFood,
      calories: cal,
      protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, fiber: 0,
    });

    // Sync with Bio-GARES Digital Twin
    try {
      const now = new Date();
      const wallTime = now.toTimeString().slice(0, 5);

      addEvent({
  event_type: "meal",
  value: cal,
  wallTime,
  meal_type: selectedMeal.id as
    | "balanced"
    | "high_carb"
    | "high_protein"
    | "fast_food"
    | "ketogenic"
    | "custom",
  displayLabel: `${selectedMeal.label} · ${customFood} (${cal} kcal)`,
  displayIcon: selectedMeal.icon,
});
    } catch (error) {
      console.error("BioGears Nutrition Sync Error:", error);
    }

    setCustomFood("");
    setCustomCalories("");
    setModalVisible(false);
    Alert.alert("Added", `${customFood} added to ${selectedMeal.label}`);
  };

  // ── Ring progress ─────────────────────────────────────────────────────────
  const progress     = Math.min(calories / GOAL, 1);
  const radius       = 54;
  const circumference = 2 * Math.PI * radius;
  const offset       = circumference * (1 - progress);

  const filteredFoods = selectedMeal
    ? foodDatabase.filter(
        (f) =>
          f.category === selectedMeal.id ||
          (selectedMeal.id.includes("snack") && f.category === "snack")
      )
    : [];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>NUTRITION</Text>
        <TouchableOpacity onPress={() => setShowReminderModal(true)}>
          <Ionicons name="notifications-outline" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Calories Ring */}
          <View style={styles.hud}>
            <Svg width={140} height={140}>
              <G rotation="-90" origin="70,70">
                <Circle cx="70" cy="70" r={radius} stroke={colors.border} strokeWidth="12" fill="none" />
                <Circle
                  cx="70" cy="70" r={radius}
                  stroke={colors.accent} strokeWidth="12"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  strokeLinecap="round" fill="none"
                />
              </G>
            </Svg>
            <View style={styles.ringText}>
              <Text style={[styles.kcal, { color: colors.text }]}>{GOAL - calories}</Text>
              <Text style={[styles.kcalSub, { color: colors.sub }]}>KCAL LEFT</Text>
            </View>
          </View>

          {/* Macros Grid */}
          <View style={styles.macrosGrid}>
            {[
              { label: "Protein", value: protein, unit: "g", color: colors.accent,  pct: (protein / selectedProfile.recommendations.protein) * 100 },
              { label: "Carbs",   value: carbs,   unit: "g", color: colors.orange,  pct: (carbs   / selectedProfile.recommendations.carbs)   * 100 },
              { label: "Fat",     value: fat,     unit: "g", color: colors.warning, pct: (fat     / selectedProfile.recommendations.fat)     * 100 },
              { label: "Fiber",   value: fiber,   unit: "g", color: colors.success, pct: (fiber   / selectedProfile.recommendations.fiber)   * 100 },
            ].map((m) => (
              <View key={m.label} style={[styles.macroCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.macroValue, { color: m.color }]}>{Math.round(m.value)}{m.unit}</Text>
                <Text style={[styles.macroLabel, { color: colors.sub }]}>{m.label}</Text>
                <View style={[styles.macroBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.macroFill, { width: `${Math.min(100, m.pct)}%`, backgroundColor: m.color }]} />
                </View>
                <Text style={[styles.macroTarget, { color: colors.sub }]}>
                  / {m.label === "Protein" ? selectedProfile.recommendations.protein
                    : m.label === "Carbs"  ? selectedProfile.recommendations.carbs
                    : m.label === "Fat"    ? selectedProfile.recommendations.fat
                    : selectedProfile.recommendations.fiber}{m.unit} goal
                </Text>
              </View>
            ))}
          </View>

          {/* Health Profiles */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profilesScroll}>
            {healthProfiles.map((profile) => (
              <TouchableOpacity
                key={profile.id}
                style={[
                  styles.profileChip,
                  {
                    backgroundColor: selectedProfile.id === profile.id ? profile.color : colors.card,
                    borderColor: profile.color,
                  },
                ]}
                onPress={() => setProfile(profile.id)}
              >
                <Text style={styles.profileIcon}>{profile.icon}</Text>
                <Text style={[styles.profileLabel, { color: selectedProfile.id === profile.id ? "#fff" : colors.text }]}>
                  {profile.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* AI Tip Card */}
          <LinearGradient
            colors={[colors.accent + "20", colors.purple + "20"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.aiCard, { borderColor: colors.accent }]}
          >
            <Ionicons name="bulb" size={24} color={colors.accent} />
            <Text style={[styles.aiTipText, { color: colors.text }]}>{aiTip || "Loading insights..."}</Text>
          </LinearGradient>

          {/* Micros Row */}
          <View style={styles.microsRow}>
            <View style={[styles.microBadge, { backgroundColor: colors.danger + "20" }]}>
              <Ionicons name="warning" size={14} color={colors.danger} />
              <Text style={[styles.microText, { color: colors.danger }]}>
                Sodium: {Math.round(sodium)}mg / {selectedProfile.recommendations.sodium}mg
              </Text>
            </View>
            <View style={[styles.microBadge, { backgroundColor: colors.warning + "20" }]}>
              <Ionicons name="flash" size={14} color={colors.warning} />
              <Text style={[styles.microText, { color: colors.warning }]}>
                Sugar: {Math.round(sugar)}g / {selectedProfile.recommendations.sugar}g
              </Text>
            </View>
          </View>

          {/* Meals Grid */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Meals</Text>

          {mealTypes.map((meal) => {
            const entries         = getMealEntries(meal.id);
            const reminder        = mealReminders.find((r) => r.mealId === meal.id);
            const totalMealCals   = entries.reduce((s, e) => s + e.calories, 0);

            return (
              <TouchableOpacity
                key={meal.id}
                style={[styles.mealCard, { backgroundColor: colors.card }]}
                onPress={() => {
                  setSelectedMeal(meal);
                  setModalVisible(true);
                }}
              >
                <View style={styles.mealHeader}>
                  <View style={styles.mealLeft}>
                    <Text style={styles.mealIcon}>{meal.icon}</Text>
                    <View>
                      <Text style={[styles.mealTitle, { color: colors.text }]}>{meal.label}</Text>
                      {reminder?.enabled && (
                        <Text style={[styles.mealTime, { color: colors.accent }]}>⏰ {reminder.time}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.mealRight}>
                    <Text style={[styles.mealCalories, { color: colors.accent }]}>{totalMealCals} cal</Text>
                    {entries.length > 0 && (
                      <TouchableOpacity
                        onPress={() =>
                          Alert.alert("Remove Last Item", "Remove the last item from this meal?", [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Remove",
                              style: "destructive",
                              onPress: () => removeFoodEntry(entries[entries.length - 1].id),
                            },
                          ])
                        }
                      >
                        <Ionicons name="close-circle" size={20} color={colors.sub} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {entries.length > 0 && (
                  <View style={[styles.foodList, { borderTopColor: colors.border }]}>
                    {entries.map((entry) => (
                      <Text key={entry.id} style={[styles.foodItem, { color: colors.sub }]}>
                        • {entry.foodName} ({entry.calories} cal)
                      </Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>

      {/* ── Food Entry Modal ─────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <BlurView intensity={60} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedMeal?.label}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setShowFoodPicker(false); }}>
                <Ionicons name="close" size={24} color={colors.sub} />
              </TouchableOpacity>
            </View>

            {!showFoodPicker ? (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.accent }]}
                  onPress={() => setShowFoodPicker(true)}
                >
                  <Ionicons name="restaurant" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Choose from Database</Text>
                </TouchableOpacity>

                <View style={styles.orDivider}>
                  <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.orText, { color: colors.sub }]}>OR</Text>
                  <View style={[styles.orLine, { backgroundColor: colors.border }]} />
                </View>

                <TextInput
                  placeholder="Food name"
                  placeholderTextColor={colors.sub}
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text }]}
                  value={customFood}
                  onChangeText={setCustomFood}
                />
                <TextInput
                  placeholder="Calories"
                  placeholderTextColor={colors.sub}
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text }]}
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.success }]}
                  onPress={handleAddCustomFood}
                >
                  <Text style={styles.confirmBtnText}>Add Custom Food</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.modalSubtitle, { color: colors.text }]}>Select Food Item</Text>
                <ScrollView style={{ maxHeight: 380 }}>
                  {filteredFoods.map((food) => (
                    <TouchableOpacity
                      key={food.id}
                      style={[styles.foodOption, { borderBottomColor: colors.border }]}
                      onPress={() => handleAddFood(food)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.foodName, { color: colors.text }]}>{food.name}</Text>
                        <Text style={[styles.foodDetails, { color: colors.sub }]}>
                          {food.calories} cal | P:{food.protein}g | C:{food.carbs}g | F:{food.fat}g
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={colors.accent} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={() => setShowFoodPicker(false)}>
                  <Text style={[styles.backText, { color: colors.sub }]}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </BlurView>
      </Modal>

      {/* ── Reminder Modal ───────────────────────────────────────────────────── */}
      <Modal visible={showReminderModal} transparent animationType="slide">
        <BlurView intensity={60} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Meal Reminders</Text>
              <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                <Ionicons name="close" size={24} color={colors.sub} />
              </TouchableOpacity>
            </View>

            {mealReminders.map((reminder) => (
              <View key={reminder.id} style={[styles.reminderRow, { borderBottomColor: colors.border }]}>
                <View style={styles.reminderInfo}>
                  <Text style={[styles.reminderMeal, { color: colors.text }]}>{reminder.mealName}</Text>
                  <TouchableOpacity
                    onPress={() => { setEditingReminder(reminder); setShowTimePicker(true); }}
                  >
                    <Text style={[styles.reminderTime, { color: colors.accent }]}>{reminder.time}</Text>
                  </TouchableOpacity>
                </View>
                <Switch
                  value={reminder.enabled}
                  onValueChange={() => toggleReminder(reminder.id)}
                  trackColor={{ false: colors.border, true: colors.accent }}
                />
              </View>
            ))}

            <Text style={[styles.reminderNote, { color: colors.sub }]}>
              Set your preferred meal times. Reminders are saved locally.
            </Text>
          </View>
        </BlurView>
      </Modal>

      {/* ── Time Picker ───────────────────────────────────────────────────────── */}
      {showTimePicker && editingReminder && (
        <DateTimePicker
          value={(() => {
            const [h, m] = editingReminder.time.split(":").map(Number);
            const d = new Date();
            d.setHours(h, m, 0, 0);
            return d;
          })()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(_, date) => {
            if (date) {
              const t = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
              updateReminderTime(editingReminder.id, t);
            }
            setShowTimePicker(false);
            setEditingReminder(null);
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { paddingTop: 60, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  hud:         { alignItems: "center", marginVertical: 20, position: "relative" },
  ringText:    { position: "absolute", top: 42, alignItems: "center" },
  kcal:        { fontSize: 28, fontWeight: "bold" },
  kcalSub:     { fontSize: 11, marginTop: 2 },

  macrosGrid:  { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  macroCard:   { width: "47%", padding: 16, borderRadius: 20, marginBottom: 8 },
  macroValue:  { fontSize: 24, fontWeight: "700" },
  macroLabel:  { fontSize: 13, marginTop: 2 },
  macroBar:    { height: 4, borderRadius: 2, marginTop: 8 },
  macroFill:   { height: 4, borderRadius: 2 },
  macroTarget: { fontSize: 10, marginTop: 4 },

  profilesScroll: { paddingHorizontal: 16, marginBottom: 16 },
  profileChip:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, marginRight: 10, borderWidth: 1 },
  profileIcon:    { fontSize: 18, marginRight: 6 },
  profileLabel:   { fontSize: 14, fontWeight: "500" },

  aiCard:     { flexDirection: "row", alignItems: "center", padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 20, borderWidth: 1, gap: 12 },
  aiTipText:  { flex: 1, fontSize: 14, lineHeight: 20 },

  microsRow:  { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 20, flexWrap: "wrap" },
  microBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  microText:  { fontSize: 12, fontWeight: "500" },

  sectionTitle: { fontSize: 18, fontWeight: "700", paddingHorizontal: 16, marginBottom: 12 },

  mealCard:   { marginHorizontal: 16, marginBottom: 10, padding: 16, borderRadius: 20 },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mealLeft:   { flexDirection: "row", alignItems: "center", gap: 12 },
  mealIcon:   { fontSize: 30 },
  mealTitle:  { fontSize: 16, fontWeight: "600" },
  mealTime:   { fontSize: 11, marginTop: 2 },
  mealRight:  { flexDirection: "row", alignItems: "center", gap: 8 },
  mealCalories: { fontSize: 14, fontWeight: "600" },
  foodList:   { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  foodItem:   { fontSize: 13, marginBottom: 4 },

  modalOverlay:    { flex: 1, justifyContent: "center", padding: 20 },
  modalCard:       { borderRadius: 24, padding: 20, maxHeight: "85%" },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:      { fontSize: 22, fontWeight: "700" },
  modalSubtitle:   { fontSize: 16, fontWeight: "600", marginBottom: 16 },
  modalButton:     { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, gap: 8, marginBottom: 16 },
  modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  orDivider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  orLine:    { flex: 1, height: 1 },
  orText:    { marginHorizontal: 10, fontSize: 14 },

  input:      { padding: 16, borderRadius: 12, marginBottom: 12 },
  confirmBtn: { padding: 16, borderRadius: 16, marginTop: 8 },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" },

  foodOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  foodName:   { fontSize: 16, fontWeight: "500" },
  foodDetails:{ fontSize: 12, marginTop: 2 },
  backText:   { textAlign: "center", marginTop: 16, fontSize: 14 },

  reminderRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1 },
  reminderInfo: { flex: 1 },
  reminderMeal: { fontSize: 16, fontWeight: "500", marginBottom: 4 },
  reminderTime: { fontSize: 14 },
  reminderNote: { fontSize: 12, textAlign: "center", marginTop: 20, fontStyle: "italic" },
});