// app/symptom-log.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const symptoms = [
  { label: "HEADACHE", icon: "🧠", type: "headache" },
  { label: "HEART/CHEST", icon: "❤️", type: "heart" },
  { label: "BREATHING", icon: "🫁", type: "breathing" },
  { label: "STOMACH", icon: "🍱", type: "stomach" },
  { label: "EAR/NOSE/THROAT", icon: "👂", type: "ent" },
  { label: "VISION/EYES", icon: "👁️", type: "vision" },
  { label: "OTHERS", icon: "➕", type: "other" },
  { label: "DENTAL/ORAL", icon: "🦷", type: "dental" },
  { label: "SLEEP/ENERGY", icon: "😴", type: "sleep" },
  { label: "URINARY", icon: "💧", type: "urinary" },
  { label: "MUSCLE/JOINT", icon: "🦴", type: "muscle" },
  { label: "SKIN/DERMA", icon: "🧴", type: "skin" },
];

export default function SymptomLogScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const colors =
    theme === "light"
      ? {
          bg: "#f8fafc",
          card: "#ffffff",
          text: "#020617",
          sub: "#64748b",
          border: "#e2e8f0",
          accent: "#38bdf8",
        }
      : {
          bg: "#020617",
          card: "#0b1220",
          text: "#e2e8f0",
          sub: "#64748b",
          border: "#1e293b",
          accent: "#38bdf8",
        };

  const openSymptom = (type: string) => {
    if (type === "other") {
      router.push("/symptom-chat");
      return;
    }

    router.push({
      pathname: "/symptom-flow",
      params: { type },
    });
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg },
      ]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
        >
          <Ionicons
            name="close"
            size={26}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: colors.text },
          ]}
        >
          Symptom Log
        </Text>

        <TouchableOpacity>
          <Ionicons
            name="time-outline"
            size={24}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
      >
        <Text
          style={[
            styles.subTitle,
            { color: colors.sub },
          ]}
        >
          SELECT PRIMARY NODE
        </Text>

        <View style={styles.grid}>
          {symptoms.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.card,
                {
                  backgroundColor:
                    colors.card,
                  borderColor:
                    colors.border,
                },
              ]}
              onPress={() =>
                openSymptom(item.type)
              }
              activeOpacity={0.85}
            >
              <Text style={styles.icon}>
                {item.icon}
              </Text>

              <Text
                style={[
                  styles.label,
                  { color: colors.text },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ===== styles =====

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },

  scroll: {
    padding: 16,
    paddingBottom: 60,
  },

  subTitle: {
    letterSpacing: 3,
    fontWeight: "600",
    marginBottom: 18,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    height: 120,
    width: CARD_WIDTH,
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    fontSize: 34,
    marginBottom: 6,
  },

  label: {
    fontWeight: "600",
    textAlign: "center",
    fontSize: 12,
  },
});
