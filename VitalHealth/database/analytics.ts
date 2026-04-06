import { run, all } from "./index";

export const insertMetric = async (
  metric: string,
  value: number,
  date: string
) => {
  await run(
    "INSERT INTO analytics (metric,value,date) VALUES (?,?,?)",
    [metric, value, date]
  );
};

export const getMetric = async (metric: string) => {
  return await all(
    "SELECT * FROM analytics WHERE metric=? ORDER BY date DESC",
    [metric]
  );
};
