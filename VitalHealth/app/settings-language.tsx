import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import Header from "./components/Header";
import { useTheme } from "../context/ThemeContext";

const langs = [
  "English",
  "Telugu",
  "Hindi",
  "Kannada",
  "Tamil",
  "Malayalam",
];

export default function Language() {
  const { theme } = useTheme();

  const [selected, setSelected] =
    useState("English");

  const colors =
    theme === "light"
      ? {
          bg: "#f8fafc",
          card: "#ffffff",
          text: "#020617",
          border: "#e2e8f0",
          accent: "#38bdf8",
        }
      : {
          bg: "#020617",
          card: "#0f172a",
          text: "#e2e8f0",
          border: "#1e293b",
          accent: "#38bdf8",
        };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg },
      ]}
    >
      <Header />

      <View style={{ paddingTop: 110 }}>
        {langs.map(lang => {
          const active =
            selected === lang;

          return (
            <TouchableOpacity
              key={lang}
              style={[
                styles.item,
                {
                  backgroundColor:
                    active
                      ? colors.card
                      : "transparent",
                  borderColor: colors.border,
                },
              ]}
              onPress={() =>
                setSelected(lang)
              }
            >
              <Text
                style={[
                  styles.text,
                  {
                    color: active
                      ? colors.accent
                      : colors.text,
                  },
                ]}
              >
                {lang}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  item: {
    padding: 18,
    borderBottomWidth: 1,
  },

  text: {
    fontSize: 16,
    fontWeight: "500",
  },
});
