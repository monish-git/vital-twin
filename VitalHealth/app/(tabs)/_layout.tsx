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
          tabBarLabelStyle: { fontSize: 10, marginBottom: 4, fontWeight: "600" },
        }}
      >
        {/* HOME */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          }}
        />

        {/* HISTORY — combined app + BioGears timeline */}
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
          }}
        />

        {/* DIGITAL TWIN — simulation command center */}
        <Tabs.Screen
          name="twin"
          options={{
            title: "Twin",
            tabBarIcon: ({ color }) => <Ionicons name="pulse" size={26} color={color} />,
          }}
        />

        {/* INSIGHTS — analytics, trends, organ health */}
        <Tabs.Screen
          name="insights"
          options={{
            title: "Insights",
            tabBarIcon: ({ color }) => <Ionicons name="analytics" size={24} color={color} />,
          }}
        />

        {/* PROFILE */}
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} />,
          }}
        />

        {/* AI HEALTH — hidden from tab bar, navigated to from home */}
        <Tabs.Screen
          name="ai-health"
          options={{
            href: null, // hides from tab bar
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
