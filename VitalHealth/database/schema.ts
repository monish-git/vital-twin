import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("vital.db");

export const initDB = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      dose TEXT,
      time TEXT,
      taken INTEGER,
      reminder INTEGER
    );
  `);
};
