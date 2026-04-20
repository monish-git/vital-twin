// utils/hydrationStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addHydrationEntry, initHydrationHistoryDB } from "../database/hydrationHistoryDB";

const getTodayKey = () => `hydration-${new Date().toISOString().split("T")[0]}`;

export const saveWaterToStorage = async (ml: number) => {
  const key = getTodayKey();
  const saved = await AsyncStorage.getItem(key);
  const current = saved ? Number(saved) : 0;
  const newValue = current + ml;
  await AsyncStorage.setItem(key, String(newValue));
  await initHydrationHistoryDB();
  await addHydrationEntry(ml, newValue, "notification");
  console.log(`💧 [background] +${ml}ml saved (total: ${newValue}ml)`);
};