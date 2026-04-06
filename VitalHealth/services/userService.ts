import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

export const createUserProfile = async (uid: string, data: any) => {
  await setDoc(doc(db, "users", uid), {
    profile: data,
  });
};