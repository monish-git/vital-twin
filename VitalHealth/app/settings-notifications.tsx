import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
} from "react-native";

import Header from "./components/Header";
import { useTheme } from "../context/ThemeContext";

export default function Notifications() {
  const { theme } = useTheme();

  const colors =
    theme === "light"
      ? {
          bg: "#f8fafc",
          card: "#ffffff",
          text: "#020617",
          border: "#e2e8f0",
        }
      : {
          bg: "#020617",
          card: "#0f172a",
          text: "#e2e8f0",
          border: "#1e293b",
        };

  const [settings, setSettings] = useState({
    meds: true,
    alerts: true,
    steps: true,
    hydration: true,
    reports: true,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const Row = ({
    label,
    value,
    onToggle,
  }: any) => (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>

      <Switch value={value} onValueChange={onToggle} />
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg },
      ]}
    >
      <Header />

      <View style={styles.content}>
        <Row
          label="Medication Reminders"
          value={settings.meds}
          onToggle={() => toggle("meds")}
        />

        <Row
          label="Critical Alerts"
          value={settings.alerts}
          onToggle={() => toggle("alerts")}
        />

        <Row
          label="Step Goal"
          value={settings.steps}
          onToggle={() => toggle("steps")}
        />

        <Row
          label="Hydration"
          value={settings.hydration}
          onToggle={() => toggle("hydration")}
        />

        <Row
          label="Weekly Reports"
          value={settings.reports}
          onToggle={() => toggle("reports")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingTop: 110,
    padding: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },

  text: {
    fontSize: 15,
    fontWeight: "500",
  },
});
