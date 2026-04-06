// database/hydrationDB.ts

import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("hydration.db");

// ======================================================
// INIT TABLE
// ======================================================
export async function initHydrationDB() {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS hydration (
        date TEXT PRIMARY KEY,
        amount INTEGER
      );
    `);

    console.log("✅ Hydration DB initialized");
  } catch (error) {
    console.log("❌ Hydration DB init error:", error);
  }
}

// ======================================================
// ADD WATER (NORMAL - APP OPEN)
// ======================================================
export async function addWater(amount: number) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const existing: any = await db.getFirstAsync(
      "SELECT amount FROM hydration WHERE date = ?",
      [today]
    );

    if (existing) {
      await db.runAsync(
        "UPDATE hydration SET amount = amount + ? WHERE date = ?",
        [amount, today]
      );
    } else {
      await db.runAsync(
        "INSERT INTO hydration (date, amount) VALUES (?, ?)",
        [today, amount]
      );
    }

    console.log("💧 Water added:", amount);
  } catch (error) {
    console.log("❌ Add water error:", error);
  }
}

// ======================================================
// 🔥 BACKGROUND SAFE FUNCTION (IMPORTANT)
// ======================================================
export async function addWaterFromNotification(amount: number) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const existing: any = await db.getFirstAsync(
      "SELECT amount FROM hydration WHERE date = ?",
      [today]
    );

    if (existing) {
      await db.runAsync(
        "UPDATE hydration SET amount = amount + ? WHERE date = ?",
        [amount, today]
      );
    } else {
      await db.runAsync(
        "INSERT INTO hydration (date, amount) VALUES (?, ?)",
        [today, amount]
      );
    }

    console.log("✅ Water added from notification:", amount);
  } catch (error) {
    console.log("❌ Background hydration error:", error);
  }
}

// ======================================================
// GET TODAY WATER
// ======================================================
export async function getTodayWater() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const result: any = await db.getFirstAsync(
      "SELECT amount FROM hydration WHERE date = ?",
      [today]
    );

    return result?.amount || 0;
  } catch (error) {
    console.log("❌ Get hydration error:", error);
    return 0;
  }
}