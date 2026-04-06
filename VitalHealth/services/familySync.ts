import { collection, deleteField, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { getUserId } from "./firebaseSync";
import { UserProfile } from "./profileService";

export type LinkedMember = {
  uid: string;
  firstName: string;
  lastName?: string;
  relation: string;
  profileImage?: string;
  inviteCode: string;
  status: "active" | "pending";
  bloodGroup?: string;
  gender?: string;
  age?: string;
};

const getMyUid = async () => {
  return await getUserId();
};

/**
 * Fetch all members who have linked me, and members I've linked.
 * Bidirectional query on profiles collection.
 */
export async function fetchLinkedMembers(): Promise<LinkedMember[]> {
  try {
    const myUid = await getMyUid();
    if (!myUid) return [];

    const myProfileSnap = await getDoc(doc(db, "profiles", myUid));
    if (!myProfileSnap.exists()) return [];

  const myProfile = myProfileSnap.data() as UserProfile & { linkedMembers?: Record<string, LinkedMember> };
    const myLinks: LinkedMember[] = Object.values(myProfile.linkedMembers || {});

    // Also query other profiles where I'm in their linkedMembers
    const incomingQuery = query(
      collection(db, "profiles"),
      where(`linkedMembers.uid`, "==", myUid)
    );
    const incomingSnap = await getDocs(incomingQuery);
    const incomingLinks: LinkedMember[] = [];
    incomingSnap.forEach((docSnap) => {
      const data = docSnap.data() as UserProfile & { linkedMembers?: Record<string, LinkedMember> };
      const link = Object.values(data.linkedMembers || {}).find((m: LinkedMember) => m.uid === myUid);
      if (link) {
        incomingLinks.push({
          ...link as LinkedMember,
        });
      }
    });

    // Merge and dedupe
    const allLinks = [...myLinks, ...incomingLinks];
    const unique = allLinks.filter((link, index, self) => 
      index === self.findIndex((l) => l.uid === link.uid)
    );

    console.log("✅ Fetched linked members:", unique.length);
    return unique;
  } catch (e) {
    console.log("❌ fetchLinkedMembers error:", e);
    return [];
  }
}

/**
 * Search profiles collection for matching healthId/inviteCode.
 */
export async function findUserByHealthId(healthId: string): Promise<(UserProfile & { uid: string }) | null> {
  try {
    const q = query(
      collection(db, "profiles"),
      where("inviteCode", "==", healthId.trim().toUpperCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log("❌ No user found for healthId:", healthId);
      return null;
    }

    const docSnap = snap.docs[0];
    const data = docSnap.data() as UserProfile;
    console.log("✅ Found user by healthId:", data.firstName, docSnap.id);
    return { ...data, uid: docSnap.id };
  } catch (e) {
    console.log("❌ findUserByHealthId error:", e);
    return null;
  }
}

/**
 * Create mutual family link between current user and target.
 */
export async function linkFamilyMember(
  targetUid: string,
  targetProfile: { firstName: string; lastName: string },
  targetHealthId: string,
  relation: string,
  myProfile: { firstName: string; lastName: string },
  myInviteCode: string,
  targetBloodGroup?: string,
  targetGender?: string
): Promise<boolean> {
  try {
    const myUid = await getMyUid();
    if (!myUid || myUid === targetUid) return false;

    // Link target to me
    const targetLink: LinkedMember = {
      uid: myUid,
      firstName: myProfile.firstName,
      lastName: myProfile.lastName,
      relation: relation === "Family" ? "Family" : relation,
      inviteCode: myInviteCode,
      status: "active",
    };

    await updateDoc(doc(db, "profiles", targetUid), {
      [`linkedMembers.${myUid}`]: targetLink, // For easy querying
      updatedAt: new Date().toISOString(),
    });

    // Link me to target
    const myLink: LinkedMember = {
      uid: targetUid,
      firstName: targetProfile.firstName,
      lastName: targetProfile.lastName,
      relation,
      profileImage: undefined, // Fetch separately if needed
      inviteCode: targetHealthId,
      status: "active",
      bloodGroup: targetBloodGroup,
      gender: targetGender,
    };

    await updateDoc(doc(db, "profiles", myUid), {
      [`linkedMembers.${targetUid}`]: myLink,
      updatedAt: new Date().toISOString(),
    });

    console.log("✅ Family link created:", myUid, "<->", targetUid);
    return true;
  } catch (e) {
    console.log("❌ linkFamilyMember error:", e);
    return false;
  }
}

/**
 * Remove mutual family link.
 */
export async function unlinkFamilyMember(targetUid: string): Promise<void> {
  try {
    const myUid = await getMyUid();
    if (!myUid) return;

    // Remove from both profiles (object field delete)
    await updateDoc(doc(db, "profiles", myUid), {
      [`linkedMembers.${targetUid}`]: deleteField(),
    }).catch(() => {}); // Ignore if not found

    await updateDoc(doc(db, "profiles", targetUid), {
      [`linkedMembers.${myUid}`]: deleteField(),
    }).catch(() => {}); // Ignore if not found

    console.log("✅ Family link removed:", myUid, "<->", targetUid);
  } catch (e) {
    console.log("❌ unlinkFamilyMember error:", e);
  }
}

