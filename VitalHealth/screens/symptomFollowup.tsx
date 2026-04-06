import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { resolveSymptom } from "../database/symptomDB";
import { useTheme } from "../context/ThemeContext";

///////////////////////////////////////////////////////////

export default function Followup() {
  const router = useRouter();
  const { theme } = useTheme();

  const { id, name } = useLocalSearchParams<{
    id: string;
    name?: string;
  }>();

  /////////////////////////////////////////////////////////
  // SAFE ID PARSE
  /////////////////////////////////////////////////////////

  const symptomId = Number(id);

  if (!symptomId) {
    return (
      <View style={styles.center}>
        <Text>Invalid symptom</Text>
      </View>
    );
  }

  /////////////////////////////////////////////////////////
  // THEME COLORS
  /////////////////////////////////////////////////////////

  const colors =
    theme === "light"
      ? {
          bg: "#f8fafc",
          card: "#ffffff",
          text: "#020617",
          sub: "#64748b",
          yes: "#ef4444",
          no: "#10b981"
        }
      : {
          bg: "#020617",
          card: "#0f172a",
          text: "#f1f5f9",
          sub: "#94a3b8",
          yes: "#ef4444",
          no: "#10b981"
        };

  /////////////////////////////////////////////////////////
  // ACTION HANDLER
  /////////////////////////////////////////////////////////

  const finish = (danger: boolean) => {
    if (!danger) {
      resolveSymptom(symptomId);

      Alert.alert(
        "Recovered ✅",
        "Great! Symptom removed.",
        [{ text: "OK", onPress: () => router.replace("/") }]
      );
      return;
    }

    Alert.alert(
      "Medical Alert ⚠️",
      "You should consult a doctor immediately.",
      [{ text: "Understood", onPress: () => router.replace("/") }]
    );
  };

  /////////////////////////////////////////////////////////
  // UI
  /////////////////////////////////////////////////////////

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      
      <Text style={[styles.title, { color: colors.text }]}>
        Symptom Follow-up
      </Text>

      {name && (
        <Text style={[styles.symptom, { color: colors.sub }]}>
          Checking: {name}
        </Text>
      )}

      <View style={[styles.card, { backgroundColor: colors.card }]}>

        <Text style={[styles.question, { color: colors.text }]}>
          Is your symptom severe right now?
        </Text>

        {/* YES */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.yes }]}
          onPress={() => finish(true)}
        >
          <Text style={styles.btnText}>YES — Severe</Text>
        </TouchableOpacity>

        {/* NO */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.no }]}
          onPress={() => finish(false)}
        >
          <Text style={styles.btnText}>NO — I’m fine</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

///////////////////////////////////////////////////////////

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10
  },

  symptom: {
    textAlign: "center",
    marginBottom: 30,
    fontSize: 16
  },

  card: {
    borderRadius: 24,
    padding: 24,
    gap: 16
  },

  question: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10
  },

  button: {
    padding: 18,
    borderRadius: 18,
    alignItems: "center"
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  }
});
