import { run, all } from "./index";

export const addWater = async (
  amount: number,
  date: string
) => {
  await run(
    "INSERT INTO hydration (amount,date) VALUES (?,?)",
    [amount, date]
  );
};

export const getWater = async () => {
  return await all("SELECT * FROM hydration ORDER BY date DESC");
};
