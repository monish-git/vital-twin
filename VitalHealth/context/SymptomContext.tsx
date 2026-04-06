// context/SymptomContext.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  syncAddSymptom,
  syncAddSymptomHistory,
  syncDeleteSymptom,
  syncResolveSymptom,
  syncUpdateSymptom,
} from "../services/firebaseSync";

const ACTIVE_KEY  = "vitaltwin_active_symptoms";
const HISTORY_KEY = "vitaltwin_symptom_history";

export type Symptom = {
  id:               number;
  name:             string;
  severity:         "mild" | "moderate" | "severe" | "emergency" | string;
  startedAt:        number;
  resolvedAt?:      number;
  notes?:           string;
  followUpMinutes?: number;
  followUpAnswers?: string;
};

export type HistorySymptom = Symptom & {
  resolvedAt: number;
  duration:   number;
};

type SymptomContextType = {
  activeSymptoms:  Symptom[];
  historySymptoms: HistorySymptom[];
  refreshSymptoms: () => Promise<void>;
  logSymptom:      (name: string, severity: Symptom["severity"], followUpMinutes?: number, notes?: string, followUpAnswers?: string) => Promise<void>;
  resolveSymptom:  (id: number) => Promise<void>;
  removeSymptom:   (id: number) => Promise<void>;
  updateSymptom:   (id: number, updates: Partial<Symptom>) => Promise<void>;
  clearHistory:    () => Promise<void>;
};

const SymptomContext = createContext<SymptomContextType>({
  activeSymptoms:  [],
  historySymptoms: [],
  refreshSymptoms: async () => {},
  logSymptom:      async () => {},
  resolveSymptom:  async () => {},
  removeSymptom:   async () => {},
  updateSymptom:   async () => {},
  clearHistory:    async () => {},
});

export function useSymptoms() {
  return useContext(SymptomContext);
}

// ✅ Retry helper — tries Firebase sync up to 3 times with delay
const syncWithRetry = async (fn: () => Promise<void>, label: string) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await fn();
      console.log(`✅ ${label} synced to Firebase (attempt ${attempt})`);
      return;
    } catch (e) {
      console.log(`⚠️ ${label} sync attempt ${attempt} failed:`, e);
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
  console.log(`❌ ${label} sync failed after 3 attempts`);
};

