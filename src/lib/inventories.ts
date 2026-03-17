import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  setDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { InventoryBook, InventoryMember, MemberRole } from "./types";

const INVENTORIES = "inventories";
const INVITE_CODES = "invite_codes";

// ── Deserialize ────────────────────────────────────────────────────────────

function memberFromRaw(m: Record<string, unknown>): InventoryMember {
  return {
    userId: m.userId as string,
    email: m.email as string,
    displayName: (m.displayName as string) ?? undefined,
    role: m.role as MemberRole,
    joinedAt: m.joinedAt instanceof Timestamp ? m.joinedAt.toDate() : new Date(),
  };
}

export function inventoryFromFirestore(id: string, data: Record<string, unknown>): InventoryBook {
  const rawMembers = (data.members ?? {}) as Record<string, Record<string, unknown>>;
  const members: Record<string, InventoryMember> = {};
  for (const [uid, m] of Object.entries(rawMembers)) {
    members[uid] = memberFromRaw(m);
  }
  return {
    id,
    name: data.name as string,
    createdBy: data.createdBy as string,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    memberIds: (data.memberIds as string[]) ?? [],
    members,
    settings: (data.settings as InventoryBook["settings"]) ?? {},
  };
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function createInventory(
  name: string,
  userId: string,
  email: string
): Promise<InventoryBook> {
  const firstMember = {
    userId,
    email,
    role: "admin" as MemberRole,
    joinedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, INVENTORIES), {
    name: name.trim(),
    createdBy: userId,
    createdAt: serverTimestamp(),
    memberIds: [userId],
    members: { [userId]: firstMember },
    settings: {},
  });

  return {
    id: ref.id,
    name: name.trim(),
    createdBy: userId,
    createdAt: new Date(),
    memberIds: [userId],
    members: { [userId]: { userId, email, role: "admin", joinedAt: new Date() } },
    settings: {},
  };
}

export function subscribeToUserInventories(
  userId: string,
  callback: (books: InventoryBook[]) => void
): () => void {
  const q = query(
    collection(db, INVENTORIES),
    where("memberIds", "array-contains", userId)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => inventoryFromFirestore(d.id, d.data() as Record<string, unknown>)));
  });
}

export async function getInventory(id: string): Promise<InventoryBook | null> {
  const snap = await getDoc(doc(db, INVENTORIES, id));
  if (!snap.exists()) return null;
  return inventoryFromFirestore(snap.id, snap.data() as Record<string, unknown>);
}

export async function updateInventoryName(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, INVENTORIES, id), { name: name.trim() });
}

export async function removeMember(inventoryId: string, userId: string): Promise<void> {
  const ref = doc(db, INVENTORIES, inventoryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const members = { ...(data.members ?? {}) };
  delete members[userId];
  const memberIds = (data.memberIds as string[]).filter((id) => id !== userId);
  await updateDoc(ref, { members, memberIds });
}

export async function updateMemberRole(
  inventoryId: string,
  userId: string,
  role: MemberRole
): Promise<void> {
  await updateDoc(doc(db, INVENTORIES, inventoryId), {
    [`members.${userId}.role`]: role,
  });
}

// ── Invites ────────────────────────────────────────────────────────────────

function randomCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function createInviteCode(
  inventoryId: string,
  role: MemberRole = "contributor"
): Promise<string> {
  const code = randomCode();
  await setDoc(doc(db, INVITE_CODES, code), {
    inventoryId,
    role,
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function acceptInvite(
  code: string,
  userId: string,
  email: string
): Promise<InventoryBook | null> {
  const codeSnap = await getDoc(doc(db, INVITE_CODES, code));
  if (!codeSnap.exists()) return null;

  const { inventoryId, role } = codeSnap.data() as { inventoryId: string; role: MemberRole };

  // Use arrayUnion so we never need to read the inventory before updating.
  // Non-members can't read inventories (Firestore rule), but the update rule
  // allows self-joining when a valid invite code is supplied.
  const invRef = doc(db, INVENTORIES, inventoryId);
  await updateDoc(invRef, {
    [`members.${userId}`]: { userId, email, role, joinedAt: serverTimestamp(), inviteCode: code },
    memberIds: arrayUnion(userId),
  });

  // User is now a member — this read will succeed.
  return getInventory(inventoryId);
}
