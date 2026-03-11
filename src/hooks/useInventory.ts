"use client";

import { useState, useEffect } from "react";
import { subscribeToItems } from "@/lib/firestore";
import type { InventoryItem, ActivityZoneId } from "@/lib/types";

export function useInventory(inventoryId: string | null) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inventoryId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToItems(inventoryId, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [inventoryId]);

  function filterByCategory(category: ActivityZoneId) {
    return items.filter((item) => item.categories.includes(category));
  }

  function search(q: string) {
    if (!q.trim()) return items;
    const lower = q.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.story.toLowerCase().includes(lower) ||
        item.description.toLowerCase().includes(lower) ||
        item.provenance.toLowerCase().includes(lower) ||
        (item.microLocation || item.macroLocation || item.location || "").toLowerCase().includes(lower) ||
        (item.originPlace?.name ?? "").toLowerCase().includes(lower) ||
        item.categories.some((c) => c.toLowerCase().includes(lower)) ||
        (item.tags ?? []).some((t) => t.toLowerCase().includes(lower))
    );
  }

  return { items, loading, filterByCategory, search };
}
