"use client";

import { useEffect, useRef } from "react";
import type { InventoryItem } from "@/lib/types";

// Leaflet is loaded dynamically to avoid SSR issues
interface MapViewProps {
  items: InventoryItem[];
}

export function MapView({ items }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  const geoItems = items.filter(
    (item) => item.originPlace?.lat && item.originPlace?.lng
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import so Leaflet never runs on server
    import("leaflet").then((L) => {
      // Fix default marker icons broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] = geoItems.length > 0
        ? [geoItems[0].originPlace.lat!, geoItems[0].originPlace.lng!]
        : [20, 0];

      const map = L.map(mapRef.current!).setView(center, geoItems.length > 0 ? 4 : 2);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      geoItems.forEach((item) => {
        const marker = L.marker([item.originPlace.lat!, item.originPlace.lng!]).addTo(map);
        marker.bindPopup(`
          <div style="min-width:160px">
            <strong style="font-size:14px">${item.name}</strong>
            <p style="color:#78716c;font-size:12px;margin:4px 0">${item.originPlace.name}</p>
            ${item.story ? `<p style="font-size:12px;margin:4px 0;color:#44403c">${item.story.slice(0, 120)}${item.story.length > 120 ? "…" : ""}</p>` : ""}
            <a href="/items/${item.id}" style="font-size:12px;color:#d97706;text-decoration:underline">View item →</a>
          </div>
        `);
      });

      // Fit bounds if multiple items
      if (geoItems.length > 1) {
        const bounds = L.latLngBounds(
          geoItems.map((i) => [i.originPlace.lat!, i.originPlace.lng!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div ref={mapRef} className="w-full rounded-2xl overflow-hidden" style={{ height: "60vh", minHeight: 320 }} />
      {geoItems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80 rounded-2xl">
          <div className="text-center">
            <p className="text-3xl mb-2">🗺️</p>
            <p className="text-stone-600 font-medium">No items with origin coordinates yet</p>
            <p className="text-stone-400 text-sm mt-1">Mention where objects came from when recording their stories</p>
          </div>
        </div>
      )}
    </div>
  );
}
