// database/symptomDB.ts

import * as SQLite from "expo-sqlite";
import {
  startSymptomTracking,
  stopSymptomTracking,
} from "../services/reminderEngine";

export const db = SQLite.openDatabaseSync("app.db");

let isInitialized = false;

//////////////////////////////////////////////////////////

export type Symptom = {
  id: number;
  name: string;
  severity: string;
  startedAt: number;
  active: number;
  followupTime: number;
  resolvedAt?: number | null;
  notes?: string | null;
  followUpAnswers?: string | null;
};

//////////////////////////////////////////////////////////

export const initSymptomDB = async () => {
  try {
    if (isInitialized) return;

    db.execSync(`
      CREATE TABLE IF NOT EXISTS symptoms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        severity TEXT,
        startedAt INTEGER,
        active INTEGER,
        followupTime INTEGER,
        resolvedAt INTEGER,
        notes TEXT,
        followUpAnswers TEXT
      );
    `);

    isInitialized = true;

    console.log("✅ Symptom DB ready");
  } catch (err) {
    console.log("❌ Symptom DB init error:", err);
  }
};

//////////////////////////////////////////////////////////

export const addSymptom = async (
  name: string,
  severity: string,
  followupMinutes: number,
  notes?: string,
  followUpAnswers?: string
): Promise<void> => {
  try {
    await initSymptomDB();

    const now = Date.now();

    db.runSync(
      `INSERT INTO symptoms
      (name,severity,startedAt,active,followupTime,notes,followUpAnswers)
      VALUES (?,?,?,?,?,?,?)`,
      [
        name,
        severity,
        now,
        1,
        followupMinutes,
        notes ?? null,
        followUpAnswers ?? null,
      ]
    );

    const result = db.getFirstSync(
      "SELECT last_insert_rowid() as id"
    ) as { id: number };

    if (!result?.id) {
      throw new Error("Failed to retrieve inserted symptom ID");
    }

    console.log("🟢 Symptom inserted with ID:", result.id);

    await startSymptomTracking({
      id: result.id,
      name,
      followupTime: followupMinutes,
    });

  } catch (err) {
    console.log("❌ Add symptom error:", err);
    throw err;
  }
};

//////////////////////////////////////////////////////////

export const getActiveSymptoms = (): Symptom[] => {
  try {
    return (
      db.getAllSync(
        "SELECT * FROM symptoms WHERE active=1 ORDER BY startedAt DESC"
      ) as Symptom[]
    ) || [];
  } catch (err) {
    console.log("❌ Fetch active error:", err);
    return [];
  }
};

//////////////////////////////////////////////////////////

export const getAllSymptoms = (): Symptom[] => {
  try {
    return (
      db.getAllSync(
        "SELECT * FROM symptoms ORDER BY startedAt DESC"
      ) as Symptom[]
    ) || [];
  } catch (err) {
    console.log("❌ Fetch all error:", err);
    return [];
  }
};

//////////////////////////////////////////////////////////
// 🔥 NEW: RESOLVE BY NAME (FOR NOTIFICATION)
//////////////////////////////////////////////////////////

export const resolveSymptomByName = async (name: string) => {
  try {
    const symptom = db.getFirstSync(
      "SELECT id FROM symptoms WHERE name=? AND active=1",
      [name]
    ) as { id: number } | null;

    if (!symptom) return;

    await resolveSymptom(symptom.id);
  } catch (err) {
    console.log("❌ Resolve by name error:", err);
  }
};

//////////////////////////////////////////////////////////

export const resolveSymptom = async (id: number): Promise<void> => {
  try {
    db.runSync(
      `UPDATE symptoms
       SET active=0, resolvedAt=?
       WHERE id=?`,
      [Date.now(), id]
    );

    await stopSymptomTracking(id);

    console.log("✅ Symptom resolved:", id);
  } catch (err) {
    console.log("❌ Resolve symptom error:", err);
  }
};

//////////////////////////////////////////////////////////

export const deleteSymptom = async (id: number): Promise<void> => {
  try {
    db.runSync("DELETE FROM symptoms WHERE id=?", [id]);
    await stopSymptomTracking(id);
  } catch (err) {
    console.log("❌ Delete error:", err);
  }
};

//////////////////////////////////////////////////////////

export const saveFollowUpAnswers = (
  id: number,
  answers: string
): void => {
  try {
    db.runSync(
      `UPDATE symptoms SET followUpAnswers=? WHERE id=?`,
      [answers, id]
    );
  } catch (err) {
    console.log("❌ Save follow-up error:", err);
  }
};

//////////////////////////////////////////////////////////

export const clearSymptoms = (): void => {
  try {
    db.runSync("DELETE FROM symptoms");
  } catch (err) {
    console.log("❌ Clear error:", err);
  }
};

//////////////////////////////////////////////////////////

export const getSymptomById = (id: number): Symptom | null => {
  try {
    return db.getFirstSync(
      "SELECT * FROM symptoms WHERE id=?",
      [id]
    ) as Symptom | null;
  } catch (err) {
    console.log("❌ Get by ID error:", err);
    return null;
  }
};