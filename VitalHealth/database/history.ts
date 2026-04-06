import { run, all } from "./index";

export const addHistory = async (
  title: string,
  desc: string,
  date: string
) => {
  await run(
    "INSERT INTO history (id,title,desc,date) VALUES (?,?,?,?)",
    [Date.now().toString(), title, desc, date]
  );
};

export const getHistory = async () => {
  return await all("SELECT * FROM history ORDER BY date DESC");
};
