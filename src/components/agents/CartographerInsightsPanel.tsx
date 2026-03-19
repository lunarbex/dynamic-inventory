"use client";

import { useState } from "react";
import Link from "next/link";
import type { CartographicInsight, CartographyType } from "@/lib/types";
import { X, ChevronRight, Map } from "lucide-react";

const TYPE_META: Record<CartographyType, { label: string; icon: string; color: string; bg: string }> = {
  cluster:    { label: "Cluster",    icon: "◎", color: "#1d4ed8", bg: "#dbeafe" },
  journey:    { label: "Journey",    icon: "→", color: "#0f766e", bg: "#ccfbf1" },
  diaspora:   { label: "Diaspora",   icon: "↝", color: "#7c3aed", bg: "#ede9fe" },
  gap:        { label: "Gap",        icon: "◌", color: "#b45309", bg: "#fef3c7" },
  complement: { label: "Complement", icon: "⇌", color: "#0369a1", bg: "#e0f2fe" },
};

const CONFIDENCE_STYLE: Record<string, { bg: string; color: string }> = {
  high:   { bg: "#dcfce7", color: "#166534" },
  medium: { bg: "#fef9c3", color: "#854d0e" },
  low:    { bg: "#f1f5f9", color: "#64748b" },
};

interface CartographerInsightsPanelProps {
  insights: CartographicInsight[];
  lastRunAt: Date | null;
  running: boolean;
  onRunSingle: () => void;
  onRunAll: () => void;
  onDismiss: (id: string) => void;
}

export function CartographerInsightsPanel({
  insights,
  lastRunAt,
  running,
  onRunSingle,
  onRunAll,
  onDismiss,
}: CartographerInsightsPanelProps) {
  const [showDismissed, setShowDismissed] = useState(false);

  const visible = insights.filter((i) => showDismissed || !i.dismissed);
  const dismissedCount = insights.filter((i) => i.dismissed).length;
  const activeCount = insights.filter((i) => !i.dismissed).length;

  return (
    <div
      className="mt-4 p-4 space-y-4"
      style={{ border: "1px solid #bfdbfe", borderRadius: "8px", background: "#f0f9ff" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: "#1d4ed8" }}>
            Geographic Insights
          </p>
          {lastRunAt && (
            <p className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>
              Last mapped {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(lastRunAt)}
              {" · "}{activeCount} active {activeCount === 1 ? "pattern" : "patterns"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRunSingle}
            disabled={running}
            className="text-xs px-3 py-1.5 font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: "4px", background: "white" }}
          >
            {running ? "Mapping…" : "Run"}
          </button>
          <button
            onClick={onRunAll}
            disabled={running}
            className="text-xs px-3 py-1.5 font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "#1d4ed8", color: "white", borderRadius: "4px" }}
          >
            {running ? "Mapping…" : "Show all patterns"}
          </button>
        </div>
      </div>

      <div className="h-px" style={{ background: "#bfdbfe" }} />

      {/* Empty state */}
      {visible.length === 0 && !running && (
        <p className="text-xs italic text-center py-4" style={{ color: "#64748b" }}>
          {insights.length === 0
            ? "No geographic patterns found yet — run an analysis to map your objects' journeys."
            : "All insights have been dismissed."}
        </p>
      )}

      {running && (
        <div className="flex items-center gap-2 justify-center py-4">
          <div
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#1d4ed8", borderTopColor: "transparent" }}
          />
          <p className="text-xs" style={{ color: "#64748b" }}>Charting your inventory's geography…</p>
        </div>
      )}

      {/* Insight cards */}
      <div className="space-y-3">
        {visible.map((insight) => {
          const meta = TYPE_META[insight.type];
          const conf = CONFIDENCE_STYLE[insight.confidence];
          const mappedPlaces = insight.places.filter((p) => p.lat && p.lng);
          return (
            <div
              key={insight.id}
              className="relative p-3 flex flex-col gap-2"
              style={{
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                background: "white",
                opacity: insight.dismissed ? 0.5 : 1,
              }}
            >
              {/* Type + confidence badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[9px] px-1.5 py-0.5 font-semibold tracking-wide"
                  style={{ color: meta.color, background: meta.bg, borderRadius: "3px" }}
                >
                  {meta.icon} {meta.label}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 font-semibold"
                  style={{ ...conf, borderRadius: "3px" }}
                >
                  {insight.confidence} confidence
                </span>
              </div>

              {/* Insight text */}
              <p className="text-xs leading-relaxed font-serif" style={{ color: "#1e293b" }}>
                {insight.insight}
              </p>

              {/* Places list */}
              {insight.places.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {insight.places.map((place, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 flex items-center gap-1"
                      style={{
                        background: place.lat ? "#dbeafe" : "#f1f5f9",
                        color: place.lat ? "#1d4ed8" : "#64748b",
                        borderRadius: "3px",
                      }}
                    >
                      {place.lat ? "📍" : "◌"} {place.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested action */}
              {insight.suggestedAction && (
                <p className="text-[11px] italic" style={{ color: "#0369a1" }}>
                  → {insight.suggestedAction}
                </p>
              )}

              {/* Action row: view items + map link */}
              <div className="flex items-center justify-between gap-2 flex-wrap mt-0.5">
                <div className="flex flex-wrap gap-1.5">
                  {insight.affectedItems.slice(0, 3).map((id) => (
                    <Link
                      key={id}
                      href={`/items/${id}`}
                      className="text-[10px] px-2 py-0.5 transition-opacity hover:opacity-70 flex items-center gap-1"
                      style={{
                        background: "#f8fafc",
                        color: "#475569",
                        border: "1px solid #e2e8f0",
                        borderRadius: "3px",
                      }}
                    >
                      View item <ChevronRight className="w-2.5 h-2.5" />
                    </Link>
                  ))}
                  {insight.affectedItems.length > 3 && (
                    <span className="text-[10px] px-2 py-0.5" style={{ color: "#94a3b8" }}>
                      +{insight.affectedItems.length - 3} more
                    </span>
                  )}
                </div>
                {mappedPlaces.length > 0 && (
                  <Link
                    href="/map"
                    className="text-[10px] flex items-center gap-1 transition-opacity hover:opacity-70 px-2 py-0.5"
                    style={{ color: "#1d4ed8", background: "#dbeafe", borderRadius: "3px" }}
                  >
                    <Map className="w-3 h-3" /> View on map
                  </Link>
                )}
              </div>

              {/* Dismiss */}
              {!insight.dismissed && (
                <button
                  onClick={() => onDismiss(insight.id)}
                  className="absolute top-2.5 right-2.5 transition-opacity hover:opacity-70"
                  style={{ color: "#94a3b8" }}
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {dismissedCount > 0 && (
        <button
          onClick={() => setShowDismissed((s) => !s)}
          className="text-[10px] transition-opacity hover:opacity-70"
          style={{ color: "#94a3b8" }}
        >
          {showDismissed ? `Hide ${dismissedCount} dismissed` : `Show ${dismissedCount} dismissed`}
        </button>
      )}
    </div>
  );
}
