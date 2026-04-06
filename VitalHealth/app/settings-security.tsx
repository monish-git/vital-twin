import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import Header from "./components/Header";
import { useTheme } from "../context/ThemeContext";

export default function Security() {
  const { theme } = useTheme();

  const colors =
    theme === "light"
      ? {
          bg: "#f8fafc",
          card: "#ffffff",
          text: "#020617",
          border: "#e2e8f0",
          accent: "#64748b",
        }
      : {
          bg: "#020617",
          card: "#0f172a",
          text: "#e2e8f0",
          border: "#1e293b",
          accent: "#64748b",
        };

  const Item = ({ label }: { label: string }) => (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>

      <Text
        style={{ color: colors.accent }}
      >
        ›
      </Text>
    </TouchableOpacity>
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
        <Item label="Change Password" />
        <Item label="Forgot Password" />
        <Item label="Active Devices — Android / Web" />
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
  },

  item: {
    padding: 18,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  text: {
    fontSize: 16,
    fontWeight: "500",
  },
});
