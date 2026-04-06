import { db } from "../database/schema";

/**
 * History Record Type
 * Strong typing instead of "any"
 */
export type HistoryRecord = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  year: string;
  type: string;
  value: string;
  unit: string;
  doctor: string;
  location: string;
  attachments: string[];
};

export const HistoryService = {
  /**
   * Get all history records
   */
  getAll: async (): Promise<HistoryRecord[]> => {
    try {
      const rows = await db.getAllAsync<any>(
        "SELECT * FROM history ORDER BY date DESC"
      );

      return rows.map(r => ({
        ...r,
        attachments: r.attachments ? JSON.parse(r.attachments) : [],
      }));
    } catch (error) {
      console.error("History fetch error:", error);
      return [];
    }
  },

  /**
   * Insert record
   */
  insert: async (record: HistoryRecord): Promise<void> => {
    try {
      await db.runAsync(
        `INSERT INTO history 
        (id,title,description,date,time,year,type,value,unit,doctor,location,attachments)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          record.id,
          record.title,
          record.description,
          record.date,
          record.time,
          record.year,
          record.type,
          record.value,
          record.unit,
          record.doctor,
          record.location,
          JSON.stringify(record.attachments || []),
        ]
      );
    } catch (error) {
      console.error("History insert error:", error);
      throw error;
    }
  },

  /**
   * Delete record
   */
  delete: async (id: string): Promise<void> => {
    try {
      await db.runAsync(
        "DELETE FROM history WHERE id = ?",
        [id]
      );
    } catch (error) {
      console.error("History delete error:", error);
      throw error;
    }
  },
};
