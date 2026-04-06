import { run, all } from "./index";

export const addSymptom = async (
  type: string,
  severity: number,
  date: string
) => {
  await run(
    "INSERT INTO symptoms (type,severity,date) VALUES (?,?,?)",
    [type, severity, date]
  );
};

export const getSymptoms = async () => {
  return await all("SELECT * FROM symptoms ORDER BY date DESC");
};
