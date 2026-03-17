"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { Header } from "@/components/layout/Header";
import { useInventory } from "@/hooks/useInventory";
import { getCartographerInsights } from "@/lib/firestore";
import type { CartographicResult } from "@/lib/types";

// MapView uses Leaflet which requires browser APIs — never SSR
const MapView = dynamic(
  () => import("@/components/inventory/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="w-full bg-stone-100 rounded-2xl animate-pulse" style={{ height: "60vh" }} /> }
);

export default function MapPage() {
  const { user, loading } = useAuthContext();
  const { currentInventory } = useInventoryContext();
  const { items, loading: itemsLoading } = useInventory(currentInventory?.id ?? null);
  const [cartResult, setCartResult] = useState<CartographicResult | null>(null);

  useEffect(() => {
    if (!user) return;
    getCartographerInsights(user.uid).then((r) => setCartResult(r));
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginForm />;

  const geoItems = items.filter((i) => i.originPlace?.lat && i.originPlace?.lng);
  const nameOnlyItems = items.filter((i) => i.originPlace?.name && !i.originPlace?.lat);
  const activeInsights = (cartResult?.insights ?? []).filter((i) => !i.dismissed);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-stone-800">Object Journeys</h1>
            <p className="text-stone-500 text-sm mt-0.5">
              Where your objects came from
            </p>
          </div>
          <span className="text-sm text-stone-400">
            {geoItems.length} of {items.length} {items.length === 1 ? "item" : "items"} mapped
          </span>
        </div>

        {itemsLoading ? (
          <div className="w-full bg-stone-100 rounded-2xl animate-pulse" style={{ height: "60vh" }} />
        ) : (
          <MapView items={items} insights={cartResult?.insights ?? []} />
        )}

        {/* Active Cartographer insights */}
        {activeInsights.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
                Geographic patterns
              </h2>
              <Link
                href="/settings"
                className="text-xs text-blue-600 hover:underline"
              >
                Manage in Settings →
              </Link>
            </div>
            <div className="space-y-2">
              {activeInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 rounded-xl"
                  style={{ background: "#f0f9ff", border: "1px solid #bfdbfe" }}
                >
                  <p className="text-xs font-medium text-blue-900 capitalize mb-1">{insight.type}</p>
                  <p className="text-sm text-blue-800 font-serif leading-relaxed">{insight.insight}</p>
                  {insight.places.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {insight.places.map((p, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                          {p.lat ? "📍" : "◌"} {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {insight.suggestedAction && (
                    <p className="text-[11px] italic text-blue-600 mt-1.5">→ {insight.suggestedAction}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mapped items list */}
        {geoItems.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Mapped origins
            </h2>
            <div className="space-y-2">
              {geoItems.map((item) => (
                <Link key={item.id} href={`/items/${item.id}`}
                  className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-colors">
                  <span className="text-xl">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">{item.name}</p>
                    <p className="text-sm text-stone-400 truncate">{item.originPlace.name}</p>
                  </div>
                  <span className="text-xs text-amber-600 flex-shrink-0">View →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Items with a place name but no coordinates */}
        {nameOnlyItems.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Places mentioned — not yet on map
            </h2>
            <p className="text-xs text-stone-400 mb-3">
              Edit these items and update the origin place to a specific city or region to add them to the map.
            </p>
            <div className="space-y-2">
              {nameOnlyItems.map((item) => (
                <Link key={item.id} href={`/items/${item.id}`}
                  className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-colors">
                  <span className="text-xl opacity-40">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-700 truncate">{item.name}</p>
                    <p className="text-sm text-stone-400 truncate">{item.originPlace.name}</p>
                  </div>
                  <span className="text-xs text-stone-400 flex-shrink-0">Edit →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
