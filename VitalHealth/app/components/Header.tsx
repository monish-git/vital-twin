// components/Header.tsx

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";

export interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export default function Header({ title = "VitalTwin", showBack = true }: HeaderProps) {
  const router = useRouter();
  const { theme } = useTheme();

  const colors =
    theme === "light"
      ? {
          bg: "rgba(255, 255, 255, 0.8)",
          border: "#e2e8f0",
          text: "#020617",
          accent: "#0ea5e9",
        }
      : {
          bg: "rgba(2, 6, 23, 0.8)",
          border: "#1e293b",
          text: "#e2e8f0",
          accent: "#38bdf8",
        };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.left}>
          {showBack ? (
             <TouchableOpacity
               onPress={() => router.back()}
               activeOpacity={0.7}
             >
               <Ionicons
                 name="chevron-back"
                 size={28}
                 color={colors.accent}
               />
             </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-circle-outline"
                size={34}
                color={colors.accent}
              />
            </TouchableOpacity>
          )}
        </View>

        <Text
          style={[
            styles.title,
            { color: colors.text },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={styles.right}>
          <TouchableOpacity
            style={styles.sosButton}
            activeOpacity={0.85}
            onPress={() => router.push("/sos")}
          >
            <Text style={styles.sosText}>
              SOS
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    borderBottomWidth: 1,
    zIndex: 999,
  },

  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 40,
  },

  left: {
    width: 44,
    alignItems: "flex-start",
  },

  right: {
    width: 44,
    alignItems: "flex-end",
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  sosButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 22,
    shadowColor: "#ef4444",
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },

  sosText: {
    color: "white",
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