export function SymptomsProvider({ children }: { children: React.ReactNode }) {
  const [activeSymptoms,  setActiveSymptoms]  = useState<Symptom[]>([]);
  const [historySymptoms, setHistorySymptoms] = useState<HistorySymptom[]>([]);

  // ── Load on mount + sync to Firebase ─────────────────────────
  useEffect(() => {
    (async () => {
      try {
        let activeRaw  = await AsyncStorage.getItem(ACTIVE_KEY);
        let historyRaw = await AsyncStorage.getItem(HISTORY_KEY);

        // ✅ Fall back to old keys
        if (!activeRaw)  activeRaw  = await AsyncStorage.getItem("vitalhealth_active_symptoms");
        if (!historyRaw) historyRaw = await AsyncStorage.getItem("vitalhealth_symptom_history");

        const activeList: Symptom[]        = activeRaw  ? JSON.parse(activeRaw)  : [];
        const historyList: HistorySymptom[] = historyRaw ? JSON.parse(historyRaw) : [];

        if (activeList.length)  setActiveSymptoms(activeList);
        if (historyList.length) setHistorySymptoms(historyList);

        console.log("✅ SymptomContext loaded:",
          activeList.length, "active,",
          historyList.length, "history"
        );

        // ✅ Sync ALL local symptoms to Firebase when auth is ready
        // This guarantees data appears in Firebase even if previous
        // sync attempts failed due to auth not being ready
        syncWithRetry(async () => {
          const { auth } = await import("../services/firebase");

          // Wait for auth
          await new Promise<void>((resolve) => {
            if (auth.currentUser) { resolve(); return; }
            const unsub = auth.onAuthStateChanged((u) => {
              unsub();
              resolve();
            });
            setTimeout(resolve, 8000);
          });

          if (!auth.currentUser) {
            console.log("⚠️ No auth user — skipping bulk symptom sync");
            return;
          }

          console.log("🔄 Bulk syncing", activeList.length, "symptoms to Firebase...");

          for (const symptom of activeList) {
            await syncAddSymptom({
              id:              symptom.id,
              name:            symptom.name,
              severity:        symptom.severity,
              startedAt:       symptom.startedAt,
              notes:           symptom.notes,
              followUpMinutes: symptom.followUpMinutes,
              followUpAnswers: symptom.followUpAnswers,
            });
          }

          for (const symptom of historyList) {
            await syncAddSymptomHistory({
              id:              symptom.id,
              name:            symptom.name,
              severity:        symptom.severity,
              startedAt:       symptom.startedAt,
              resolvedAt:      symptom.resolvedAt,
              duration:        symptom.duration,
              notes:           symptom.notes,
              followUpAnswers: symptom.followUpAnswers,
            });
          }

          console.log("✅ Bulk symptom sync complete");
        }, "BulkSymptomSync");

      } catch (e) {
        console.log("SymptomContext load error:", e);
      }
    })();
  }, []);

  const saveActive = async (list: Symptom[]) => {
    setActiveSymptoms(list);
    await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(list));
  };

  const saveHistory = async (list: HistorySymptom[]) => {
    setHistorySymptoms(list);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  };

  const refreshSymptoms = useCallback(async () => {
    try {
      const activeRaw  = await AsyncStorage.getItem(ACTIVE_KEY);
      const historyRaw = await AsyncStorage.getItem(HISTORY_KEY);
      if (activeRaw)  setActiveSymptoms(JSON.parse(activeRaw));
      if (historyRaw) setHistorySymptoms(JSON.parse(historyRaw));
    } catch (e) {
      console.log("refreshSymptoms error:", e);
    }
  }, []);

  // ── Log Symptom ───────────────────────────────────────────────
  const logSymptom = useCallback(async (
    name:             string,
    severity:         Symptom["severity"],
    followUpMinutes?: number,
    notes?:           string,
    followUpAnswers?: string
  ) => {
    const now = Date.now();
    const newSymptom: Symptom = {
      id:              now,
      name:            name.trim(),
      severity,
      startedAt:       now,
      notes,
      followUpMinutes,
      followUpAnswers,
    };

    // 1️⃣ Save locally first — always works
    await saveActive([...activeSymptoms, newSymptom]);
    console.log("🩺 Symptom saved locally:", name, "id:", now);

    // 2️⃣ Sync to Firebase with retry in background
    syncWithRetry(
      () => syncAddSymptom({
        id:              newSymptom.id,
        name:            newSymptom.name,
        severity:        newSymptom.severity,
        startedAt:       newSymptom.startedAt,
        notes:           newSymptom.notes,
        followUpMinutes: newSymptom.followUpMinutes,
        followUpAnswers: newSymptom.followUpAnswers,
      }),
      `Symptom(${name})`
    );
  }, [activeSymptoms]);

  // ── Resolve Symptom ───────────────────────────────────────────
  const resolveSymptom = useCallback(async (id: number) => {
    const symptom = activeSymptoms.find(s => s.id === id);
    if (!symptom) return;

    const resolvedAt = Date.now();
    const duration   = resolvedAt - symptom.startedAt;
    const resolved: HistorySymptom = { ...symptom, resolvedAt, duration };

    // 1️⃣ Save locally
    await saveActive(activeSymptoms.filter(s => s.id !== id));
    await saveHistory([resolved, ...historySymptoms]);

    // 2️⃣ Sync to Firebase with retry
    syncWithRetry(
      async () => {
        await syncResolveSymptom(id, resolvedAt, duration);
        await syncAddSymptomHistory({
          id:              symptom.id,
          name:            symptom.name,
          severity:        symptom.severity,
          startedAt:       symptom.startedAt,
          resolvedAt,
          duration,
          notes:           symptom.notes,
          followUpAnswers: symptom.followUpAnswers,
        });
      },
      `ResolveSymptom(${id})`
    );
  }, [activeSymptoms, historySymptoms]);

  // ── Remove Symptom ────────────────────────────────────────────
  const removeSymptom = useCallback(async (id: number) => {
    await saveActive(activeSymptoms.filter(s => s.id !== id));
    syncWithRetry(() => syncDeleteSymptom(id), `DeleteSymptom(${id})`);
  }, [activeSymptoms]);

  // ── Update Symptom ────────────────────────────────────────────
  const updateSymptom = useCallback(async (id: number, updates: Partial<Symptom>) => {
    await saveActive(activeSymptoms.map(s => s.id === id ? { ...s, ...updates } : s));
    syncWithRetry(() => syncUpdateSymptom(id, updates), `UpdateSymptom(${id})`);
  }, [activeSymptoms]);

  const clearHistory = useCallback(async () => {
    await saveHistory([]);
  }, []);

  return (
    <SymptomContext.Provider value={{
      activeSymptoms, historySymptoms,
      refreshSymptoms, logSymptom,
      resolveSymptom, removeSymptom,
      updateSymptom, clearHistory,
    }}>
      {children}
    </SymptomContext.Provider>
  );
}