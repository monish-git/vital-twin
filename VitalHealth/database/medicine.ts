import { db } from "./schema";

export type DBMedicine = {
  id: string;
  name: string;
  dose: string;
  time: string;
  taken: number;
  reminder: number;
};

export const insertMedicine = async (
  id: string,
  name: string,
  dose: string,
  time: string
) => {
  await db.runAsync(
    "INSERT INTO medicines VALUES (?, ?, ?, ?, 0, 1)",
    [id, name, dose, time]
  );
};

export const getMedicines = async (): Promise<DBMedicine[]> => {
  const result = await db.getAllAsync("SELECT * FROM medicines");
  return result as DBMedicine[];
};

export const deleteMedicineDB = async (id: string) => {
  await db.runAsync("DELETE FROM medicines WHERE id = ?", [id]);
};
