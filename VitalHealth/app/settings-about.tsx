import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Header from "./components/Header";

import { useTheme } from "../context/ThemeContext";

export default function About() {
  const { theme } = useTheme();

  const colors =
    theme === "light"
      ? {
          bg: "#f8fafc",
          text: "#020617",
        }
      : {
          bg: "#020617",
          text: "#e2e8f0",
        };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg },
      ]}
    >
      <Header />

      <View style={styles.content}>
        <Text
          style={[
            styles.text,
            { color: colors.text },
          ]}
        >
          VitalTwin — AI powered digital health companion.
          {"\n\n"}
          Our mission is proactive health monitoring,
          emergency intelligence, and human digital twins.
        </Text>
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

  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});
