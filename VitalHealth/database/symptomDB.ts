// database/symptomDB.ts

import * as SQLite from "expo-sqlite";

// ✅ FIX 5: Removed reminderEngine imports entirely.
//    symptomDB is a pure data layer — it should not schedule notifications.
//    reminderEngine was calling its own scheduling logic which conflicted
//    with notifee triggers set by SymptomContext, causing duplicate
//    notifications or silent cancellations when one system cancelled
//    what the other had scheduled.
//
//    Notification scheduling now lives exclusively in:
//      - SymptomContext.tsx → scheduleSymptomHourly()
//      - notifeeService.ts → all scheduling functions
//
//    If you need reminderEngine for something else (e.g. background tasks
//    unrelated to notifee), keep it out of the DB layer and call it
//    directly from the context or a service file instead.

export const db = SQLite.openDatabaseSync("app.db");

let isInitialized = false;

//////////////////////////////////////////////////////////
// TYPE DEFINITIONS
//////////////////////////////////////////////////////////

export type Symptom = {
  id: number;
  categoryId: string;
  optionId: string;
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
// INITIALIZE DATABASE
//////////////////////////////////////////////////////////

export const initSymptomDB = async () => {
  try {
    if (isInitialized) return;

    db.execSync(`
      CREATE TABLE IF NOT EXISTS symptoms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId TEXT NOT NULL,
        optionId TEXT NOT NULL,
        name TEXT NOT NULL,
        severity TEXT NOT NULL,
        startedAt INTEGER NOT NULL,
        active INTEGER DEFAULT 1,
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
// ADD SYMPTOM
//////////////////////////////////////////////////////////

export const addSymptom = async (
  categoryId: string,
  optionId: string,
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
      (categoryId, optionId, name, severity, startedAt, active, followupTime, resolvedAt, notes, followUpAnswers)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        categoryId,
        optionId,
        name,
        severity,
        now,
        1,
        followupMinutes,
        null,
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

    // ✅ FIX 5: Removed startSymptomTracking(reminderEngine) call.
    //    Notification is now scheduled by SymptomContext after calling
    //    this function, using scheduleSymptomHourly from notifeeService.

  } catch (err) {
    console.log("❌ Add symptom error:", err);
    throw err;
  }
};

//////////////////////////////////////////////////////////
// GET ACTIVE SYMPTOMS
//////////////////////////////////////////////////////////

export const getActiveSymptoms = async (): Promise<Symptom[]> => {
  try {
    await initSymptomDB();

    return (
      db.getAllSync(
        `SELECT * FROM symptoms
         WHERE active = 1
         ORDER BY startedAt DESC`
      ) as Symptom[]
    ) || [];
  } catch (err) {
    console.log("❌ Error fetching active symptoms:", err);
    return [];
  }
};

//////////////////////////////////////////////////////////
// GET HISTORY (RESOLVED SYMPTOMS)
//////////////////////////////////////////////////////////

export const getResolvedSymptoms = async (): Promise<Symptom[]> => {
  try {
    await initSymptomDB();

    return (
      db.getAllSync(
        `SELECT * FROM symptoms
         WHERE active = 0
         ORDER BY resolvedAt DESC`
      ) as Symptom[]
    ) || [];
  } catch (err) {
    console.log("❌ Fetch history error:", err);
    return [];
  }
};

//////////////////////////////////////////////////////////
// GET ALL SYMPTOMS
//////////////////////////////////////////////////////////

export const getAllSymptoms = async (): Promise<Symptom[]> => {
  try {
    await initSymptomDB();

    return (
      db.getAllSync(
        `SELECT * FROM symptoms
         ORDER BY startedAt DESC`
      ) as Symptom[]
    ) || [];
  } catch (err) {
    console.log("❌ Fetch all error:", err);
    return [];
  }
};

//////////////////////////////////////////////////////////
// RESOLVE SYMPTOM BY CATEGORY + OPTION
//////////////////////////////////////////////////////////

export const resolveSymptomByIds = async (
  categoryId: string,
  optionId: string
) => {
  try {
    await initSymptomDB();

    const symptom = db.getFirstSync(
      `SELECT id FROM symptoms
       WHERE categoryId=? AND optionId=? AND active=1`,
      [categoryId, optionId]
    ) as { id: number } | null;

    if (!symptom) return;

    await resolveSymptom(symptom.id);
  } catch (err) {
    console.log("❌ Resolve by IDs error:", err);
  }
};

//////////////////////////////////////////////////////////
// RESOLVE SYMPTOM
//////////////////////////////////////////////////////////

export const resolveSymptom = async (id: number): Promise<void> => {
  try {
    await initSymptomDB();

    const symptom = db.getFirstSync(
      "SELECT * FROM symptoms WHERE id=?",
      [id]
    ) as Symptom | null;

    if (!symptom) return;

    if (symptom.active === 0) {
      console.log("⚠️ Already resolved:", id);
      return;
    }

    db.runSync(
      `UPDATE symptoms
       SET active=0, resolvedAt=?
       WHERE id=?`,
      [Date.now(), id]
    );

    // ✅ FIX 5: Removed stopSymptomTracking(reminderEngine) call.
    //    Notification cancellation is handled by SymptomContext via
    //    cancelSymptomNotification() from notifeeService.
    console.log("✅ Symptom resolved & stored in history:", id);
  } catch (err) {
    console.log("❌ Resolve symptom error:", err);
  }
};

//////////////////////////////////////////////////////////
// DELETE SYMPTOM
//////////////////////////////////////////////////////////

export const deleteSymptom = async (id: number): Promise<void> => {
  try {
    await initSymptomDB();

    db.runSync("DELETE FROM symptoms WHERE id=?", [id]);

    // ✅ FIX 5: Removed stopSymptomTracking(reminderEngine) call.
    console.log("🗑 Symptom deleted permanently:", id);
  } catch (err) {
    console.log("❌ Delete error:", err);
  }
};

//////////////////////////////////////////////////////////
// SAVE FOLLOW-UP ANSWERS
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
// CLEAR ALL SYMPTOMS
//////////////////////////////////////////////////////////

export const clearSymptoms = (): void => {
  try {
    db.runSync("DELETE FROM symptoms");
  } catch (err) {
    console.log("❌ Clear error:", err);
  }
};

//////////////////////////////////////////////////////////
// GET SYMPTOM BY ID
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