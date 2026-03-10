"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Header } from "@/components/layout/Header";
import { ItemCard } from "@/components/inventory/ItemCard";
import { useInventory } from "@/hooks/useInventory";
import { ACTIVITY_ZONES, ActivityZoneId } from "@/lib/types";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function HomePage() {
  const { user, loading: authLoading } = useAuthContext();
  const { items, loading: itemsLoading } = useInventory();
  const [activeZone, setActiveZone] = useState<ActivityZoneId | "all">("all");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginForm />;

  const displayItems =
    activeZone === "all" ? items : items.filter((i) => i.categories.includes(activeZone));

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Zone filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          <button
            onClick={() => setActiveZone("all")}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeZone === "all"
                ? "bg-amber-500 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            All items
          </button>
          {ACTIVITY_ZONES.map((zone) => {
            const count = items.filter((i) => i.categories.includes(zone.id)).length;
            if (count === 0) return null;
            return (
              <button
                key={zone.id}
                onClick={() => setActiveZone(zone.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeZone === zone.id
                    ? "bg-amber-500 text-white"
                    : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
                }`}
              >
                <span>{zone.icon}</span>
                <span>{zone.label}</span>
                <span
                  className={`text-xs ${
                    activeZone === zone.id ? "text-amber-100" : "text-stone-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between my-4">
          <p className="text-sm text-stone-500">
            {itemsLoading
              ? "Loading..."
              : `${displayItems.length} ${displayItems.length === 1 ? "item" : "items"}`}
          </p>
          <Link
            href="/add"
            className="flex items-center gap-1.5 text-sm text-amber-600 font-medium hover:text-amber-700"
          >
            <Plus className="w-4 h-4" />
            Add object
          </Link>
        </div>

        {/* Items grid */}
        {itemsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-stone-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-stone-100 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📦</p>
            <h3 className="text-stone-700 font-semibold text-lg">
              {activeZone === "all" ? "Your inventory is empty" : "Nothing here yet"}
            </h3>
            <p className="text-stone-400 text-sm mt-1 mb-6">
              {activeZone === "all"
                ? "Pick up an object and capture its story"
                : "Add items to this activity zone"}
            </p>
            <Link
              href="/add"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add your first object
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
