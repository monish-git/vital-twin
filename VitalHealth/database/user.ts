import { run, get } from "./index";

export const saveUser = async (
  name: string,
  age: number,
  weight: number,
  height: number
) => {
  await run("DELETE FROM user");
  await run(
    "INSERT INTO user (name,age,weight,height) VALUES (?,?,?,?)",
    [name, age, weight, height]
  );
};

export const getUser = async () => {
  return await get("SELECT * FROM user LIMIT 1");
};
