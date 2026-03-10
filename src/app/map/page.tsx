"use client";

import dynamic from "next/dynamic";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Header } from "@/components/layout/Header";
import { useInventory } from "@/hooks/useInventory";
import Link from "next/link";

// MapView uses Leaflet which requires browser APIs — never SSR
const MapView = dynamic(
  () => import("@/components/inventory/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="w-full bg-stone-100 rounded-2xl animate-pulse" style={{ height: "60vh" }} /> }
);

export default function MapPage() {
  const { user, loading } = useAuthContext();
  const { items, loading: itemsLoading } = useInventory();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginForm />;

  const geoItems = items.filter((i) => i.originPlace?.lat && i.originPlace?.lng);

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
            {geoItems.length} of {items.length} items mapped
          </span>
        </div>

        {itemsLoading ? (
          <div className="w-full bg-stone-100 rounded-2xl animate-pulse" style={{ height: "60vh" }} />
        ) : (
          <MapView items={items} />
        )}

        {/* List of mapped items */}
        {geoItems.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Items with origin places
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
      </main>
    </div>
  );
}
