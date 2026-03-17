"use client";

import { useEffect, useRef } from "react";
import type { InventoryItem, CartographicInsight } from "@/lib/types";

// Cluster color palette — exploratory blues/greens/teals
const CLUSTER_PALETTE = [
  "#2563eb", // blue
  "#059669", // emerald
  "#0891b2", // cyan
  "#7c3aed", // violet
  "#db2777", // pink
  "#d97706", // amber
];
const DEFAULT_COLOR = "#8b6914"; // gold — items not in any cluster

interface MapViewProps {
  items: InventoryItem[];
  insights?: CartographicInsight[];
}

export function MapView({ items, insights = [] }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  const geoItems = items.filter(
    (item) => item.originPlace?.lat && item.originPlace?.lng
  );

  // Stable key: only changes when the set of mapped item IDs changes.
  const geoItemKey = geoItems.map((i) => i.id).join(",");

  // Build a color map from cluster/journey/diaspora/complement insights.
  // Each insight gets a color from the palette; items inherit their insight's color.
  const itemColorMap: Record<string, string> = {};
  const activeInsights = insights.filter((i) => !i.dismissed && i.type !== "gap");
  activeInsights.forEach((ins, idx) => {
    const color = CLUSTER_PALETTE[idx % CLUSTER_PALETTE.length];
    ins.affectedItems.forEach((id) => {
      itemColorMap[id] = color;
    });
  });

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    // Tear down any previous instance so we rebuild with the current item set.
    if (mapInstanceRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapInstanceRef.current as any).remove();
      mapInstanceRef.current = null;
    }

    if (geoItems.length === 0) return;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;

      const center: [number, number] = [geoItems[0].originPlace.lat!, geoItems[0].originPlace.lng!];
      const map = L.map(mapRef.current!).setView(center, 4);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // ── Item markers (circle markers — no CDN icon dependency) ────────────
      geoItems.forEach((item) => {
        const color = itemColorMap[item.id] ?? DEFAULT_COLOR;
        const marker = L.circleMarker(
          [item.originPlace.lat!, item.originPlace.lng!],
          {
            radius: 9,
            fillColor: color,
            color: "white",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.88,
          }
        ).addTo(map);

        marker.bindPopup(`
          <div style="min-width:160px;font-family:serif">
            <strong style="font-size:14px;color:#1c1410">${item.name}</strong>
            <p style="color:#78716c;font-size:12px;margin:4px 0 2px">${item.originPlace.name}</p>
            ${item.story ? `<p style="font-size:12px;margin:4px 0;color:#44403c;font-style:italic">${item.story.slice(0, 120)}${item.story.length > 120 ? "…" : ""}</p>` : ""}
            <a href="/items/${item.id}" style="font-size:12px;color:#d97706;text-decoration:underline;display:block;margin-top:6px">View item →</a>
          </div>
        `);
      });

      // ── Journey polylines ─────────────────────────────────────────────────
      activeInsights
        .filter((ins) => ins.type === "journey" || ins.type === "diaspora")
        .forEach((ins, idx) => {
          const color = CLUSTER_PALETTE[
            activeInsights.findIndex((i) => i.id === ins.id) % CLUSTER_PALETTE.length
          ] ?? CLUSTER_PALETTE[idx % CLUSTER_PALETTE.length];

          const coords = ins.places
            .filter((p) => p.lat != null && p.lng != null)
            .map((p) => [p.lat!, p.lng!] as [number, number]);

          if (coords.length >= 2) {
            L.polyline(coords, {
              color,
              weight: 2,
              opacity: 0.55,
              dashArray: "6 4",
            }).addTo(map);

            // Small circle at each place on the journey line
            coords.forEach((coord, i) => {
              L.circleMarker(coord, {
                radius: 4,
                fillColor: color,
                color: "white",
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.7,
              })
                .addTo(map)
                .bindPopup(`
                  <div style="font-family:serif;font-size:12px">
                    <strong>${ins.places[i]?.name ?? ""}</strong>
                    <p style="color:#64748b;margin:2px 0;font-size:11px;font-style:italic">${ins.type === "journey" ? "Journey stop" : "Diaspora place"}</p>
                  </div>
                `);
            });
          }
        });

      // ── Fit bounds ────────────────────────────────────────────────────────
      if (geoItems.length > 1) {
        const bounds = L.latLngBounds(
          geoItems.map((i) => [i.originPlace.lat!, i.originPlace.lng!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  // geoItemKey is a stable string — re-run when the mapped item set changes.
  // itemColorMap and activeInsights are derived from props; include their stable key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoItemKey, activeInsights.map((i) => i.id).join(",")]);

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

      {/* Legend — only when insights are coloring items */}
      {activeInsights.length > 0 && geoItems.length > 0 && (
        <div
          className="absolute bottom-3 left-3 p-2 space-y-1 max-w-[200px]"
          style={{ background: "rgba(255,255,255,0.92)", borderRadius: "8px", border: "1px solid #e2e8f0", backdropFilter: "blur(4px)" }}
        >
          {activeInsights.slice(0, 5).map((ins, idx) => (
            <div key={ins.id} className="flex items-center gap-1.5">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: CLUSTER_PALETTE[idx % CLUSTER_PALETTE.length],
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              <span className="text-[10px] truncate" style={{ color: "#334155" }}>
                {ins.type.charAt(0).toUpperCase() + ins.type.slice(1)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span
              style={{
                width: 10, height: 10, borderRadius: "50%",
                background: DEFAULT_COLOR, flexShrink: 0, display: "inline-block",
              }}
            />
            <span className="text-[10px]" style={{ color: "#94a3b8" }}>Other</span>
          </div>
        </div>
      )}

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
