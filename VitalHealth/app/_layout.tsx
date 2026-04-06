///////////////////////////////////////////////////////////
// ⚠️ FIRST IMPORTS — KEEP THIS ORDER
///////////////////////////////////////////////////////////
import "../services/foregroundStepService";
import "../tasks/stepTrackingTask";

// ✅ MUST be before app mounts
import { registerNotifeeBackgroundHandler } from "../services/notifeeService";
registerNotifeeBackgroundHandler();

///////////////////////////////////////////////////////////

import { Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { BiogearsTwinProvider } from "../context/BiogearsTwinContext";
import { HydrationProvider } from "../context/HydrationContext";
import { MedicineProvider } from "../context/MedicineContext";
import { NutritionProvider } from "../context/NutritionContext";
import { ProfileProvider } from "../context/ProfileContext";
import { StepProvider } from "../context/StepContext";
import { SymptomsProvider } from "../context/SymptomContext";
import { ThemeProvider } from "../context/ThemeContext";

import * as SplashScreen from "expo-splash-screen";

import { initHistoryTable } from "../database/historySchema";
import { initHydrationDB } from "../database/hydrationDB";
import { initMedicineDB } from "../database/medicineDB";
import { initDB } from "../database/schema";
import { initSymptomDB } from "../database/symptomDB";

import { syncMedicinesFromFirebase } from "../services/medicineSync";

import {
  registerNotifeeForegroundHandler,
  setupNotifee,
} from "../services/notifeeService";

import { markMissedMedicines } from "../database/medicineDB";

///////////////////////////////////////////////////////////
SplashScreen.preventAutoHideAsync();
///////////////////////////////////////////////////////////

export default function RootLayout() {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);

  ///////////////////////////////////////////////////////////
  // APP INITIALIZATION
  ///////////////////////////////////////////////////////////
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const setupApp = async () => {
      try {
        console.log("🚀 Initializing App...");

        // ✅ NOTIFICATIONS
        await setupNotifee();

        // ✅ DATABASE
        await initDB();
        await initHistoryTable();
        await initMedicineDB();
        await initSymptomDB();
        await initHydrationDB();

        // ✅ 🔥 MARK MISSED MEDICINES (FIXED POSITION)
        await markMissedMedicines();

        // ✅ FIREBASE SYNC
        await syncMedicinesFromFirebase();

        console.log("🔥 App Fully Initialized");

      } catch (error) {
        console.log("❌ Startup error:", error);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    setupApp();
  }, []);

  ///////////////////////////////////////////////////////////
  // FOREGROUND NOTIFICATION HANDLER
  ///////////////////////////////////////////////////////////
  useEffect(() => {
    const unsubscribe = registerNotifeeForegroundHandler();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  ///////////////////////////////////////////////////////////
  // LOADING SCREEN
  ///////////////////////////////////////////////////////////
  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  ///////////////////////////////////////////////////////////
  // MAIN NAVIGATION
  ///////////////////////////////////////////////////////////
  return (
    <ThemeProvider defaultTheme="light">
      <ProfileProvider>
        <MedicineProvider>
          <BiogearsTwinProvider>
            <StepProvider>
              <HydrationProvider>
                <SymptomsProvider>
                  <NutritionProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="startup" />
                      <Stack.Screen name="welcome" />
                      <Stack.Screen name="signin" />
                      <Stack.Screen name="signup" />
                      <Stack.Screen name="onboarding/personal" />
                      <Stack.Screen name="onboarding/medical" />
                      <Stack.Screen name="onboarding/habits" />
                      <Stack.Screen name="onboarding/history" />
                      <Stack.Screen name="onboarding/review" />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="MedicationVault" />
                      <Stack.Screen name="member-health" />
                    </Stack>
                  </NutritionProvider>
                </SymptomsProvider>
              </HydrationProvider>
            </StepProvider>
          </BiogearsTwinProvider>
        </MedicineProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}