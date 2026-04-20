// database/hydrationHistoryDB.ts
// Stores every water intake event with timestamp for history display

import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("hydration_history.db");

///////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////

export type HydrationEntry = {
  id: number;
  amount: number;       // ml added
  total: number;        // running total at time of entry
  timestamp: number;    // Unix ms
  source: "manual" | "notification"; // where the add came from
};

///////////////////////////////////////////////////////////
// INIT
///////////////////////////////////////////////////////////

export async function initHydrationHistoryDB() {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS hydration_history (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        amount    INTEGER NOT NULL,
        total     INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        source    TEXT DEFAULT 'manual'
      );
    `);
    console.log("💧 Hydration history DB initialized");
  } catch (err) {
    console.log("❌ Hydration history DB init error:", err);
  }
}

///////////////////////////////////////////////////////////
// INSERT ENTRY
///////////////////////////////////////////////////////////

export async function addHydrationEntry(
  amount: number,
  total: number,
  source: "manual" | "notification" = "manual"
) {
  try {
    await db.runAsync(
      `INSERT INTO hydration_history (amount, total, timestamp, source)
       VALUES (?, ?, ?, ?)`,
      [amount, total, Date.now(), source]
    );
    console.log(`💧 History entry saved: +${amount}ml (total: ${total}ml)`);
  } catch (err) {
    console.log("❌ Hydration history insert error:", err);
  }
}

///////////////////////////////////////////////////////////
// GET TODAY'S HISTORY
///////////////////////////////////////////////////////////

export function getTodayHydrationHistory(): HydrationEntry[] {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const rows = db.getAllSync(
      `SELECT * FROM hydration_history
       WHERE timestamp >= ?
       ORDER BY timestamp DESC`,
      [startOfDay.getTime()]
    );

    return rows as HydrationEntry[];
  } catch (err) {
    console.log("❌ Hydration history fetch error:", err);
    return [];
  }
}

///////////////////////////////////////////////////////////
// CLEAR TODAY'S HISTORY (used on reset)
///////////////////////////////////////////////////////////

export async function clearTodayHydrationHistory() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    await db.runAsync(
      `DELETE FROM hydration_history WHERE timestamp >= ?`,
      [startOfDay.getTime()]
    );
    console.log("💧 Today's hydration history cleared");
  } catch (err) {
    console.log("❌ Hydration history clear error:", err);
  }
}

export { db as hydrationHistoryDb };