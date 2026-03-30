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
import type { InventoryItem, UserStats, ConfirmationMode, UserAgentPreferences, PatternRecognitionResult, PatternInsight, CartographicResult, CartographicInsight, OnboardingState, TransitionDoulaData, TransitionInsight, DecideLaterItem } from "./types";

const ITEMS_COLLECTION = "inventory_items";
const USERS_COLLECTION = "user_stats";
const USER_PREFS_COLLECTION = "user_preferences";

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
    audioUrl: (data.audioUrl as string | undefined) ?? undefined,
    voiceTranscript: (data.voiceTranscript as string) ?? "",
    tags: (data.tags as string[]) ?? [],
    passTo: (data.passTo as string) ?? "",
    isLoanable: (data.isLoanable as boolean) ?? false,
    condition: (data.condition as string) ?? "",
    addedBy: (data.addedBy as string) ?? "",
    addedByEmail: (data.addedByEmail as string) ?? "",
    addedByName: (data.addedByName as string) ?? "",
    addedAt: timestampToDate(data.addedAt as Timestamp),
    updatedAt: timestampToDate(data.updatedAt as Timestamp),
    updatedBy: (data.updatedBy as string) ?? undefined,
    updatedByEmail: (data.updatedByEmail as string) ?? undefined,
    confirmationMode: (data.confirmationMode as ConfirmationMode) ?? "ask",
    autoConfirmAfterEntry: data.autoConfirmAfterEntry as number | undefined,
    collectionId: (data.collectionId as string | null) ?? null,
    isCollection: (data.isCollection as boolean) ?? false,
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

export async function getAgentPreferences(uid: string): Promise<UserAgentPreferences> {
  const snap = await getDoc(doc(db, USER_PREFS_COLLECTION, uid));
  if (!snap.exists()) return {};
  return (snap.data().agents ?? {}) as UserAgentPreferences;
}

export async function saveAgentPreferences(uid: string, agents: UserAgentPreferences): Promise<void> {
  await setDoc(doc(db, USER_PREFS_COLLECTION, uid), { agents }, { merge: true });
}

