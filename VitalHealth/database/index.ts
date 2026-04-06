import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("vital.db");

export const run = (sql: string, params: any[] = []) => {
  return db.runAsync(sql, params);
};

export const get = (sql: string, params: any[] = []) => {
  return db.getFirstAsync(sql, params);
};

export const all = (sql: string, params: any[] = []) => {
  return db.getAllAsync(sql, params);
};
