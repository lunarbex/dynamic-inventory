import type { InventoryItem, ActivityZoneId } from "./types";

// ── Room name extraction ─────────────────────────────────────────────────────

// Sorted longest-first to prevent "bed" matching before "bedroom"
const KNOWN_ROOMS = [
  "living room", "dining room", "laundry room", "mud room", "guest room",
  "utility room", "storage room", "play room", "sun room",
  "kitchen", "bedroom", "bathroom", "garage", "attic", "basement",
  "studio", "office", "library", "workshop", "garden", "patio",
  "hallway", "closet", "pantry", "cellar", "shed", "playroom", "laundry",
];

export const CHAPTER_ICONS: Record<string, string> = {
  "Kitchen": "🍳",
  "Bedroom": "🛏",
  "Bathroom": "🛁",
  "Garage": "🚗",
  "Office": "💼",
  "Living Room": "🛋",
  "Dining Room": "🍽",
  "Studio": "🎨",
  "Library": "📚",
  "Garden": "🌿",
  "Attic": "📦",
  "Basement": "🏠",
  "Closet": "👔",
  "Pantry": "🧺",
  "Shed": "🔧",
  "Workshop": "🔨",
  "Hallway": "🚪",
  "Patio": "🌞",
  "Laundry": "🧺",
  "Playroom": "🎮",
  "Other": "📦",
};

export function extractChapterName(microLocation: string): string {
  if (!microLocation?.trim()) return "Other";
  const lower = microLocation.toLowerCase().trim();
  for (const room of KNOWN_ROOMS) {
    if (
      lower === room ||
      lower.startsWith(room + " ") ||
      lower.startsWith(room + ",") ||
      lower.startsWith(room + "-") ||
      lower.includes(" " + room) ||
      lower.includes("-" + room)
    ) {
      return room.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  // Fallback: capitalize first word
  const first = microLocation.trim().split(/[\s,\-_]/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function getChapterIcon(name: string): string {
  return CHAPTER_ICONS[name] ?? "📦";
}

// ── Derived chapter structure ────────────────────────────────────────────────

export interface DerivedChapter {
  name: string;
  icon: string;
  chapterNumber: number; // 1-based, chronological order
  items: InventoryItem[];
  firstAddedAt: Date;
  isCustom?: false;
}

export interface CustomChapterView {
  id: string;
  name: string;
  icon: string;
  chapterNumber: number;
  items: InventoryItem[];
  isCustom: true;
}

export type AnyChapter = DerivedChapter | CustomChapterView;

export function deriveChapters(items: InventoryItem[]): DerivedChapter[] {
  const chapterMap = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const name = extractChapterName(item.microLocation);
    if (!chapterMap.has(name)) chapterMap.set(name, []);
    chapterMap.get(name)!.push(item);
  }

  const chapters = Array.from(chapterMap.entries()).map(([name, chapterItems]) => {
    const earliest = chapterItems.reduce<Date>(
      (acc, i) => (i.addedAt < acc ? i.addedAt : acc),
      chapterItems[0].addedAt
    );
    return {
      name,
      icon: getChapterIcon(name),
      chapterNumber: 0,
      items: chapterItems,
      firstAddedAt: earliest,
      isCustom: false as const,
    };
  });

  chapters.sort((a, b) => a.firstAddedAt.getTime() - b.firstAddedAt.getTime());
  chapters.forEach((ch, i) => { ch.chapterNumber = i + 1; });
  return chapters;
}

// ── Related locations ────────────────────────────────────────────────────────
// For a given chapter, find items in OTHER chapters that share tags or categories.

export interface RelatedLocation {
  chapterName: string;
  icon: string;
  count: number;
  sharedTheme: string; // brief description of the connection
}

export function getRelatedLocations(
  activeChapterName: string,
  allChapters: DerivedChapter[]
): RelatedLocation[] {
  const activeChap = allChapters.find((c) => c.name === activeChapterName);
  if (!activeChap || activeChap.items.length === 0) return [];

  const activeTags = new Set(activeChap.items.flatMap((i) => i.tags ?? []));
  const activeCategories = new Set(activeChap.items.flatMap((i) => i.categories));

  const related = allChapters
    .filter((ch) => ch.name !== activeChapterName)
    .map((ch) => {
      // Find items in this other chapter that share tags or categories
      const matchingItems = ch.items.filter(
        (i) =>
          (i.tags ?? []).some((t) => activeTags.has(t)) ||
          i.categories.some((c) => activeCategories.has(c))
      );
      if (matchingItems.length === 0) return null;

      // Find the most shared tag/category for the theme label
      const tagCounts = new Map<string, number>();
      matchingItems.forEach((i) => {
        [...(i.tags ?? []), ...i.categories].forEach((t) => {
          if (activeTags.has(t) || activeCategories.has(t as ActivityZoneId)) {
            tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
          }
        });
      });
      const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

      return {
        chapterName: ch.name,
        icon: ch.icon,
        count: matchingItems.length,
        sharedTheme: topTag,
      };
    })
    .filter((r): r is RelatedLocation => r !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return related;
}
