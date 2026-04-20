import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { getUserId } from "../services/firebaseSync";
import { FamilyMember } from "../types/FamilyMember";

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
type FamilyContextType = {
  members: FamilyMember[];
  isLoaded: boolean;
  addMember: (member: FamilyMember) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  getMemberById: (id: string) => FamilyMember | undefined;
  refreshMembers: () => Promise<void>;
};

const FamilyContext = createContext<FamilyContextType | null>(null);
const STORAGE_KEY = "vitalhealth_family_members";

/* ──────────────────────────────────────────────────────────────
   Utility: Normalize ID
   ────────────────────────────────────────────────────────────── */
const normalizeId = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return String(value);
};

/* ──────────────────────────────────────────────────────────────
   Family Provider
   ────────────────────────────────────────────────────────────── */
export const FamilyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  /* 🔹 Load members from Firebase and cache locally */
  const loadMembers = async () => {
    try {
      setIsLoaded(false);
      const uid = await getUserId();

      if (uid) {
        const userRef = doc(db, "users", uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const firebaseMembers =
            snapshot.data()?.familyMembers || [];

          if (Array.isArray(firebaseMembers)) {
            setMembers(firebaseMembers);
            await AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(firebaseMembers)
            );
            return;
          }
        }
      }

      // Fallback to AsyncStorage
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMembers(parsed);
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setMembers([]);
        }
      }
    } catch (error) {
      console.error("❌ Error loading family members:", error);
      setMembers([]);
    } finally {
      setIsLoaded(true);
    }
  };

  /* 🔹 Save members to Firebase and AsyncStorage */
  const saveMembers = async (data: FamilyMember[]) => {
    try {
      setMembers(data);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      const uid = await getUserId();
      if (uid) {
        await setDoc(
          doc(db, "users", uid),
          { familyMembers: data },
          { merge: true }
        );
      }
    } catch (error) {
      console.error("❌ Error saving family members:", error);
    }
  };

  /* 🔹 Add a new family member */
  const addMember = async (member: FamilyMember) => {
    try {
      const normalizedId =
        normalizeId(member.id) ||
        normalizeId(member.uid) ||
        normalizeId(member.userId) ||
        Date.now().toString();

      const newMember: FamilyMember = {
        ...member,
        id: normalizedId,
        uid: normalizeId(member.uid) || normalizedId,
        userId: normalizeId(member.userId) || normalizedId,
        relation: member.relation || member.relationship || "Family",
      };

      const exists = members.some(
        (m) =>
          normalizeId(m.id) === normalizedId ||
          normalizeId(m.uid) === normalizedId ||
          normalizeId(m.userId) === normalizedId
      );

      if (exists) {
        console.log("⚠️ Member already exists:", normalizedId);
        return;
      }

      const updated = [...members, newMember];
      await saveMembers(updated);

      console.log("✅ Member added successfully:", newMember);
    } catch (error) {
      console.error("❌ Error adding family member:", error);
    }
  };

  /* 🔹 Remove a family member */
  const removeMember = async (id: string) => {
    try {
      const normalizedId = normalizeId(id);

      const updated = members.filter(
        (m) =>
          normalizeId(m.id) !== normalizedId &&
          normalizeId(m.uid) !== normalizedId &&
          normalizeId(m.userId) !== normalizedId
      );

      await saveMembers(updated);
    } catch (error) {
      console.error("❌ Error removing family member:", error);
    }
  };

  /* 🔹 Get member by ID */
  const getMemberById = (
    id: string
  ): FamilyMember | undefined => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return undefined;

    return members.find(
      (m) =>
        normalizeId(m.id) === normalizedId ||
        normalizeId(m.uid) === normalizedId ||
        normalizeId(m.userId) === normalizedId
    );
  };

  /* 🔹 Refresh members manually */
  const refreshMembers = async () => {
    await loadMembers();
  };

  return (
    <FamilyContext.Provider
      value={{
        members,
        isLoaded,
        addMember,
        removeMember,
        getMemberById,
        refreshMembers,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

/* ──────────────────────────────────────────────────────────────
   Custom Hook
   ────────────────────────────────────────────────────────────── */
export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return context;
};