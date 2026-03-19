"use client";

import { useState } from "react";
import Link from "next/link";
import type { PatternInsight, PatternType } from "@/lib/types";
import { X, ChevronRight } from "lucide-react";

const TYPE_META: Record<PatternType, { label: string; icon: string; color: string }> = {
  collection:             { label: "Collection",          icon: "📚", color: "#6b4010" },
  relationship:           { label: "Relationship",        icon: "🕸️", color: "#1e5040" },
  gap:                    { label: "Gap",                 icon: "◌",  color: "#661830" },
  temporal:               { label: "Time pattern",        icon: "🕰️", color: "#342070" },
  spatial:                { label: "Space pattern",       icon: "📍", color: "#30561e" },
  scattered_collection:   { label: "Scattered collection",icon: "🗂️", color: "#5a3080" },
  distributed_category:   { label: "Distributed category",icon: "🔀", color: "#1a4060" },
  recipient_organization: { label: "Inheritance planning",icon: "🎁", color: "#804010" },
};

const CONFIDENCE_STYLE: Record<string, { bg: string; color: string }> = {
  high:   { bg: "#deebd6", color: "#30561e" },
  medium: { bg: "#f0e8d0", color: "#6b4010" },
  low:    { bg: "#e8e4dc", color: "#a89070" },
};

interface PatternInsightsPanelProps {
  insights: PatternInsight[];
  lastRunAt: Date | null;
  running: boolean;
  onRunSingle: () => void;
  onRunAll: () => void;
  onDismiss: (id: string) => void;
}

export function PatternInsightsPanel({
  insights,
  lastRunAt,
  running,
  onRunSingle,
  onRunAll,
  onDismiss,
}: PatternInsightsPanelProps) {
  const [showDismissed, setShowDismissed] = useState(false);

  const visible = insights.filter((i) => showDismissed || !i.dismissed);
  const dismissedCount = insights.filter((i) => i.dismissed).length;
  const activeCount = insights.filter((i) => !i.dismissed).length;

  return (
    <div
      className="mt-4 p-4 space-y-4"
      style={{ border: "1px solid var(--border)", borderRadius: "8px", background: "var(--parchment)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: "var(--gold)" }}>
            Pattern Insights
          </p>
          {lastRunAt && (
            <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-light)" }}>
              Last run {lastRunAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {" · "}{activeCount} active {activeCount === 1 ? "insight" : "insights"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRunSingle}
            disabled={running}
            className="text-xs px-3 py-1.5 font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--ink-mid)", borderRadius: "4px" }}
          >
            {running ? "Scanning…" : "Run"}
          </button>
          <button
            onClick={onRunAll}
            disabled={running}
            className="text-xs px-3 py-1.5 font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "var(--gold)", color: "var(--parchment-light)", borderRadius: "4px" }}
          >
            {running ? "Scanning…" : "Show all patterns"}
          </button>
        </div>
      </div>

      <div className="h-px" style={{ background: "var(--border)" }} />

      {/* Empty state */}
      {visible.length === 0 && !running && (
        <p className="text-xs italic text-center py-4" style={{ color: "var(--ink-light)" }}>
          {insights.length === 0
            ? "No patterns found yet — run an analysis to get started."
            : "All insights have been dismissed."}
        </p>
      )}

      {running && (
        <div className="flex items-center gap-2 justify-center py-4">
          <div
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }}
          />
          <p className="text-xs" style={{ color: "var(--ink-light)" }}>Reading your inventory…</p>
        </div>
      )}

      {/* Insight cards */}
      <div className="space-y-3">
        {visible.map((insight) => {
          const meta = TYPE_META[insight.type];
          const conf = CONFIDENCE_STYLE[insight.confidence];
          return (
            <div
              key={insight.id}
              className="relative p-3 flex flex-col gap-2"
              style={{
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--parchment-light)",
                opacity: insight.dismissed ? 0.5 : 1,
              }}
            >
              {/* Type + confidence badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[9px] px-1.5 py-0.5 font-semibold tracking-wide"
                  style={{ color: meta.color, background: "#f3f0eb", border: "1px solid var(--border)", borderRadius: "3px" }}
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
              <p className="text-xs leading-relaxed font-serif" style={{ color: "var(--ink)" }}>
                {insight.insight}
              </p>

              {/* Suggested action */}
              {insight.suggestedAction && (
                <p className="text-[11px] italic" style={{ color: "var(--gold)" }}>
                  → {insight.suggestedAction}
                </p>
              )}

              {/* Affected items links */}
              {insight.affectedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {insight.affectedItems.slice(0, 4).map((id) => (
                    <Link
                      key={id}
                      href={`/items/${id}`}
                      className="text-[10px] px-2 py-0.5 transition-opacity hover:opacity-70 flex items-center gap-1"
                      style={{
                        background: "var(--parchment-dark)",
                        color: "var(--ink-mid)",
                        border: "1px solid var(--border)",
                        borderRadius: "3px",
                      }}
                    >
                      View item <ChevronRight className="w-2.5 h-2.5" />
                    </Link>
                  ))}
                  {insight.affectedItems.length > 4 && (
                    <span className="text-[10px] px-2 py-0.5" style={{ color: "var(--ink-light)" }}>
                      +{insight.affectedItems.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Dismiss button */}
              {!insight.dismissed && (
                <button
                  onClick={() => onDismiss(insight.id)}
                  className="absolute top-2.5 right-2.5 transition-opacity hover:opacity-70"
                  style={{ color: "var(--ink-light)" }}
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Show/hide dismissed */}
      {dismissedCount > 0 && (
        <button
          onClick={() => setShowDismissed((s) => !s)}
          className="text-[10px] transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-light)" }}
        >
          {showDismissed ? `Hide ${dismissedCount} dismissed` : `Show ${dismissedCount} dismissed`}
        </button>
      )}
    </div>
  );
}
