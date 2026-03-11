import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { InventoryItem, UserStats, ConfirmationMode } from "./types";

const ITEMS_COLLECTION = "inventory_items";
const USERS_COLLECTION = "user_stats";

function timestampToDate(ts: Timestamp | Date | undefined): Date {
  if (!ts) return new Date();
  if (ts instanceof Timestamp) return ts.toDate();
  return ts;
}

export function itemFromFirestore(id: string, data: Record<string, unknown>): InventoryItem {
  return {
    id,
    inventoryId: (data.inventoryId as string) ?? "",
    name: (data.name as string) ?? "",
    description: (data.description as string) ?? "",
    story: (data.story as string) ?? "",
    provenance: (data.provenance as string) ?? "",
    categories: (data.categories as InventoryItem["categories"]) ?? [],
    microLocation: (data.microLocation as string) ?? (data.location as string) ?? "",
    macroLocation: (data.macroLocation as string) ?? "",
    originPlace: (data.originPlace as InventoryItem["originPlace"]) ?? { name: "" },
    location: (data.location as string) ?? "",
    photos: (data.photos as string[]) ?? [],
    voiceTranscript: (data.voiceTranscript as string) ?? "",
    tags: (data.tags as string[]) ?? [],
    passTo: (data.passTo as string) ?? "",
    isLoanable: (data.isLoanable as boolean) ?? false,
    condition: (data.condition as string) ?? "",
    addedBy: (data.addedBy as string) ?? "",
    addedByEmail: (data.addedByEmail as string) ?? "",
    addedAt: timestampToDate(data.addedAt as Timestamp),
    updatedAt: timestampToDate(data.updatedAt as Timestamp),
    updatedBy: (data.updatedBy as string) ?? undefined,
    updatedByEmail: (data.updatedByEmail as string) ?? undefined,
    confirmationMode: (data.confirmationMode as ConfirmationMode) ?? "ask",
    autoConfirmAfterEntry: data.autoConfirmAfterEntry as number | undefined,
  };
}

export async function addItem(
  item: Omit<InventoryItem, "id" | "addedAt" | "updatedAt"> & { inventoryId: string }
): Promise<string> {
  console.log("[Firestore] addItem — writing to collection:", ITEMS_COLLECTION);
  console.log("[Firestore] addItem — payload:", {
    name: item.name,
    categories: item.categories,
    location: item.location,
    addedBy: item.addedBy,
    photoCount: item.photos.length,
    transcriptLength: item.voiceTranscript.length,
  });

  try {
    const ref = await addDoc(collection(db, ITEMS_COLLECTION), {
      ...item,
      addedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("[Firestore] addItem — success, new doc id:", ref.id);
    return ref.id;
  } catch (err) {
    console.error("[Firestore] addItem — FAILED:", err);
    throw err;
  }
}

export async function updateItem(
  id: string,
  updates: Partial<Omit<InventoryItem, "id" | "addedAt">>,
  editor?: { uid: string; email: string }
): Promise<void> {
  console.log("[Firestore] updateItem —", id, Object.keys(updates));
  await updateDoc(doc(db, ITEMS_COLLECTION, id), {
    ...updates,
    updatedAt: serverTimestamp(),
    ...(editor ? { updatedBy: editor.uid, updatedByEmail: editor.email } : {}),
  });
}

export async function deleteItem(id: string): Promise<void> {
  console.log("[Firestore] deleteItem —", id);
  await deleteDoc(doc(db, ITEMS_COLLECTION, id));
}

export async function getItem(id: string): Promise<InventoryItem | null> {
  const snap = await getDoc(doc(db, ITEMS_COLLECTION, id));
  if (!snap.exists()) return null;
  return itemFromFirestore(snap.id, snap.data());
}

export async function getAllItems(): Promise<InventoryItem[]> {
  const snap = await getDocs(
    query(collection(db, ITEMS_COLLECTION), orderBy("addedAt", "desc"))
  );
  return snap.docs.map((d) => itemFromFirestore(d.id, d.data()));
}

export function subscribeToItems(
  inventoryId: string,
  callback: (items: InventoryItem[]) => void
): () => void {
  console.log("[Firestore] subscribeToItems — inventoryId:", inventoryId);
  const q = query(
    collection(db, ITEMS_COLLECTION),
    where("inventoryId", "==", inventoryId),
    orderBy("addedAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      console.log("[Firestore] subscribeToItems — received", snap.docs.length, "docs");
      callback(snap.docs.map((d) => itemFromFirestore(d.id, d.data())));
    },
    (err) => {
      console.error("[Firestore] subscribeToItems — listener error:", err.code, err.message);
    }
  );
}

export async function getItemsByCategory(category: string): Promise<InventoryItem[]> {
  const snap = await getDocs(
    query(
      collection(db, ITEMS_COLLECTION),
      where("categories", "array-contains", category),
      orderBy("addedAt", "desc")
    )
  );
  return snap.docs.map((d) => itemFromFirestore(d.id, d.data()));
}

export async function getUserStats(uid: string): Promise<UserStats> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) {
    return { uid, totalEntries: 0, confirmationMode: "ask" };
  }
  return snap.data() as UserStats;
}

export async function updateUserStats(uid: string, updates: Partial<UserStats>): Promise<void> {
  await setDoc(doc(db, USERS_COLLECTION, uid), { uid, ...updates }, { merge: true });
}

export async function incrementEntryCount(uid: string): Promise<number> {
  const stats = await getUserStats(uid);
  const newCount = stats.totalEntries + 1;
  await updateUserStats(uid, { totalEntries: newCount });
  return newCount;
}
