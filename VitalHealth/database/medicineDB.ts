// database/medicineDB.ts

import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("medicine.db");

///////////////////////////////////////////////////////////
// INIT TABLE
///////////////////////////////////////////////////////////
export async function initMedicineDB() {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        dose TEXT,
        type TEXT,
        time TEXT,
        timestamp INTEGER,
        meal TEXT,
        frequency TEXT,
        startDate TEXT,
        endDate TEXT,
        reminder INTEGER,
        notificationId TEXT,
        taken INTEGER DEFAULT 0
      );
    `);

    console.log("💊 Medicine DB initialized");
  } catch (error) {
    console.log("❌ DB init error:", error);
  }
}

///////////////////////////////////////////////////////////
// ADD MEDICINE
///////////////////////////////////////////////////////////
export function addMedicine(
  name: string,
  dose: string,
  type: string,
  time: string,
  timestamp: number,
  meal: string,
  frequency: string,
  startDate: string,
  endDate: string,
  reminder: number,
  notificationId: string | null
) {
  db.runSync(
    `INSERT INTO medicines
    (name, dose, type, time, timestamp, meal, frequency, startDate, endDate, reminder, notificationId, taken)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      name,
      dose,
      type,
      time,
      timestamp,
      meal,
      frequency,
      startDate,
      endDate,
      reminder,
      notificationId,
    ]
  );
}

///////////////////////////////////////////////////////////
// GET MEDICINES
///////////////////////////////////////////////////////////
export function getMedicines() {
  return db.getAllSync("SELECT * FROM medicines ORDER BY timestamp ASC");
}

///////////////////////////////////////////////////////////
// DELETE MEDICINE
///////////////////////////////////////////////////////////
export function deleteMedicine(id: number) {
  db.runSync("DELETE FROM medicines WHERE id = ?", [id]);
}

///////////////////////////////////////////////////////////
// UPDATE NOTIFICATION ID
///////////////////////////////////////////////////////////
export function updateMedicineNotificationId(
  id: number,
  notificationId: string
) {
  db.runSync(
    "UPDATE medicines SET notificationId = ? WHERE id = ?",
    [notificationId, id]
  );
}

///////////////////////////////////////////////////////////
// MARK TAKEN (BY ID)
///////////////////////////////////////////////////////////
export async function markMedicineTaken(medicineId: string) {
  try {
    await db.runAsync(
      "UPDATE medicines SET taken = 1 WHERE id = ?",
      [medicineId]
    );

    console.log("✅ Medicine marked as taken:", medicineId);
  } catch (error) {
    console.log("❌ Error marking medicine:", error);
  }
}

///////////////////////////////////////////////////////////
// MARK TAKEN (BY NOTIFICATION ID) 🔥 USED IN CONTEXT
///////////////////////////////////////////////////////////
export function markMedicineTakenByNotificationId(
  notificationId: string
) {
  db.runSync(
    "UPDATE medicines SET taken = 1 WHERE notificationId = ?",
    [notificationId]
  );
}

///////////////////////////////////////////////////////////
// SAVE HISTORY
///////////////////////////////////////////////////////////
export async function saveMedicineHistory(medicineId: string) {
  try {
    const date = new Date().toISOString();

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicineId TEXT,
        takenAt TEXT
      );
    `);

    await db.runAsync(
      "INSERT INTO history (medicineId, takenAt) VALUES (?, ?)",
      [medicineId, date]
    );

    console.log("📊 Medicine history saved");
  } catch (error) {
    console.log("❌ History error:", error);
  }
}

///////////////////////////////////////////////////////////
// MARK MISSED MEDICINES
///////////////////////////////////////////////////////////
export async function markMissedMedicines() {
  try {
    const now = Date.now();

    await db.runAsync(
      "UPDATE medicines SET taken = -1 WHERE timestamp < ? AND taken = 0",
      [now]
    );

    console.log("⚠️ Missed medicines updated");
  } catch (error) {
    console.log("❌ Missed update error:", error);
  }
}

///////////////////////////////////////////////////////////
// GET TODAY STATS
///////////////////////////////////////////////////////////
export async function getTodayMedicineStats() {
  try {
    const taken: any = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM medicines WHERE taken = 1"
    );

    const missed: any = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM medicines WHERE taken = -1"
    );

    return {
      taken: taken?.count || 0,
      missed: missed?.count || 0,
    };
  } catch (error) {
    console.log("❌ Stats error:", error);
    return { taken: 0, missed: 0 };
  }
}

///////////////////////////////////////////////////////////
// 🔧 FIX FOR BACKGROUND TASK
///////////////////////////////////////////////////////////

export function getMedicineByNotificationId(notificationId: string) {
  try {
    const result = db.getAllSync(
      "SELECT * FROM medicines WHERE notificationId = ?",
      [notificationId]
    );

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.log("❌ getMedicineByNotificationId error:", error);
    return null;
  }
}

export function deleteMedicineByNotificationId(notificationId: string) {
  try {
    db.runSync(
      "DELETE FROM medicines WHERE notificationId = ?",
      [notificationId]
    );

    console.log("🗑 Deleted medicine by notificationId");
  } catch (error) {
    console.log("❌ deleteMedicineByNotificationId error:", error);
  }
}

export { db };
