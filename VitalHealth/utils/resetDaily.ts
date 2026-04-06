import { db } from "../database/medicineDB";
export const resetDaily = ()=>{
 db.runSync("UPDATE medicines SET takenToday=0");
};
  