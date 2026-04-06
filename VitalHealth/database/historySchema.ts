import { db } from "./schema";

/**
 * Initializes History table
 * Modern Expo SQLite API compatible
 */
export const initHistoryTable = async (): Promise<void> => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT,
        description TEXT,
        date TEXT,
        time TEXT,
        year TEXT,
        type TEXT,
        value TEXT,
        unit TEXT,
        doctor TEXT,
        location TEXT,
        attachments TEXT
      );
    `);

    console.log("History table ready");
  } catch (error) {
    console.error("History table error:", error);
    throw error;
  }
};
