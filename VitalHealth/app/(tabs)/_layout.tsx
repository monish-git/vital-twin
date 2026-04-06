import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const isLight = theme === "light";

  const colors = isLight
    ? { bg: "#ffffff", active: "#2563eb", inactive: "#94a3b8", border: "#e5e7eb" }
    : { bg: "#0b1220", active: "#38bdf8", inactive: "#64748b", border: "#020617" };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bg,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          },
          tabBarActiveTintColor: colors.active,
          tabBarInactiveTintColor: colors.inactive,
          tabBarLabelStyle: { fontSize: 11, marginBottom: 4, fontWeight: "600" },
        }}
      >
        {/* HOME — external device telemetry */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          }}
        />

        {/* HISTORY */}
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
          }}
        />

        {/* DIGITAL TWIN — simulation + routine logging */}
        <Tabs.Screen
          name="twin"
          options={{
            title: "Twin",
            tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          }}
        />

        {/* INSIGHTS — analytics, trends, organ health */}
        <Tabs.Screen
          name="insights"
          options={{
            title: "Insights",
            tabBarIcon: ({ color }) => <Ionicons name="pulse" size={24} color={color} />,
          }}
        />

        {/* AI HEALTH */}
        <Tabs.Screen
          name="ai-health"
          options={{
            title: "AI Health",
            tabBarIcon: ({ color }) => <Ionicons name="chatbubble" size={24} color={color} />,
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
