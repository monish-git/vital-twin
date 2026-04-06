import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

export const addMedicine = async (uid: string, medicine: any) => {
  const ref = collection(db, "users", uid, "medicines");

  await addDoc(ref, {
    ...medicine,
    createdAt: new Date(),
  });
};