export async function getPatternInsights(uid: string): Promise<PatternRecognitionResult | null> {
  const snap = await getDoc(doc(db, USER_PREFS_COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data().patternRecognition;
  if (!data) return null;
  return {
    insights: (data.insights ?? []).map((i: Record<string, unknown>) => ({
      ...i,
      generatedAt: i.generatedAt instanceof Timestamp ? i.generatedAt.toDate() : new Date(i.generatedAt as string),
    })) as PatternInsight[],
    lastRunAt: data.lastRunAt instanceof Timestamp ? data.lastRunAt.toDate() : new Date(data.lastRunAt),
    inventoryId: data.inventoryId ?? "",
  };
}

export async function savePatternInsights(uid: string, result: PatternRecognitionResult): Promise<void> {
  await setDoc(
    doc(db, USER_PREFS_COLLECTION, uid),
    { patternRecognition: { ...result, lastRunAt: serverTimestamp() } },
    { merge: true }
  );
}

export async function getOnboardingState(uid: string): Promise<OnboardingState> {
  const snap = await getDoc(doc(db, USER_PREFS_COLLECTION, uid));
  const data = snap.exists() ? (snap.data().onboarding ?? {}) : {};
  return {
    hasSeenWelcome: data.hasSeenWelcome ?? false,
    hasCompletedTour: data.hasCompletedTour ?? false,
    hasAddedFirstItem: data.hasAddedFirstItem ?? false,
  };
}

export async function updateOnboardingState(uid: string, updates: Partial<OnboardingState>): Promise<void> {
  await setDoc(doc(db, USER_PREFS_COLLECTION, uid), { onboarding: updates }, { merge: true });
}

export async function getCartographerInsights(uid: string): Promise<CartographicResult | null> {
  const snap = await getDoc(doc(db, USER_PREFS_COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data().cartographer;
  if (!data) return null;
  return {
    insights: (data.insights ?? []).map((i: Record<string, unknown>) => ({
      ...i,
      generatedAt: i.generatedAt instanceof Timestamp ? i.generatedAt.toDate() : new Date(i.generatedAt as string),
    })) as CartographicInsight[],
    lastRunAt: data.lastRunAt instanceof Timestamp ? data.lastRunAt.toDate() : new Date(data.lastRunAt),
    inventoryId: data.inventoryId ?? "",
  };
}

export async function saveCartographerInsights(uid: string, result: CartographicResult): Promise<void> {
  await setDoc(
    doc(db, USER_PREFS_COLLECTION, uid),
    { cartographer: { ...result, lastRunAt: serverTimestamp() } },
    { merge: true }
  );
}

export async function dismissCartographerInsight(uid: string, insightId: string): Promise<void> {
  const existing = await getCartographerInsights(uid);
  if (!existing) return;
  const updated = existing.insights.map((i) =>
    i.id === insightId ? { ...i, dismissed: true } : i
  );
  await saveCartographerInsights(uid, { ...existing, insights: updated });
}

export async function dismissPatternInsight(uid: string, insightId: string): Promise<void> {
  const existing = await getPatternInsights(uid);
  if (!existing) return;
  const updated = existing.insights.map((i) =>
    i.id === insightId ? { ...i, dismissed: true } : i
  );
  await savePatternInsights(uid, { ...existing, insights: updated });
}

// ── Transition Doula ────────────────────────────────────────────────────────

export async function getTransitionDoulaData(uid: string): Promise<TransitionDoulaData> {
  const snap = await getDoc(doc(db, USER_PREFS_COLLECTION, uid));
  const empty: TransitionDoulaData = { currentGuidance: null, decideLaterItems: [], lastCheckInAt: null };
  if (!snap.exists()) return empty;
  const data = snap.data().transitionDoula;
  if (!data) return empty;
  return {
    currentGuidance: data.currentGuidance
      ? {
          ...data.currentGuidance,
          generatedAt:
            data.currentGuidance.generatedAt instanceof Timestamp
              ? data.currentGuidance.generatedAt.toDate()
              : new Date(data.currentGuidance.generatedAt),
        }
      : null,
    decideLaterItems: (data.decideLaterItems ?? []).map((i: Record<string, unknown>) => ({
      ...i,
      addedAt:
        i.addedAt instanceof Timestamp
          ? (i.addedAt as Timestamp).toDate()
          : new Date(i.addedAt as string),
    })) as DecideLaterItem[],
    lastCheckInAt:
      data.lastCheckInAt instanceof Timestamp ? data.lastCheckInAt.toDate() : null,
  };
}

export async function saveTransitionGuidance(uid: string, insight: TransitionInsight): Promise<void> {
  await setDoc(
    doc(db, USER_PREFS_COLLECTION, uid),
    {
      transitionDoula: {
        currentGuidance: { ...insight, generatedAt: serverTimestamp() },
        lastCheckInAt: serverTimestamp(),
      },
    },
    { merge: true }
  );
}

export async function addDecideLaterItem(uid: string, name: string): Promise<DecideLaterItem[]> {
  const data = await getTransitionDoulaData(uid);
  const newItem: DecideLaterItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    addedAt: new Date(),
  };
  const updated = [...data.decideLaterItems, newItem];
  await setDoc(
    doc(db, USER_PREFS_COLLECTION, uid),
    { transitionDoula: { decideLaterItems: updated } },
    { merge: true }
  );
  return updated;
}

export async function removeDecideLaterItem(uid: string, itemId: string): Promise<DecideLaterItem[]> {
  const data = await getTransitionDoulaData(uid);
  const updated = data.decideLaterItems.filter((i) => i.id !== itemId);
  await setDoc(
    doc(db, USER_PREFS_COLLECTION, uid),
    { transitionDoula: { decideLaterItems: updated } },
    { merge: true }
  );
  return updated;
}
